/**
 * Webinar email templates — single source of truth.
 *
 * n8n Code nodes cannot import files, so n8n/email/build-workflows.mjs inlines
 * this file into each workflow that sends email. Edit HERE, then rebuild; never
 * edit the copies inside the workflow JSON.
 *
 * Deliverability (this is a multi-user platform, and every user's email goes
 * out from the same domain, so one bad template hurts everyone):
 *   - multipart: every email has a plain-text part, not HTML only
 *   - no images, no tracking pixels, no link shorteners
 *   - every link points at webinarstackai.com, the sending domain, with one
 *     exception: the host's own session link (Zoom, Meet...) in a
 *     confirmation. That is https only, shown with its domain spelled out,
 *     and only ever sent to people who registered for that host's webinar
 *   - user-written text is HTML-escaped and length-capped; users cannot add
 *     links anywhere else, so the platform cannot be used to send phishing
 *   - a footer saying who sent it and why the recipient is getting it
 */

// Emails are sent by n8n's Gmail node from the connected Google Workspace
// account, so the From ADDRESS is that account; templates only set the
// display name.
const BRAND = {
  site: "https://webinarstackai.com",
  product: "Webinar Stack",
  // Sender identification in bulk-email footers (Australia's Spam Act). Add a
  // postal address here before emailing US recipients (CAN-SPAM requires one).
  company: "Explosion Marketing International",
  postalAddress: "",
};

const COLORS = {
  page: "#f4f1e8",
  card: "#ffffff",
  ink: "#1d2a27",
  muted: "#5f6b67",
  rule: "#e4dfd3",
  button: "#1f4d3d",
};

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clip(value, max) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function firstName(name) {
  const first = clip(name, 60).split(" ")[0];
  return first || "there";
}

/**
 * The display name in the From header. User-controlled, so stripped of
 * anything that could break out of the header: quotes, angle brackets, @,
 * control characters and newlines (header injection).
 */
function senderName(presenter) {
  const clean = String(presenter ?? "")
    .replace(/[\u0000-\u001f\u007f"<>@\\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return clean ? `${clean} via ${BRAND.product}` : BRAND.product;
}

/**
 * The ONLY place that knows the sending step's input format (n8n's Gmail
 * node). Templates return a neutral email; this maps it. Attachments travel
 * as n8n binary data, built separately by the workflow.
 */
function gmailPayload(email, { to, replyTo } = {}) {
  return {
    to,
    subject: email.subject,
    html: email.html,
    senderName: email.fromName,
    replyTo: replyTo || "",
  };
}


/** Falls back to UTC for anything that is not a real IANA zone. */
function safeTimezone(tz) {
  try {
    if (!tz) return "UTC";
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return "UTC";
  }
}

/**
 * " (Sydney time)" from "Australia/Sydney". Offsets like GMT+11 are exact but
 * most people don't know their own; a city they recognise.
 */
function zoneCity(zone) {
  if (!zone || zone === "UTC" || !zone.includes("/")) return "";
  const city = zone.split("/").pop().replace(/_/g, " ");
  return city ? ` (${city} time)` : "";
}

function sessionParts(iso, tz) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return null;
  const zone = safeTimezone(tz);
  return {
    date: new Intl.DateTimeFormat("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: zone,
    }).format(date),
    time: `${new Intl.DateTimeFormat("en-US", {
      hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone: zone,
    }).format(date)}${zoneCity(zone)}`,
  };
}

/**
 * UTF-8 -> base64 without Buffer or btoa, neither of which is guaranteed in
 * the n8n Code sandbox (it already lacks `crypto`).
 */
