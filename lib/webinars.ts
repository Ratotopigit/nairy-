/**
 * The one place that reads and writes webinars and their registrants.
 *
 *   webinars/{webinarId}                      owner-managed, public when published
 *   webinars/{webinarId}/registrants/{id}     anyone may create, only the owner reads
 *   webinars/{webinarId}/private/session      owner only: the join link (n8n
 *                                             emails it to registrants) and the
 *                                             host's own notes. Never public.
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
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { n8nWebhookUrl } from "@/lib/n8n-url";
import { DEFAULT_TEMPLATE_ID } from "@/lib/webinar-templates";

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
  /** How long the session runs. Decides when the page shows "live" and "ended". */
  duration_minutes: number;
  /** Look of the public page; see lib/webinar-templates.ts. */
  template_id: string;
  /** Host's colour overrides ("#rrggbb"), "" = the template's own colours. */
  theme_accent: string;
  theme_brand: string;
  /**
   * Readable public link, "/<host>/<title>-<id>", refreshed on every save.
   * Only the id at the end is used to find the webinar; the words are for
   * people, and a link with stale words is redirected to this one.
   */
  public_path: string;
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
  joinUrl: 1000,
  notes: 1000,
  title: 120,
  subtitle: 240,
  bullet: 140,
  bullets: 6,
  name: 120,
  email: 254,
} as const;

export const DEFAULT_DURATION = 60;
export const DURATION_OPTIONS = [30, 45, 60, 90, 120, 180, 240] as const;

/** After the session ends, the page stays up (as "ended") this long. */
export const ENDED_PAGE_DAYS = 7;

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
    duration_minutes: DEFAULT_DURATION,
    template_id: DEFAULT_TEMPLATE_ID,
    theme_accent: "",
    theme_brand: "",
    public_path: "",
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
    duration_minutes:
      typeof data.duration_minutes === "number" && data.duration_minutes > 0
        ? Math.min(data.duration_minutes, 24 * 60)
        : DEFAULT_DURATION,
    template_id: str("template_id"),
    theme_accent: str("theme_accent"),
    theme_brand: str("theme_brand"),
    public_path: str("public_path"),
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

/**
 * `name` is the host's own label ("October AI masterclass") and also starts
 * as the public headline, which they can then change independently.
 */
export async function createWebinar(ownerId: string, input: { name: string; notes?: string }): Promise<string> {
  const name = input.name.trim().slice(0, WEBINAR_LIMITS.name) || "Untitled webinar";
  const ref = await addDoc(collection(db, "webinars"), { ...emptyWebinar(ownerId), name, title: name.slice(0, WEBINAR_LIMITS.title) });
  if (input.notes?.trim()) {
    // Best effort: the webinar exists either way, and notes can be added later.
    await savePrivate(ref.id, { join_url: "", notes: input.notes }).catch(() => {});
  }
  return ref.id;
}

/**
 * `hostName` is the account holder's name, used for the readable link.
 * `closes_at` is a real Timestamp so the security rules can refuse
 * registrations once the session is over (rules cannot parse ISO strings).
 */
