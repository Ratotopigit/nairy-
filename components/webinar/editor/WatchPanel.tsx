"use client";

import { useId, useState } from "react";
import { CalendarPlus, Check, Copy, RotateCcw, Video } from "lucide-react";
import { Divider, Field, INPUT, MoreOptions, Section } from "@/components/webinar/editor/controls";
import { DateLengthFields, JoinLinkField, durationLabel } from "@/components/webinar/editor/EditorPanels";
import { ChoiceGroup, VideoLinkField, useSwitchGuard } from "@/components/webinar/editor/SetupPanel";
import { googleCalendarUrl } from "@/lib/calendar";
import { viewUrl } from "@/components/webinar/blocks/watch-link";
import { isHex } from "@/lib/color";
import { BLOCK_LIMITS, REPLAY_EXPIRY_OPTIONS, safeHttpsUrl, type WatchRoom } from "@/lib/page-blocks";
import { calendarEvent, isValidJoinUrl, isValidVideoUrl, sessionStart, type Webinar } from "@/lib/webinars";

/** Compact colour control; "" = the template's colour. */
function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const shown = isHex(value) ? value : "#ffffff";
  return (
    <div className="flex items-center gap-3">
      <label className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border-strong focus-within:ring-2 focus-within:ring-primary/30" style={{ background: value ? shown : undefined }}>
        <input type="color" value={shown} onChange={(e) => onChange(e.target.value.toLowerCase())} aria-label={label} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </label>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{value ? value.toUpperCase() : "Template colour"}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange("")}
        disabled={!value}
        aria-label={`Reset ${label} to the template colour`}
        title="Reset to the template colour"
        className="grid size-11 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-30"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={url} aria-label={`${label} link`} className={`${INPUT} min-w-0`} onFocus={(e) => e.target.select()} />
      <button
        type="button"
        onClick={() => void navigator.clipboard?.writeText(url).then(() => setCopied(true), () => undefined)}
        aria-label={`Copy the ${label} link`}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-border-strong bg-card px-4 text-sm font-semibold transition-colors hover:bg-secondary"
      >
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function expiryLabel(days: number): string {
  return days === 0 ? "Never" : `${days} day${days === 1 ? "" : "s"} after the session`;
}

