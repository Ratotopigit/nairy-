/**
 * Lets Webinar Chat talk about the host's own webinars. Typing "@" in the
 * chat offers their webinars; a message that tags one ("how many people
 * registered for @October masterclass?") is sent with a short, factual
 * summary of that webinar's registrations, which the chat AI answers from.
 *
 * Everything is read in the browser with the host's own permissions (the
 * rules only let owners read registrants), so a host can only ever bring
 * their own webinars into the chat. Names travel, email addresses don't.
 */
import {
  countRegistrations,
  listRegistrants,
  registrationUrl,
  sessionPhase,
  sessionStart,
  type SessionPhase,
  type Webinar,
} from "@/lib/webinars";

const PHASE_WORDS: Record<SessionPhase, string> = {
  none: "no session date set",
  upcoming: "upcoming",
  live: "happening right now",
  ended: "session has ended (page still up, registration closed)",
  closed: "finished over a week ago (public page hidden)",
};

/** What to call a webinar in the chat: the host's name for it. */
export function mentionLabel(webinar: Webinar): string {
  return (webinar.name || webinar.title || "Untitled webinar").replace(/\s+/g, " ").trim();
}

/**
 * The "@query" being typed just before the caret, or null. The query may
 * contain spaces (webinar names do), but not a newline or another "@".
 */
export function activeMention(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(before[at - 1])) return null; // an email address, not a mention
  const query = before.slice(at + 1);
  if (query.length > 60 || /[\n@]/.test(query)) return null;
  return { start: at, query };
}

export function matchMentions(query: string, webinars: Webinar[]): Webinar[] {
  const q = query.trim().toLowerCase();
  return webinars
    .filter((w) => !q || mentionLabel(w).toLowerCase().includes(q) || w.title.toLowerCase().includes(q))
    .slice(0, 8);
}

/** Webinars tagged in a message, longest names first so "AI" doesn't steal "AI masterclass". */
export function taggedWebinars(text: string, webinars: Webinar[]): Webinar[] {
  const lower = text.toLowerCase();
  const found: Webinar[] = [];
  const claimed: Array<[number, number]> = [];
  const byLength = [...webinars].sort((a, b) => mentionLabel(b).length - mentionLabel(a).length);
  for (const w of byLength) {
    const needle = `@${mentionLabel(w).toLowerCase()}`;
    let from = 0;
    while (true) {
      const i = lower.indexOf(needle, from);
      if (i < 0) break;
      const end = i + needle.length;
      if (!claimed.some(([s, e]) => i < e && end > s)) {
        claimed.push([i, end]);
        found.push(w);
        break;
      }
      from = end;
    }
  }
  return found;
}

const ASKS_ABOUT_WEBINARS = /\b(webinars?|registr\w*|sign[\s-]?ups?|signed up|attendees?|leads?|how many people|who (?:has )?(?:joined|registered))\b/i;

function formatWhen(date: Date | null): string {
  if (!date) return "not set";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(date);
}

async function describe(webinar: Webinar, now: number): Promise<string> {
  const rows = await listRegistrants(webinar.id).catch(() => null);
  const total = rows === null ? await countRegistrations(webinar.id) : null;
  const day = 24 * 60 * 60 * 1000;
  const lines = [
    `Webinar "${mentionLabel(webinar)}"${webinar.title && webinar.title !== webinar.name ? ` (public headline: "${webinar.title}")` : ""}`,
    `- Published: ${webinar.status === "published" ? "yes" : "no (draft, not taking registrations)"}`,
    `- Session: ${formatWhen(sessionStart(webinar))}, ${webinar.duration_minutes} minutes; ${PHASE_WORDS[sessionPhase(webinar, now)]}`,
  ];
  if (rows) {
    const since = (ms: number) => rows.filter((r) => r.created_at && now - r.created_at.getTime() <= ms).length;
    lines.push(`- Registered: ${rows.length} ${rows.length === 1 ? "person" : "people"} (duplicates by email counted once)`);
    lines.push(`- New in the last 24 hours: ${since(day)}; last 7 days: ${since(7 * day)}`);
    if (rows.length) {
      const recent = rows
        .slice(0, 15)
        .map((r) => `${r.name || "(no name)"}${r.created_at ? ` (${formatWhen(r.created_at)})` : ""}`)
        .join("; ");
      lines.push(`- Most recent registrants, newest first: ${recent}`);
    }
  } else {
    lines.push(`- Registrations: ${total ?? "unknown (could not be loaded)"}`);
  }
  if (webinar.status === "published") lines.push(`- Public page: ${registrationUrl(webinar)}`);
  return lines.join("\n");
}

/**
 * The summary sent with a chat message, or "" when the message is not about
 * webinars. Tagged webinars get full detail; a general question about
 * webinars or registrations gets a one-line overview of each.
 */
export async function buildWebinarContext(text: string, webinars: Webinar[]): Promise<string> {
  if (!webinars.length) return "";
  const now = Date.now();
  const tagged = taggedWebinars(text, webinars);
  const header = `Now: ${formatWhen(new Date(now))}. Data read live from the host's own account.`;
  if (tagged.length) {
    const parts = await Promise.all(tagged.slice(0, 5).map((w) => describe(w, now)));
    return [header, ...parts].join("\n\n").slice(0, 8000);
  }
  if (!ASKS_ABOUT_WEBINARS.test(text)) return "";
  const list = webinars.slice(0, 30);
  const counts = await Promise.all(list.map((w) => countRegistrations(w.id)));
  const lines = list.map(
    (w, i) =>
      `- "${mentionLabel(w)}": ${counts[i] ?? "?"} registrations; ${w.status === "published" ? "published" : "draft"}; session ${formatWhen(sessionStart(w))}, ${PHASE_WORDS[sessionPhase(w, now)]}`,
  );
  return [header, `All of the host's webinars (registration counts include repeat sign-ups; tag one with @ for detail):`, ...lines]
    .join("\n")
    .slice(0, 8000);
}
