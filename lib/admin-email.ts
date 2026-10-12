/**
 * Data and actions for the admin "Email users" page.
 *
 * Reads go straight to Firestore (the rules allow admins to list users and
 * read email_prefs / broadcasts). Sending goes through the n8n
 * "13 - Admin Broadcast" workflow, which re-checks that the caller is an
 * admin, skips anyone who unsubscribed, and records the outcome in
 * broadcasts/{id} — which this page then watches.
 */
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { n8nWebhookUrl } from "@/lib/n8n-url";

export type AdminUser = {
  uid: string;
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string;
  admin: boolean;
};

export type JoinedFilter = "any" | "7" | "30" | "90";
export type ActivityFilter = "any" | "active30" | "inactive30";

export type UserFilters = {
  search: string;
  joined: JoinedFilter;
  activity: ActivityFilter;
  includeAdmins: boolean;
};

export type BroadcastResult = {
  broadcast_id: string;
  status: "sent" | "partial" | "failed" | "empty";
  subject: string;
  test: boolean;
  requested: number;
  sent: number;
  failed: number;
  skipped_opted_out: number;
  skipped_no_email: number;
  error: string;
  sent_by_email: string;
  created_at: string;
};

export const DEFAULT_FILTERS: UserFilters = {
  search: "",
  joined: "any",
  activity: "any",
  includeAdmins: false,
};

const DAY = 24 * 60 * 60 * 1000;

export async function listUsers(): Promise<AdminUser[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid: String(data.uid ?? d.id),
        email: String(data.email ?? "").trim().toLowerCase(),
        name: String(data.displayName ?? ""),
        createdAt: String(data.createdAt ?? ""),
        lastLoginAt: String(data.lastLoginAt ?? ""),
        admin: data.admin === true,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Null when the rules don't allow it yet (the email_prefs rule not published). */
export async function listOptedOut(): Promise<Set<string> | null> {
  try {
    const snap = await getDocs(query(collection(db, "email_prefs"), where("opted_out", "==", true)));
    return new Set(snap.docs.map((d) => String(d.data().uid ?? d.id)));
  } catch {
    return null;
  }
}

export async function listBroadcasts(): Promise<BroadcastResult[] | null> {
  try {
    const snap = await getDocs(collection(db, "broadcasts"));
    return snap.docs
      .map((d) => d.data() as BroadcastResult)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 10);
  } catch {
    return null;
  }
}

/** Pure, so it is unit-testable and the count on screen always matches the send. */
export function filterUsers(
  users: AdminUser[],
  filters: UserFilters,
  optedOut: Set<string> | null,
  now = Date.now(),
): { recipients: AdminUser[]; optedOutCount: number } {
  const search = filters.search.trim().toLowerCase();
  let optedOutCount = 0;
  const recipients = users.filter((u) => {
    if (!u.email) return false;
    if (!filters.includeAdmins && u.admin) return false;
    if (search && !u.email.includes(search) && !u.name.toLowerCase().includes(search)) return false;
    if (filters.joined !== "any") {
      const joined = Date.parse(u.createdAt);
      if (!Number.isFinite(joined) || now - joined > Number(filters.joined) * DAY) return false;
    }
    if (filters.activity !== "any") {
      const last = Date.parse(u.lastLoginAt);
      const active = Number.isFinite(last) && now - last <= 30 * DAY;
      if (filters.activity === "active30" && !active) return false;
      if (filters.activity === "inactive30" && active) return false;
    }
    if (optedOut?.has(u.uid)) {
      optedOutCount += 1;
      return false;
    }
    return true;
  });
  return { recipients, optedOutCount };
}

function newBroadcastId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `bc_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Hands the broadcast to n8n and returns its id. n8n answers at once and
 * records the result in broadcasts/{id}; use watchBroadcast for progress.
 */
export async function startBroadcast(input: {
  subject: string;
  message: string;
  recipientUids: string[];
  test: boolean;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("You need to be signed in.");
  const token = await user.getIdToken();
  const broadcastId = newBroadcastId();
  let res: Response;
  try {
    res = await fetch(n8nWebhookUrl("admin-broadcast"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        broadcast_id: broadcastId,
        subject: input.subject,
        message: input.message,
        recipient_uids: input.test ? [] : input.recipientUids,
        test: input.test,
      }),
    });
  } catch {
    // An unpublished n8n webhook fails the browser's CORS check, which
    // surfaces as a bare network error rather than a 404.
    throw new Error("Couldn't reach the email service. Check that the email workflows are published in n8n.");
  }
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "The email workflow isn't published in n8n yet."
        : `The email service answered ${res.status}.`,
    );
  }
  return broadcastId;
}

/**
 * Calls back with the result once n8n writes it. If the rules don't allow
 * reading broadcasts yet, onError fires instead.
 */
export function watchBroadcast(
  broadcastId: string,
  onResult: (result: BroadcastResult) => void,
  onError: () => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "broadcasts", broadcastId),
    (snap) => {
      if (snap.exists()) onResult(snap.data() as BroadcastResult);
    },
    () => onError(),
  );
}