export async function saveWebinar(webinar: Webinar, hostName = ""): Promise<void> {
  const { id, ...rest } = webinar;
  const end = sessionEnd(webinar);
  await setDoc(
    doc(db, "webinars", id),
    {
      ...rest,
      bullets: rest.bullets.map((b) => b.trim()).filter(Boolean).slice(0, WEBINAR_LIMITS.bullets),
      owner_timezone: browserTimezone(),
      public_path: publicPath(webinar, hostName),
      closes_at: end ? Timestamp.fromDate(end) : null,
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

// ── Session timing ────────────────────────────────────────────────────────

/**
 *   none      no date yet
 *   upcoming  before the start: countdown, registration open
 *   live      during the session: "live now", registration still open
 *   ended     up to ENDED_PAGE_DAYS after the end: the page says it's over
 *   closed    after that: the public page is gone; the host sees it in History
 */
export type SessionPhase = "none" | "upcoming" | "live" | "ended" | "closed";

export function sessionStart(webinar: Pick<Webinar, "next_session_at">): Date | null {
  const d = new Date(webinar.next_session_at);
  return webinar.next_session_at && !Number.isNaN(d.getTime()) ? d : null;
}

export function sessionEnd(webinar: Pick<Webinar, "next_session_at" | "duration_minutes">): Date | null {
  const start = sessionStart(webinar);
  return start ? new Date(start.getTime() + (webinar.duration_minutes || DEFAULT_DURATION) * 60_000) : null;
}

export function sessionPhase(
  webinar: Pick<Webinar, "next_session_at" | "duration_minutes">,
  now = Date.now(),
): SessionPhase {
  const start = sessionStart(webinar);
  const end = sessionEnd(webinar);
  if (!start || !end) return "none";
  if (now < start.getTime()) return "upcoming";
  if (now < end.getTime()) return "live";
  if (now < end.getTime() + ENDED_PAGE_DAYS * 86_400_000) return "ended";
  return "closed";
}

// ── Readable links ────────────────────────────────────────────────────────

export function slugify(value: string, max = 60): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

/** "/bibek-parajuli/ai-powered-webinar-<id>". The id is what counts. */
export function publicPath(webinar: Pick<Webinar, "id" | "title" | "presenter_name">, hostName = ""): string {
  const host = slugify(hostName || webinar.presenter_name, 40) || "host";
  const title = slugify(webinar.title, 60);
  return `/${host}/${title ? `${title}-` : ""}${webinar.id}`;
}

/**
 * The webinar id at the end of a readable link, or null. Ids are Firestore
 * auto-ids (letters and digits, no dashes), so it is whatever follows the
 * last dash. Anything else is not a webinar link.
 */
export function idFromPublicPath(pathname: string): string | null {
  const parts = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (parts.length !== 2 || !/^[a-z0-9-]{1,40}$/.test(parts[0])) return null;
  const id = parts[1].split("-").pop() ?? "";
  return /^[A-Za-z0-9]{16,40}$/.test(id) ? id : null;
}

// ── Private: join link and notes ──────────────────────────────────────────

export function isValidJoinUrl(value: string): boolean {
  if (!value) return true; // optional
  if (value.length > WEBINAR_LIMITS.joinUrl) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export type WebinarPrivate = { join_url: string; notes: string };

/** Owner only (rules). Empty strings when nothing is set. */
export async function getPrivate(webinarId: string): Promise<WebinarPrivate> {
  const snap = await getDoc(doc(db, "webinars", webinarId, "private", "session"));
  const data = snap.exists() ? snap.data() : {};
  return { join_url: String(data.join_url ?? ""), notes: String(data.notes ?? "") };
}

export async function savePrivate(webinarId: string, value: WebinarPrivate): Promise<void> {
  await setDoc(doc(db, "webinars", webinarId, "private", "session"), {
    join_url: value.join_url.trim(),
    notes: value.notes.trim().slice(0, WEBINAR_LIMITS.notes),
    updated_at: new Date().toISOString(),
  });
}

// ── Registration ──────────────────────────────────────────────────────────

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

/** The shareable link. Old ?id= links keep working and redirect here. */
export function registrationUrl(webinar: Pick<Webinar, "id" | "public_path">): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return webinar.public_path
    ? `${origin}${webinar.public_path}`
    : `${origin}/w?id=${encodeURIComponent(webinar.id)}`;
}

/** A registration with the webinar it belongs to, for views across webinars. */
export type WebinarRegistrant = Registrant & { webinar_id: string; webinar_name: string };

/**
 * Owner only. Every registrant of every webinar passed in, newest first. One
 * person on two webinars appears twice (once per webinar), which is what the
 * per-webinar filters need.
 */
export async function listAllRegistrants(webinars: Webinar[]): Promise<WebinarRegistrant[]> {
  const lists = await Promise.all(
    webinars.map(async (w) => {
      try {
        const rows = await listRegistrants(w.id);
        return rows.map((r) => ({ ...r, webinar_id: w.id, webinar_name: w.name || w.title }));
      } catch {
        return [];
      }
    }),
  );
  return lists
    .flat()
    .sort((a, b) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0));
}

export function webinarRegistrantsCsv(rows: WebinarRegistrant[]): string {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [cell(r.name), cell(r.email), cell(r.webinar_name), cell(r.created_at ? r.created_at.toISOString() : "")].join(","),
  );
  return ["name,email,webinar,registered_at", ...lines].join("\n");
}

export function registrantsCsv(rows: Registrant[]): string {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [cell(r.name), cell(r.email), cell(r.created_at ? r.created_at.toISOString() : "")].join(","),
  );
  return ["name,email,registered_at", ...lines].join("\n");
}

// ── Calendar ──────────────────────────────────────────────────────────────

const CAL_NOTE = "Your join link is in your confirmation email.";

function calStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Calendar entry for the visitor's "Add to calendar" button, with reminders
 * an hour and ten minutes before. The join link is private, so it is not in
 * here; the invite attached to the confirmation email carries it.
 */
export function sessionIcs(webinar: Webinar, link: string): string | null {
  const start = sessionStart(webinar);
  const end = sessionEnd(webinar);
  if (!start || !end) return null;
  const text = (v: string) => v.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
  const alarm = (before: string) => [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${text(webinar.title)}`,
    `TRIGGER:-${before}`,
    "END:VALARM",
  ];
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Webinar Stack//EN",
    "BEGIN:VEVENT",
    `UID:${webinar.id}-${calStamp(start)}@webinarstackai.com`,
    `DTSTAMP:${calStamp(new Date())}`,
    `DTSTART:${calStamp(start)}`,
    `DTEND:${calStamp(end)}`,
    `SUMMARY:${text(webinar.title)}`,
    `DESCRIPTION:${text(`${webinar.subtitle}\n\n${CAL_NOTE}\n\n${link}`)}`,
    `URL:${link}`,
    ...alarm("PT1H"),
    ...alarm("PT10M"),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Google Calendar "add event" link for the thank-you screen. */
export function googleCalendarLink(webinar: Webinar, link: string): string | null {
  const start = sessionStart(webinar);
  const end = sessionEnd(webinar);
  if (!start || !end) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: webinar.title,
    dates: `${calStamp(start)}/${calStamp(end)}`,
    details: `${webinar.subtitle}\n\n${CAL_NOTE}\n\n${link}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
