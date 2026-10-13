/**
 * "Add to calendar" for the registration success screen: Google, Outlook and
 * an .ics file (Apple Calendar, and Outlook desktop). Pure functions.
 *
 * The visitor's own join link is passed in only after they have registered
 * (see lib/webinars.ts: fetchJoinInfo). Without it the entries still carry
 * the page link and a note that the join link is in their confirmation
 * email, so nothing private is ever put on the public page.
 */

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  /** ISO 8601 start. */
  start: string;
  /** ISO 8601 end. */
  end: string;
  /** Public page for the webinar. */
  pageUrl: string;
  /** The attendee join link (Zoom, Meet, Teams), once known. */
  joinUrl?: string;
  hostName?: string;
};

const NOTE_NO_LINK = "Your join link is in your confirmation email.";

function stamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Event description: what it is, how to join, where the page lives. */
export function eventDescription(e: CalendarEvent): string {
  return [
    e.description.trim(),
    e.joinUrl ? `Join here: ${e.joinUrl}` : NOTE_NO_LINK,
    e.hostName ? `Hosted by ${e.hostName}` : "",
    `Event page: ${e.pageUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.start)}/${stamp(e.end)}`,
    details: eventDescription(e),
  });
  if (e.joinUrl) params.set("location", e.joinUrl);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Outlook.com / Microsoft 365 web "add event" deep link. */
export function outlookCalendarUrl(e: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: e.title,
    startdt: new Date(e.start).toISOString(),
    enddt: new Date(e.end).toISOString(),
    body: eventDescription(e),
  });
  if (e.joinUrl) params.set("location", e.joinUrl);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/[,;]/g, (m) => `\\${m}`).replace(/\r?\n/g, "\\n");
}

/** RFC 5545 content lines are limited to 75 octets; longer ones are folded. */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    parts.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

/** An .ics file body, with reminders an hour and ten minutes before. */
export function icsFile(e: CalendarEvent): string {
  const alarm = (before: string) => [
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(e.title)}`,
    `TRIGGER:-${before}`,
    "END:VALARM",
  ];
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Webinar Stack//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}-${stamp(e.start)}@webinarstackai.com`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${icsText(e.title)}`,
    `DESCRIPTION:${icsText(eventDescription(e))}`,
    ...(e.joinUrl ? [`LOCATION:${icsText(e.joinUrl)}`] : []),
    `URL:${e.joinUrl || e.pageUrl}`,
    ...alarm("PT1H"),
    ...alarm("PT10M"),
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");
}

/** Triggers a download of the .ics in the browser. */
export function downloadIcs(e: CalendarEvent, filename = "webinar.ics"): void {
  const url = URL.createObjectURL(new Blob([icsFile(e)], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
