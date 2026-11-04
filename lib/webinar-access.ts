/**
 * Free or paid, live or automated: link checks and safe reading of stored
 * values. No Firebase here, so tests can load it directly.
 */

export type AccessType = "free" | "paid";
export type DeliveryType = "live" | "automated";

const URL_MAX = 1000;

/** The parsed link, only for plain https links with no "user@" trick in front of the host. */
function httpsUrl(value: string): URL | null {
  if (typeof value !== "string" || value.length > URL_MAX || value !== value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

export function isValidPaymentUrl(url: string): boolean {
  return httpsUrl(url) !== null;
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);
const YOUTUBE_PATHS = new Set(["embed", "shorts", "live", "v"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com"]);

/**
 * The player address for a YouTube or Vimeo link, or null. It is rebuilt from
 * the parsed id alone, so nothing else from the link reaches the iframe.
 * shortcut: unlisted Vimeo links (vimeo.com/123/abc) are refused, keep the hash if hosts need them.
 */
export function videoEmbedUrl(value: string): string | null {
  const url = httpsUrl(value);
  if (!url) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const host = url.hostname;

  let youtubeId: string | null = null;
  if (host === "youtu.be" && parts.length === 1) youtubeId = parts[0];
  else if (YOUTUBE_HOSTS.has(host)) {
    if (parts.length === 1 && parts[0] === "watch") youtubeId = url.searchParams.get("v");
    else if (parts.length === 2 && YOUTUBE_PATHS.has(parts[0])) youtubeId = parts[1];
  }
  if (youtubeId && /^[A-Za-z0-9_-]{11}$/.test(youtubeId)) return `https://www.youtube-nocookie.com/embed/${youtubeId}`;

  let vimeoId: string | null = null;
  if (VIMEO_HOSTS.has(host) && parts.length === 1) vimeoId = parts[0];
  else if (host === "player.vimeo.com" && parts.length === 2 && parts[0] === "video") vimeoId = parts[1];
  if (vimeoId && /^[0-9]{1,20}$/.test(vimeoId)) return `https://player.vimeo.com/video/${vimeoId}`;

  return null;
}

export function isValidVideoUrl(url: string): boolean {
  return videoEmbedUrl(url) !== null;
}

const PAID_COPY: Record<string, string> = {
  cta_note: "You'll pay on the host's checkout page.",
  fine_print: "",
  access_sub: "Buy through the host's checkout and get access there.",
  final_title: "Get your ticket today",
  final_note: "",
};

const AUTOMATED_COPY: Record<string, string> = {
  cta_note: "Free. Watch right after you sign up.",
  access_sub: "Sign up and the video appears right here.",
  final_title: "Watch it free today",
  final_note: "",
  thanks_label: "You're in",
  thanks_text: "Your video is below.",
  thanks_chip: "",
  steps_label: "",
  steps_title: "",
  step1_title: "Watch the training",
  step1_text: "Watch it whenever you like.",
};

/**
 * What a stock Training-page line becomes when its usual wording (a free seat,
 * emails, a calendar) isn't true for this webinar. Undefined = no change, which
 * is always the case for free live webinars. A host's own text is never replaced.
 */
export function stockCopyOverride(w: { access_type: AccessType; delivery_type: DeliveryType }, key: string): string | undefined {
  if (w.access_type === "paid") return PAID_COPY[key];
  return w.delivery_type === "automated" ? AUTOMATED_COPY[key] : undefined;
}

/**
 * What switching free/paid or live/automated does to a page that is already
 * published: a reason to refuse, or the plain warning to confirm. The removed
 * date and video link are named because a published save can't keep them.
 */
export function publishedSwitchCheck(
  w: { access_type: AccessType; delivery_type: DeliveryType; payment_url: string; video_url: string; next_session_at: string },
  next: { access_type: AccessType; delivery_type: DeliveryType },
): { refuse: string } | { confirm: string } {
  const toPaid = next.access_type === "paid" && w.access_type !== "paid";
  const toFree = next.access_type === "free" && w.access_type !== "free";
  const toAutomated = next.delivery_type === "automated" && w.delivery_type !== "automated";
  const toLive = next.delivery_type === "live" && w.delivery_type !== "live";

  if (next.access_type === "paid" && !isValidPaymentUrl(w.payment_url)) {
    return { refuse: "Your page is live and paid needs a working payment link. Unpublish first, add the link, then publish again." };
  }
  if (next.access_type === "free" && next.delivery_type === "automated" && !isValidVideoUrl(w.video_url)) {
    return { refuse: "Your page is live and a free automated webinar needs a working video link. Unpublish first, add the link, then publish again." };
  }

  const lines = ["This changes your live page right away."];
  if (toPaid) lines.push("The sign-up form comes off the page and visitors see a buy button instead.");
  if (toFree) lines.push(next.delivery_type === "live" ? "Anyone can register for free and be emailed your session link." : "Anyone can sign up for free and watch the video.");
  if (toAutomated) {
    const date = w.next_session_at ? new Date(w.next_session_at) : null;
    const when = date && !Number.isNaN(date.getTime()) ? ` (${date.toLocaleString()})` : "";
    lines.push(`The date${when} is removed, with its countdown and reminders. Note it down if you might switch back: it can't be restored once you leave this page.`);
  }
  if (toLive) lines.push("The page says the date is to be announced until you set one.");
  if (toPaid && w.video_url) lines.push(`Your video link (${w.video_url}) is removed. Note it down if you might switch back: it can't be restored once you leave this page.`);
  lines.push("Continue?");
  return { confirm: lines.join("\n\n") };
}

/**
 * Reads the access fields from a stored document. Old documents and anything
 * unexpected fall back to free and live. Links stay as typed so the editor can
 * show its error; the public page checks them again before using them.
 */
export function coerceAccess(data: Record<string, unknown>) {
  const url = (v: unknown) => (typeof v === "string" && v.length <= URL_MAX ? v : "");
  return {
    access_type: (data.access_type === "paid" ? "paid" : "free") as AccessType,
    ticket_price: typeof data.ticket_price === "string" ? data.ticket_price.slice(0, 40) : "",
    payment_url: url(data.payment_url),
    delivery_type: (data.delivery_type === "automated" ? "automated" : "live") as DeliveryType,
    video_url: url(data.video_url),
  };
}
