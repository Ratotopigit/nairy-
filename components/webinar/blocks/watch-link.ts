/**
 * The watch room's join button: "this browser just registered" and the
 * request for that registrant's own join link.
 *
 * The join link is private (webinars/{id}/private/session). It is never read
 * on a public page; it only arrives through the same webinar-join-info flow
 * the registration page uses, which checks the fresh registrant id.
 */
import { n8nWebhookUrl } from "@/lib/n8n-url";
import { isValidJoinUrl, registrationUrl, type Webinar } from "@/lib/webinars";

const regKey = (id: string) => `webinar-registrant:${id}`;
/** The join-info workflow only answers for registrations under 2 hours old. */
const JOIN_INFO_WINDOW_MS = 2 * 60 * 60 * 1000;

/** Called after a successful registration on the public page. */
export function rememberRegistration(webinarId: string, registrantId: string) {
  try {
    window.localStorage.setItem(regKey(webinarId), JSON.stringify({ rid: registrantId, at: Date.now() }));
  } catch {
    // Blocked storage only means no join button here; the email still has the link.
  }
}

export function recentRegistrant(webinarId: string): string | null {
  try {
    const v = JSON.parse(window.localStorage.getItem(regKey(webinarId)) ?? "null") as { rid?: unknown; at?: unknown } | null;
    const ok = v && typeof v.rid === "string" && /^[A-Za-z0-9]{1,64}$/.test(v.rid) && typeof v.at === "number" && Date.now() - v.at < JOIN_INFO_WINDOW_MS;
    return ok ? (v.rid as string) : null;
  } catch {
    return null;
  }
}

/** Same request as lib/webinars.ts fetchJoinInfo (not exported there). */
export async function fetchJoinUrl(webinarId: string, registrantId: string): Promise<string | null> {
  try {
    const res = await fetch(n8nWebhookUrl("webinar-join-info"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webinar_id: webinarId, registrant_id: registrantId }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { join_url?: unknown };
    return typeof data.join_url === "string" && data.join_url && isValidJoinUrl(data.join_url) ? data.join_url : null;
  } catch {
    return null;
  }
}

/** The public watch room or replay link: the readable link (or /w?id=) plus view. */
export function viewUrl(w: Pick<Webinar, "id" | "public_path">, view: "watch" | "replay"): string {
  const base = registrationUrl(w);
  return `${base}${base.includes("?") ? "&" : "?"}view=${view}`;
}