export function WatchPanel({ w, update }: { w: Webinar; update: <K extends keyof Webinar>(key: K, value: Webinar[K]) => void }) {
  const room = w.watch_room;
  const set = <K extends keyof WatchRoom>(key: K, value: WatchRoom[K]) => update("watch_room", { ...room, [key]: value });
  // The offer link is stored as typed so the error can show; coerceWatchRoom drops a non-https one on load.
  const offerInvalid = Boolean(room.offer_url) && !safeHttpsUrl(room.offer_url);
  const replayInvalid = Boolean(w.replay_url) && !isValidVideoUrl(w.replay_url);
  const offerHintId = useId();
  const replayHintId = useId();
  const automated = w.delivery_type === "automated";
  // An old document could hold a value that isn't one of the options.
  const expiryOptions = REPLAY_EXPIRY_OPTIONS.includes(w.replay_expires_days as never) ? REPLAY_EXPIRY_OPTIONS : [...REPLAY_EXPIRY_OPTIONS, w.replay_expires_days];

  return (
    <div className="space-y-7">
      <Section title="Offer button" hint="Optional. A button for what you are selling, shown under the session.">
        <Field label="Button text">
          <input value={room.offer_label} onChange={(e) => set("offer_label", e.target.value)} maxLength={BLOCK_LIMITS.label} placeholder="Get the special offer" className={INPUT} />
        </Field>
        <Field
          label="Button link"
          hintId={offerHintId}
          hint={offerInvalid ? "That doesn't look like a secure link. It should start with https://" : "The button shows only when both the text and the link are set."}
        >
          <input
            value={room.offer_url}
            onChange={(e) => set("offer_url", e.target.value.trim())}
            maxLength={BLOCK_LIMITS.url}
            inputMode="url"
            placeholder="https://…"
            aria-invalid={offerInvalid}
            aria-describedby={offerInvalid ? offerHintId : undefined}
            className={`${INPUT} ${offerInvalid ? "border-red-300" : ""}`}
          />
        </Field>
      </Section>

      <Divider />

      <Section title="Replay" hint="The recording for anyone who missed the session.">
        {w.access_type === "paid" ? (
          <p className="text-sm text-muted-foreground">Paid webinars don&apos;t show a replay on the public page; buyers get the recording through your checkout.</p>
        ) : (
          <Field
            label="Replay video link"
            hintId={replayHintId}
            hint={replayInvalid ? "Use a public YouTube or Vimeo video link, like https://www.youtube.com/watch?v=… or https://vimeo.com/123456" : "YouTube or Vimeo. Until you add it, the page says the replay isn't available yet."}
          >
            <input
              value={w.replay_url}
              onChange={(e) => update("replay_url", e.target.value.trim())}
              maxLength={BLOCK_LIMITS.url}
              inputMode="url"
              placeholder="https://www.youtube.com/watch?v=…"
              aria-invalid={replayInvalid}
              aria-describedby={replayInvalid ? replayHintId : undefined}
              className={`${INPUT} ${replayInvalid ? "border-red-300" : ""}`}
            />
          </Field>
        )}
        {automated ? <p className="text-sm text-muted-foreground">Recorded webinars have no end time, so the replay never expires.</p> : null}
      </Section>

      <MoreOptions label="More options: wording, timing, colours and links">
        <Field label="Watch room headline" hint="Standard design only. Leave empty to use your webinar title.">
          <input value={room.headline} onChange={(e) => set("headline", e.target.value)} maxLength={BLOCK_LIMITS.heading} placeholder={w.title} className={INPUT} />
        </Field>
        {!automated ? (
          <Field label="Waiting message" hint="Shown with a countdown until the session starts.">
            <textarea value={room.waiting_text} onChange={(e) => set("waiting_text", e.target.value)} maxLength={300} rows={2} className={`${INPUT} resize-none`} />
          </Field>
        ) : null}
        <Field
          label="Show the offer button after (minutes)"
          hint={`Standard design only. ${automated ? "Counted from when the visitor opens the page." : "Counted from the start of the session."}`}
        >
          <input
            type="number"
            min={0}
            max={600}
            value={room.offer_after_min}
            onChange={(e) => set("offer_after_min", Math.max(0, Math.min(600, Math.round(Number(e.target.value) || 0))))}
            className={INPUT}
          />
        </Field>
        <ColorInput label="Watch room background" value={room.bg} onChange={(v) => set("bg", v)} />
        <ColorInput label="Watch room button colour" value={room.accent} onChange={(v) => set("accent", v)} />
        {automated ? null : (
          <Field label="Replay stops working">
            <select value={w.replay_expires_days} onChange={(e) => update("replay_expires_days", Number(e.target.value))} className={INPUT}>
              {expiryOptions.map((d) => (
                <option key={d} value={d}>
                  {expiryLabel(d)}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="space-y-2">
          <p className="text-sm font-semibold">Watch room link</p>
          <CopyLink label="watch room" url={viewUrl(w, "watch")} />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Replay link</p>
          <CopyLink label="replay" url={viewUrl(w, "replay")} />
        </div>
      </MoreOptions>
    </div>
  );
}

// ── How people watch, and when ────────────────────────────────────────────

const WATCH_OPTIONS = [
  { value: "live", label: "Live on Zoom, Google Meet or Teams", blurb: "You present at a set time. People join with your meeting link." },
  { value: "automated", label: "Recorded video", blurb: "People watch your video whenever they like." },
] as const;

const HELPER_BTN =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border-strong bg-card px-4 py-2.5 text-base font-medium transition-colors hover:bg-secondary";

type HowWhenProps = {
  w: Webinar;
  update: <K extends keyof Webinar>(key: K, value: Webinar[K]) => void;
  /** The private meeting link: the editor page's own state and autosave, shared with step 2. */
  joinUrl: string;
  setJoinUrl: (v: string) => void;
  joinInvalid: boolean;
  joinState: "idle" | "saving" | "saved" | "error";
  timezone: string;
};

/** "Tuesday 11 November, 10:00 (your time), 1 hour", or null without a date. */
function sessionSummary(w: Webinar): string | null {
  const start = sessionStart(w);
  if (!start) return null;
  const day = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(start);
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(start);
  return `${day}, ${time} (your time), ${durationLabel(w.duration_minutes)}`;
}

/** Step 3's first two sections: live or recorded with its link, then the date for a live one. */
export function WatchHowWhen({ w, update, joinUrl, setJoinUrl, joinInvalid, joinState, timezone }: HowWhenProps) {
  const { allowSwitch, refusal } = useSwitchGuard(w);
  const live = w.delivery_type !== "automated";
  const summary = live ? sessionSummary(w) : null;
  // The host's own calendar entry: the only place the meeting link goes with it.
  const event = summary ? calendarEvent(w, isValidJoinUrl(joinUrl.trim()) ? joinUrl.trim() : null) : null;

  return (
    <div className="space-y-7">
      <Section title="How people watch" hint="Pick one. The page and emails change to match.">
        {refusal}
        <ChoiceGroup
          legend="Choose one"
          value={w.delivery_type}
          options={WATCH_OPTIONS}
          onChange={(v) => {
            if (allowSwitch({ access_type: w.access_type, delivery_type: v })) update("delivery_type", v);
          }}
        />
        {live ? (
          <>
            <JoinLinkField joinUrl={joinUrl} setJoinUrl={setJoinUrl} joinInvalid={joinInvalid} joinState={joinState} />
            <p className="text-xs leading-5 text-muted-foreground">
              {w.access_type === "paid"
                ? "Visitors never see this. Buyers don't get the meeting link from us: send it from your checkout confirmation."
                : "Visitors never see this. Only people who sign up get it, in their emails and calendar invite."}
            </p>
          </>
        ) : (
          <VideoLinkField w={w} update={update} />
        )}
      </Section>

      {live ? (
        <>
          <Divider />
          <Section title="When it is" hint="Set the day, time and length of your session.">
            {summary ? (
              <p className="rounded-xl border border-border bg-card px-4 py-3 text-base font-semibold">{summary}</p>
            ) : (
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-900">
                No date yet. Pick the day and time below so people know when to come.
              </p>
            )}
            <DateLengthFields w={w} update={update} timezone={timezone} />
            <div className="grid gap-2 sm:grid-cols-2">
              {event ? (
                <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className={HELPER_BTN}>
                  <CalendarPlus className="size-5" aria-hidden="true" />
                  Add to my Google Calendar
                </a>
              ) : null}
              <a href="https://zoom.us/meeting/schedule" target="_blank" rel="noopener noreferrer" className={HELPER_BTN}>
                <Video className="size-5" aria-hidden="true" />
                Create a Zoom meeting
              </a>
            </div>
            <p className="text-sm text-muted-foreground">Paste the meeting link above once it&apos;s made.</p>
          </Section>
        </>
      ) : null}
    </div>
  );
}