function toBase64(input) {
  const bytes = [];
  for (const ch of String(input)) {
    const code = ch.codePointAt(0);
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  const table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const n = (a << 16) | (b << 8) | c;
    out += table[(n >> 18) & 63] + table[(n >> 12) & 63];
    out += i + 1 < bytes.length ? table[(n >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? table[n & 63] : "=";
  }
  return out;
}

function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * The public page: the readable /<host>/<title>-<id> link when the webinar
 * has one, else the original /w?id= form (both work).
 */
function pageUrl(webinar) {
  const path = String(webinar.public_path ?? "");
  if (/^\/[a-z0-9-]{1,40}\/[a-z0-9-]*[A-Za-z0-9]{16,40}$/.test(path)) return `${BRAND.site}${path}`;
  return `${BRAND.site}/w?id=${encodeURIComponent(webinar.id)}`;
}

/** The host's join link, or "" if it is not a plain https URL. */
function safeJoinUrl(raw) {
  const url = String(raw ?? "").trim();
  if (!url || url.length > 1000 || /\s/.test(url) || !/^https:\/\/[^/\s]+/i.test(url)) return "";
  return url;
}

/** "zoom.us" from a join link, so people can see where it goes. */
function linkHost(url) {
  const m = /^https:\/\/([^/:?#]+)/i.exec(url);
  return m ? m[1].replace(/^www\./i, "").toLowerCase() : "";
}

function sessionEnd(webinar) {
  const start = new Date(webinar.next_session_at);
  const minutes = Number(webinar.duration_minutes) > 0 ? Math.min(Number(webinar.duration_minutes), 1440) : 60;
  return new Date(start.getTime() + minutes * 60 * 1000);
}

function calendarDetails(webinar, joinUrl) {
  return [
    clip(webinar.subtitle, 240),
    joinUrl ? `Join here: ${joinUrl}` : "",
    `Session page: ${pageUrl(webinar)}`,
  ].filter(Boolean).join("\n\n");
}

function googleCalendarUrl(webinar, joinUrl = "") {
  const start = new Date(webinar.next_session_at);
  const end = sessionEnd(webinar);
  // Built by hand: URLSearchParams is not guaranteed in the n8n sandbox.
  const params = {
    action: "TEMPLATE",
    text: clip(webinar.title, 120),
    dates: `${utcStamp(start)}/${utcStamp(end)}`,
    details: calendarDetails(webinar, joinUrl),
    ...(joinUrl ? { location: joinUrl } : {}),
  };
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `https://calendar.google.com/calendar/render?${query}`;
}

/**
 * The calendar invite, base64-encoded for an email attachment. Carries the
 * join link (as the location, so calendar apps show a Join button) and two
 * reminders: an hour and ten minutes before.
 */
function icsAttachment(webinar, joinUrl = "") {
  const start = new Date(webinar.next_session_at);
  if (Number.isNaN(start.getTime())) return null;
  const end = sessionEnd(webinar);
  const text = (v) =>
    String(v ?? "").replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\r?\n/g, "\\n");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Webinar Stack//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${webinar.id}-${utcStamp(start)}@webinarstackai.com`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${text(clip(webinar.title, 120))}`,
    `DESCRIPTION:${text(calendarDetails(webinar, joinUrl))}`,
    ...(joinUrl ? [`LOCATION:${text(joinUrl)}`] : []),
    `URL:${joinUrl || pageUrl(webinar)}`,
    ...["PT1H", "PT10M"].flatMap((before) => [
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${text(clip(webinar.title, 120))}`,
      `TRIGGER:-${before}`,
      "END:VALARM",
    ]),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return { filename: "webinar.ics", content: toBase64(body), type: "text/calendar", disposition: "attachment" };
}

/** The shared shell: a single centred column, inline styles, no images. */
function layout({ preheader, body, footer }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(BRAND.product)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 4px 16px;font:600 13px/1.4 Arial,Helvetica,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.muted};">${esc(BRAND.product)}</td></tr>
<tr><td style="background:${COLORS.card};border:1px solid ${COLORS.rule};border-radius:12px;padding:32px 28px;font:15px/1.6 Arial,Helvetica,sans-serif;color:${COLORS.ink};">
${body}
</td></tr>
<tr><td style="padding:20px 4px 0;font:12px/1.6 Arial,Helvetica,sans-serif;color:${COLORS.muted};">
${footer}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;"><tr>
<td style="background:${COLORS.button};border-radius:8px;">
<a href="${esc(href)}" style="display:inline-block;padding:12px 22px;font:600 15px/1 Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;">${esc(label)}</a>
</td></tr></table>`;
}

/**
 * Sent seconds after someone registers.
 * @param {{webinar: object, registrant: {name: string, email: string}, timezone: string, joinUrl?: string}} input
 */
function confirmationEmail({ webinar, registrant, timezone, joinUrl: rawJoinUrl }) {
  const joinUrl = safeJoinUrl(rawJoinUrl);
  const title = clip(webinar.title, 120) || "the webinar";
  const presenter = clip(webinar.presenter_name, 60);
  const when = sessionParts(webinar.next_session_at, timezone);
  const bullets = (Array.isArray(webinar.bullets) ? webinar.bullets : [])
    .map((b) => clip(b, 140))
    .filter(Boolean)
    .slice(0, 4);
  const link = pageUrl(webinar);
  const hasDate = Boolean(when);

  const subject = `You're registered: ${clip(title, 70)}`;
  const preheader = hasDate
    ? `${when.date} at ${when.time}. Add it to your calendar so you don't miss it.`
    : "Your place is saved. We'll share the date soon.";

  const joinHtml = joinUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:${COLORS.page};border-radius:10px;">
<tr><td style="padding:16px 18px;">
<div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${COLORS.muted};">How to join</div>
<p style="margin:6px 0 10px;font-size:14px;">At the start time, open this link${linkHost(joinUrl) ? ` (${esc(linkHost(joinUrl))})` : ""}:</p>
${button(joinUrl, "Join the session")}
<p style="margin:10px 0 0;font-size:12px;color:${COLORS.muted};word-break:break-all;">${esc(joinUrl)}</p>
</td></tr></table>`
    : `<p style="margin:0 0 20px;font-size:14px;color:${COLORS.muted};">We'll email you the link to join before the session starts.</p>`;

  const sessionHtml = hasDate
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid ${COLORS.rule};border-radius:10px;">
<tr><td style="padding:16px 18px;">
<div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${COLORS.muted};">When</div>
<div style="margin-top:4px;font-size:17px;font-weight:700;">${esc(when.date)}</div>
<div style="font-size:15px;">${esc(when.time)}</div>
${presenter ? `<div style="margin-top:8px;font-size:14px;color:${COLORS.muted};">Hosted by ${esc(presenter)}</div>` : ""}
</td></tr></table>
${joinHtml}
${button(googleCalendarUrl(webinar, joinUrl), "Add to Google Calendar")}
<p style="margin:8px 0 0;font-size:13px;color:${COLORS.muted};">Using Apple Calendar or Outlook? Open the invite attached to this email.</p>`
    : `<p style="margin:20px 0;">The date hasn't been set yet. We'll email you when it is.</p>`;

  const bulletsHtml = bullets.length
    ? `<p style="margin:28px 0 8px;font-weight:700;">What you'll learn</p>
<ul style="margin:0;padding-left:20px;">${bullets.map((b) => `<li style="margin:0 0 6px;">${esc(b)}</li>`).join("")}</ul>`
    : "";

  const body = `<p style="margin:0 0 12px;">Hi ${esc(firstName(registrant.name))},</p>
<p style="margin:0;">You're registered for <strong>${esc(title)}</strong>.</p>
${sessionHtml}
${bulletsHtml}
<p style="margin:28px 0 0;">Keep this email so the details are easy to find. You can always see the session page here: <a href="${esc(link)}" style="color:${COLORS.button};">${esc(link.replace("https://", ""))}</a></p>`;

  const footer = `You're receiving this because ${esc(registrant.email)} was used to register for "${esc(title)}" on webinarstackai.com.${presenter ? ` Replying to this email reaches ${esc(presenter)}.` : ""}<br>If this wasn't you, you can ignore this email.<br>Sent by ${esc(BRAND.product)}.`;

  const text = [
    `Hi ${firstName(registrant.name)},`,
    "",
    `You're registered for "${title}".`,
    "",
    ...(hasDate
      ? [
          `When: ${when.date}, ${when.time}`,
          ...(presenter ? [`Hosted by: ${presenter}`] : []),
          "",
          ...(joinUrl ? [`Join the session: ${joinUrl}`, ""] : []),
          `Add to Google Calendar: ${googleCalendarUrl(webinar, joinUrl)}`,
          "Apple Calendar or Outlook: open the attached invite.",
        ]
      : ["The date hasn't been set yet. We'll email you when it is."]),
    ...(bullets.length ? ["", "What you'll learn:", ...bullets.map((b) => `- ${b}`)] : []),
    "",
    `Session page: ${link}`,
    "",
    "--",
    `You're receiving this because ${registrant.email} was used to register for "${title}" on webinarstackai.com. If this wasn't you, you can ignore this email.`,
    `Sent by ${BRAND.product}.`,
  ].join("\n");

  const attachment = hasDate ? icsAttachment(webinar, joinUrl) : null;

  return {
    fromName: senderName(webinar.presenter_name),
    subject,
    html: layout({ preheader, body, footer }),
    text,
    attachments: attachment ? [attachment] : [],
  };
}

/**
 * Reminder before a session: "day" (sent 2-24 hours before) or "hour" (in
 * the hour before). The time is shown in the host's timezone, labelled: we
 * don't store each registrant's zone, and "in about N hours" is exact anyway.
 * @param {{webinar: object, registrant: {name: string, email: string}, kind: "day" | "hour", joinUrl?: string, now?: number}} input
 */
function reminderEmail({ webinar, registrant, kind, joinUrl: rawJoinUrl, now = Date.now() }) {
  const joinUrl = safeJoinUrl(rawJoinUrl);
  const title = clip(webinar.title, 120) || "the webinar";
  const presenter = clip(webinar.presenter_name, 60);
  const when = sessionParts(webinar.next_session_at, webinar.owner_timezone);
  const link = pageUrl(webinar);
  const soon = kind === "hour";
  const hours = Math.max(1, Math.round((Date.parse(webinar.next_session_at) - now) / 3600000));
  const inWords = soon ? "in about an hour" : `in about ${hours} hour${hours === 1 ? "" : "s"}`;

  const subject = soon ? `Starting soon: ${clip(title, 70)}` : `Coming up: ${clip(title, 70)}`;
  const preheader = joinUrl
    ? `Starts ${inWords}. Your join link is inside.`
    : `Starts ${inWords}${when ? `: ${when.date} at ${when.time}` : ""}.`;

  const whenHtml = when
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid ${COLORS.rule};border-radius:10px;">
<tr><td style="padding:16px 18px;">
<div style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${COLORS.muted};">Starts ${esc(inWords)}</div>
<div style="margin-top:4px;font-size:17px;font-weight:700;">${esc(when.date)}</div>
<div style="font-size:15px;">${esc(when.time)}</div>
${presenter ? `<div style="margin-top:8px;font-size:14px;color:${COLORS.muted};">Hosted by ${esc(presenter)}</div>` : ""}
</td></tr></table>`
    : "";

  const joinHtml = joinUrl
    ? `<p style="margin:0 0 6px;font-size:14px;">${soon ? "When it's time, join here" : "Here's your link to join"}${linkHost(joinUrl) ? ` (${esc(linkHost(joinUrl))})` : ""}:</p>
${button(joinUrl, "Join the session")}
<p style="margin:10px 0 0;font-size:12px;color:${COLORS.muted};word-break:break-all;">${esc(joinUrl)}</p>`
    : `<p style="margin:0;font-size:14px;color:${COLORS.muted};">The host will share the link to join. Keep an eye on your inbox.</p>`;

  const tip = soon
    ? `<p style="margin:20px 0 0;font-size:14px;color:${COLORS.muted};">Tip: join a couple of minutes early so you can check your sound before it starts.</p>`
    : `<p style="margin:20px 0 0;font-size:14px;color:${COLORS.muted};">Put it in your calendar now if you haven't. The invite is attached to your confirmation email.</p>`;

  const body = `<p style="margin:0 0 12px;">Hi ${esc(firstName(registrant.name))},</p>
<p style="margin:0;">${soon ? "" : "A quick reminder: "}<strong>${esc(title)}</strong> starts ${esc(inWords)}.</p>
${whenHtml}
${joinHtml}
${tip}
<p style="margin:28px 0 0;font-size:14px;">Session page: <a href="${esc(link)}" style="color:${COLORS.button};">${esc(link.replace("https://", ""))}</a></p>`;

  const footer = `You're receiving this because ${esc(registrant.email)} was registered for "${esc(title)}" on webinarstackai.com.${presenter ? ` Replying to this email reaches ${esc(presenter)}.` : ""}<br>Sent by ${esc(BRAND.product)}.`;

  const text = [
    `Hi ${firstName(registrant.name)},`,
    "",
    `${soon ? "" : "A quick reminder: "}"${title}" starts ${inWords}.`,
    ...(when ? ["", `When: ${when.date}, ${when.time}`, ...(presenter ? [`Hosted by: ${presenter}`] : [])] : []),
    "",
    joinUrl ? `Join the session: ${joinUrl}` : "The host will share the link to join. Keep an eye on your inbox.",
    "",
    `Session page: ${link}`,
    "",
    "--",
    `You're receiving this because ${registrant.email} was registered for "${title}" on webinarstackai.com.`,
    `Sent by ${BRAND.product}.`,
  ].join("\n");

  return {
    fromName: senderName(webinar.presenter_name),
    subject,
    html: layout({ preheader, body, footer }),
    text,
    attachments: [],
  };
}

/**
 * The owner's morning summary of new registrations across their webinars.
 * `total` is optional: the summary is built from the email log, which knows
 * the day's registrations but not each webinar's all-time count.
 * @param {{ownerName: string, groups: Array<{webinar: object, fresh: Array<{name: string, email: string}>, total?: number}>}} input
 */
function digestEmail({ ownerName, groups }) {
  const MAX_LISTED = 25;
  const newCount = groups.reduce((n, g) => n + g.fresh.length, 0);
  const subject = `${newCount} new registration${newCount === 1 ? "" : "s"} since yesterday`;
  const preheader = groups
    .map((g) => `${clip(g.webinar.title, 40)}: ${g.fresh.length} new`)
    .join(" · ");

  const sections = groups
    .map((g) => {
      const title = clip(g.webinar.title, 120) || "Untitled webinar";
      const listUrl = `${BRAND.site}/provider/webinars/edit?id=${encodeURIComponent(g.webinar.id)}&tab=registrants`;
      const listed = g.fresh.slice(0, MAX_LISTED);
      const more = g.fresh.length - listed.length;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${COLORS.rule};border-radius:10px;">
<tr><td style="padding:16px 18px;">
<div style="font-size:16px;font-weight:700;">${esc(title)}</div>
<div style="margin-top:2px;font-size:13px;color:${COLORS.muted};">${g.fresh.length} new${typeof g.total === "number" ? ` · ${g.total} total` : ""}</div>
<ul style="margin:12px 0 0;padding-left:18px;font-size:14px;">${listed
        .map((r) => `<li style="margin:0 0 4px;">${esc(clip(r.name, 80))} <span style="color:${COLORS.muted};">${esc(r.email)}</span></li>`)
        .join("")}${more > 0 ? `<li style="color:${COLORS.muted};">and ${more} more</li>` : ""}</ul>
<p style="margin:12px 0 0;font-size:14px;"><a href="${esc(listUrl)}" style="color:${COLORS.button};">See everyone who registered</a></p>
</td></tr></table>`;
    })
    .join("");

  const body = `<p style="margin:0 0 6px;">Good morning ${esc(firstName(ownerName))},</p>
<p style="margin:0 0 22px;">${newCount === 1 ? "One person" : `${newCount} people`} registered for your webinars in the last 24 hours.</p>
${sections}`;

  const footer = `You're getting this daily summary because you run webinars on ${esc(BRAND.product)}. It's only sent on days when someone registers.`;

  const text = [
    `Good morning ${firstName(ownerName)},`,
    "",
    `${newCount} new registration${newCount === 1 ? "" : "s"} in the last 24 hours.`,
    "",
    ...groups.flatMap((g) => [
      `${clip(g.webinar.title, 120)} (${g.fresh.length} new${typeof g.total === "number" ? `, ${g.total} total` : ""})`,
      ...g.fresh.slice(0, MAX_LISTED).map((r) => `- ${clip(r.name, 80)} <${r.email}>`),
      ...(g.fresh.length > MAX_LISTED ? [`- and ${g.fresh.length - MAX_LISTED} more`] : []),
      `See everyone: ${BRAND.site}/provider/webinars/edit?id=${encodeURIComponent(g.webinar.id)}&tab=registrants`,
      "",
    ]),
    "--",
    `You're getting this daily summary because you run webinars on ${BRAND.product}. It's only sent on days when someone registers.`,
  ].join("\n");

  return {
    fromName: BRAND.product,
    subject,
    html: layout({ preheader, body, footer }),
    text,
    attachments: [],
  };
}

/**
 * Sent once, the first time a genuinely new account signs in.
 * @param {{name: string, email: string}} input
 */
function welcomeEmail({ name, email }) {
  const steps = [
    ["Find your ideal buyer", "Brainstorm with the AI in Webinar Chat and build a buyer blueprint.", "/provider/webinar-chat"],
    ["Shape your offer", "Turn that blueprint into a clear, priced offer in Webinar Offer.", "/provider/webinar-offer"],
    ["Create your presentation", "Generate a slide deck in Webinar Content, then download it as PowerPoint or PDF.", "/provider/webinar-content"],
    ["Add your brand", "Upload your logo, colours and documents so everything looks like you.", "/provider/webinar-upload"],
    ["Get registrations", "Publish a registration page with a live countdown and share the link.", "/provider/webinars"],
  ];

  const subject = `Welcome to ${BRAND.product}, ${firstName(name)}`;
  const preheader = "Here's how to go from idea to a webinar people sign up for.";

  const stepsHtml = steps
    .map(([title, text, path], i) => `<tr>
<td valign="top" style="padding:0 12px 16px 0;width:28px;">
<div style="width:26px;height:26px;border-radius:13px;background:${COLORS.button};color:#ffffff;font:700 13px/26px Arial,Helvetica,sans-serif;text-align:center;">${i + 1}</div>
</td>
<td valign="top" style="padding:0 0 16px;">
<a href="${esc(BRAND.site + path)}" style="font-weight:700;color:${COLORS.ink};text-decoration:none;">${esc(title)}</a>
<div style="font-size:14px;color:${COLORS.muted};">${esc(text)}</div>
</td></tr>`)
    .join("");

  const body = `<p style="margin:0 0 12px;">Hi ${esc(firstName(name))},</p>
<p style="margin:0 0 22px;">Welcome to ${esc(BRAND.product)}. Everything you need to plan, build and fill a webinar is in one place. Here's what you can do:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stepsHtml}</table>
${button(`${BRAND.site}/provider`, "Open your workspace")}
<p style="margin:22px 0 0;font-size:14px;color:${COLORS.muted};">Tip: start with Webinar Chat. Everything you tell it carries through to your offer and your slides.</p>`;

  const footer = `You're receiving this because ${esc(email)} was used to create an account at webinarstackai.com.<br>Sent by ${esc(BRAND.product)}, ${esc(BRAND.company)}.`;

  const text = [
    `Hi ${firstName(name)},`,
    "",
    `Welcome to ${BRAND.product}. Here's what you can do:`,
    "",
    ...steps.map(([title, line, path], i) => `${i + 1}. ${title}: ${line}\n   ${BRAND.site}${path}`),
    "",
    `Open your workspace: ${BRAND.site}/provider`,
    "",
    "Tip: start with Webinar Chat. Everything you tell it carries through to your offer and your slides.",
    "",
    "--",
    `You're receiving this because ${email} was used to create an account at webinarstackai.com.`,
    `Sent by ${BRAND.product}, ${BRAND.company}.`,
  ].join("\n");

  return {
    fromName: BRAND.product,
    subject,
    html: layout({ preheader, body, footer }),
    text,
    attachments: [],
  };
}

function unsubscribeLinks(uid, token) {
  const q = `u=${encodeURIComponent(uid)}&t=${encodeURIComponent(token)}`;
  return {
    // A page that asks the person to confirm. Never unsubscribe on a plain
    // GET: mail scanners pre-open links. (The one-click List-Unsubscribe
    // header is not used: n8n's Gmail node cannot set custom headers.)
    page: `${BRAND.site}/unsubscribe?${q}`,
  };
}

/** Escapes, then links bare https URLs. Only for admin-written text. */
function linkify(escapedText) {
  return escapedText.replace(
    /https:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]/g,
    (url) => `<a href="${url}" style="color:${COLORS.button};">${url}</a>`,
  );
}

/**
 * An admin's announcement to users. The message is plain text: blank lines
 * become paragraphs, https links become clickable, and {first_name} is
 * replaced per recipient.
 * @param {{subject: string, message: string, recipient: {uid: string, name: string, email: string, token: string}}} input
 */
function broadcastEmail({ subject, message, recipient }) {
  const personalise = (s) => String(s ?? "").replace(/\{first_name\}/g, firstName(recipient.name));
  const cleanSubject = clip(personalise(subject), 150);
  const paragraphs = personalise(message)
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const links = unsubscribeLinks(recipient.uid, recipient.token);

  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px;">${linkify(esc(p)).replace(/\n/g, "<br>")}</p>`)
    .join("");

  const identity = [BRAND.company, BRAND.postalAddress].filter(Boolean).map(esc).join(", ");
  const footer = `You're receiving this because you have a ${esc(BRAND.product)} account.<br><a href="${esc(links.page)}" style="color:${COLORS.muted};">Unsubscribe from these emails</a> · ${identity}`;

  const text = [
    ...paragraphs,
    "",
    "--",
    `You're receiving this because you have a ${BRAND.product} account.`,
    `Unsubscribe: ${links.page}`,
    [BRAND.company, BRAND.postalAddress].filter(Boolean).join(", "),
  ].join("\n\n").replace(/\n{3,}/g, "\n\n");

  return {
    fromName: BRAND.product,
    subject: cleanSubject,
    html: layout({ preheader: paragraphs[0] ? clip(paragraphs[0], 110) : cleanSubject, body, footer }),
    text,
    attachments: [],
  };
}

// Exported for the local preview/test script and the admin preview; n8n ignores this.
if (typeof module !== "undefined") {
  module.exports = {
    confirmationEmail, reminderEmail, digestEmail, welcomeEmail, broadcastEmail, unsubscribeLinks,
    gmailPayload,
    senderName, safeTimezone, sessionParts, esc, toBase64,
  };
}
