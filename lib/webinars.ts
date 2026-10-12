/**
 * The one place that reads and writes webinars and their registrants.
 *
 *   webinars/{webinarId}                      owner-managed, public when published
 *   webinars/{webinarId}/registrants/{id}     anyone may create, only the owner reads
 *
 * Access is enforced by firestore.rules, not here. In particular a registrant
 * may only carry `name`, `email` and a server `created_at`, so this module
 * must never add fields to a registration — the rules would reject the write.
 */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { n8nWebhookUrl } from "@/lib/n8n-url";

export type WebinarStatus = "draft" | "published";

export type Webinar = {
  id: string;
  owner_id: string;
  status: WebinarStatus;
  /** Internal name, shown only in the dashboard. */
  name: string;
  /** Public headline on the registration page. */
  title: string;
  subtitle: string;
  bullets: string[];
  presenter_name: string;
  presenter_title: string;
  image_url: string;
  cta_label: string;
  /** ISO 8601 instant, or "" when no session is scheduled yet. */
  next_session_at: string;
  thank_you_message: string;
  /**
   * The owner's IANA timezone, captured from their browser on save. Used to
   * send each owner's morning registration summary at THEIR 7am.
   */
  owner_timezone: string;
  created_at: string;
  updated_at: string;
};

export type Registrant = {
  id: string;
  name: string;
  email: string;
  created_at: Date | null;
};

export const WEBINAR_LIMITS = {
  title: 120,
  subtitle: 240,
  bullet: 140,
  bullets: 6,
  name: 120,
  email: 254,
} as const;

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function emptyWebinar(ownerId: string): Omit<Webinar, "id"> {
  const now = new Date().toISOString();
  return {
    owner_id: ownerId,
    status: "draft",
    name: "Untitled webinar",
    title: "Your eye-catching webinar title",
    subtitle: "One sentence on the transformation an attendee walks away with.",
    bullets: [
      "The first thing they'll learn",
      "The mistake most people make, and how to avoid it",
      "The exact next step to take after the session",
    ],
    presenter_name: "",
    presenter_title: "",
    image_url: "",
    cta_label: "Register now",
    next_session_at: "",
    thank_you_message: "You're in. We'll see you at the session.",
    owner_timezone: browserTimezone(),
    created_at: now,
    updated_at: now,
  };
}

/** Coerces a stored document into a complete Webinar, tolerating old shapes. */
function toWebinar(id: string, data: Record<string, unknown>): Webinar {
  const base = emptyWebinar(String(data.owner_id ?? ""));
  const str = (key: keyof Webinar) =>
    typeof data[key] === "string" ? (data[key] as string) : (base[key as keyof typeof base] as string);
  return {
    ...base,
    id,
    owner_id: String(data.owner_id ?? ""),
    status: data.status === "published" ? "published" : "draft",
    name: str("name"),
    title: str("title"),
    subtitle: str("subtitle"),
    bullets: Array.isArray(data.bullets)
      ? (data.bullets as unknown[]).filter((b): b is string => typeof b === "string")
      : base.bullets,
    presenter_name: str("presenter_name"),
    presenter_title: str("presenter_title"),
    image_url: str("image_url"),
    cta_label: str("cta_label"),
    next_session_at: str("next_session_at"),
    thank_you_message: str("thank_you_message"),
    owner_timezone: str("owner_timezone"),
    created_at: str("created_at"),
    updated_at: str("updated_at"),
  };
}

export async function listWebinars(ownerId: string): Promise<Webinar[]> {
  const snap = await getDocs(query(collection(db, "webinars"), where("owner_id", "==", ownerId)));
  return snap.docs
    .map((d) => toWebinar(d.id, d.data()))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

/** Null when the webinar does not exist OR the caller may not see it. */
export async function getWebinar(webinarId: string): Promise<Webinar | null> {
  try {
    const snap = await getDoc(doc(db, "webinars", webinarId));
    return snap.exists() ? toWebinar(snap.id, snap.data()) : null;
  } catch {
    // An unpublished webinar is denied by the rules for anyone but its owner.
    // To a visitor that is the same as "not found", and should read that way.
    return null;
  }
}

export async function createWebinar(ownerId: string): Promise<string> {
  const ref = await addDoc(collection(db, "webinars"), emptyWebinar(ownerId));
  return ref.id;
}

export async function saveWebinar(webinar: Webinar): Promise<void> {
  const { id, ...rest } = webinar;
  await setDoc(
    doc(db, "webinars", id),
    {
      ...rest,
      bullets: rest.bullets.map((b) => b.trim()).filter(Boolean).slice(0, WEBINAR_LIMITS.bullets),
      owner_timezone: browserTimezone(),
      updated_at: new Date().toISOString(),
    },
    { merge: true },
  );
}

/**
 * Deletes the webinar document. Registrant documents are a subcollection and
 * are NOT removed by this: Firestore has no client-side cascade. They become
 * unreachable from the app, which is acceptable at this scale.
 */
export async function deleteWebinar(webinarId: string): Promise<void> {
  await deleteDoc(doc(db, "webinars", webinarId));
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  // Mirrors the pattern in firestore.rules so the form fails before the write.
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) && value.length <= WEBINAR_LIMITS.email;
}

/**
 * Public: anyone may register for a published webinar. Once the registration
 * is saved, n8n is asked to send the confirmation email.
 */
export async function registerForWebinar(webinarId: string, name: string, email: string): Promise<void> {
  const ref = await addDoc(collection(db, "webinars", webinarId, "registrants"), {
    name: name.trim().slice(0, WEBINAR_LIMITS.name),
    email: normalizeEmail(email),
    created_at: serverTimestamp(),
  });
  requestConfirmationEmail(webinarId, ref.id);
}

/**
 * Fire-and-forget: the registration is already saved, so a slow or failing
 * email must never turn a successful sign-up into an error on screen.
 *
 * Only ids travel. n8n reads the address from Firestore itself and never
 * mails an address supplied in the request, so this endpoint cannot be used
 * to send email to arbitrary people. The visitor's timezone is passed purely
 * so the email can show the session time in their local time.
 */
function requestConfirmationEmail(webinarId: string, registrantId: string): void {
  try {
    // Throws when the base URL is unset; the catch below absorbs that.
    void fetch(n8nWebhookUrl("webinar-registered"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webinar_id: webinarId,
        registrant_id: registrantId,
        timezone: browserTimezone(),
      }),
      // Lets the request finish even if the visitor closes the tab at once.
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let email plumbing break registration.
  }
}

/**
 * Owner only. Registration is open to anonymous visitors, so the same email can
 * appear more than once; this keeps the earliest registration per address.
 */
export async function listRegistrants(webinarId: string): Promise<Registrant[]> {
  const snap = await getDocs(
    query(collection(db, "webinars", webinarId, "registrants"), orderBy("created_at", "asc")),
  );
  const seen = new Set<string>();
  const rows: Registrant[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    const email = String(data.email ?? "");
    if (!email || seen.has(email)) continue;
    seen.add(email);
    const ts = data.created_at as Timestamp | undefined;
    rows.push({
      id: d.id,
      name: String(data.name ?? ""),
      email,
      created_at: ts?.toDate ? ts.toDate() : null,
    });
  }
  return rows.reverse();
}

/**
 * Owner only. A server-side count, so the dashboard never downloads every
 * registrant just to show a number. It counts raw registrations, duplicates
 * included — listRegistrants is the de-duplicated view.
 */
export async function countRegistrations(webinarId: string): Promise<number | null> {
  try {
    const snap = await getCountFromServer(collection(db, "webinars", webinarId, "registrants"));
    return snap.data().count;
  } catch {
    return null;
  }
}

export function registrationUrl(webinarId: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/w?id=${encodeURIComponent(webinarId)}`;
}

export function registrantsCsv(rows: Registrant[]): string {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [cell(r.name), cell(r.email), cell(r.created_at ? r.created_at.toISOString() : "")].join(","),
  );
  return ["name,email,registered_at", ...lines].join("\n");
}

/** A one-hour calendar entry for the session, as an .ics file body. */
export function sessionIcs(webinar: Webinar, link: string): string | null {
  if (!webinar.next_session_at) return null;
  const start = new Date(webinar.next_session_at);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const text = (v: string) => v.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Webinar Stack//EN",
    "BEGIN:VEVENT",
    `UID:${webinar.id}-${stamp(start)}@webinarstack`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${text(webinar.title)}`,
    `DESCRIPTION:${text(`${webinar.subtitle}\n\n${link}`)}`,
    `URL:${link}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
