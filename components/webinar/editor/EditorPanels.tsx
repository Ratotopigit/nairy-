"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Check, Plus, RotateCcw, X } from "lucide-react";
import { Divider, Field, INPUT, MoreOptions, Section } from "@/components/webinar/editor/controls";
import { ImageSlot } from "@/components/webinar/editor/ImageSlot";
import { FONT_PAIRS } from "@/lib/webinar-fonts";
import { isHex } from "@/lib/color";
import { COPY_FIELDS, COPY_GROUPS, copyOf } from "@/lib/training-copy";
import {
  COLOR_PRESETS,
  FONT_PAIR_CATALOG,
  FONT_PAIR_IDS,
  LAYOUT_LABELS,
  getTemplate,
  resolveFontPairId,
  resolvePalette,
  templatesInCategory,
  type LayoutId,
} from "@/lib/webinar-templates";
import {
  DURATION_OPTIONS,
  WEBINAR_LIMITS,
  type Webinar,
} from "@/lib/webinars";

export type PanelProps = {
  w: Webinar;
  update: <K extends keyof Webinar>(key: K, value: Webinar[K]) => void;
  notify: (message: string | null) => void;
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = minutes / 60;
  return `${h} hour${h === 1 ? "" : "s"}`;
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-[11px] tabular-nums ${value.length > max * 0.9 ? "text-amber-700" : "text-muted-foreground"}`}>
      {value.length}/{max}
    </span>
  );
}

// ── Content ───────────────────────────────────────────────────────────────

type ContentProps = PanelProps & {
  joinUrl: string;
  setJoinUrl: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  joinInvalid: boolean;
  joinState: "idle" | "saving" | "saved" | "error";
  timezone: string;
};

/** Date, time and length of a live session. Used here and in the Watch step. */
export function DateLengthFields({ w, update, timezone }: Pick<PanelProps, "w" | "update"> & { timezone: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
      <Field label="Date and time" hint={`In your timezone (${timezone}). Visitors see it in theirs.`}>
        <input
          type="datetime-local"
          value={toLocalInput(w.next_session_at)}
          onChange={(e) => update("next_session_at", e.target.value ? new Date(e.target.value).toISOString() : "")}
          className={INPUT}
        />
      </Field>
      <Field label="Length">
        <select value={w.duration_minutes} onChange={(e) => update("duration_minutes", Number(e.target.value))} className={INPUT}>
          {DURATION_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {durationLabel(m)}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

type JoinProps = Pick<ContentProps, "joinUrl" | "setJoinUrl" | "joinInvalid" | "joinState">;

/** The private meeting link (webinars/{id}/private/session); the editor page holds its state and saves it. */
export function JoinLinkField({ joinUrl, setJoinUrl, joinInvalid, joinState }: JoinProps) {
  const joinHintId = useId();
  return (
    <Field
      label="Meeting link (Zoom, Google Meet or Teams)"
      hintId={joinHintId}
      hint={
        joinInvalid
          ? "That doesn't look like a link. It should start with https://"
          : joinState === "error"
            ? "Your meeting link and notes couldn't be saved. Check your internet connection and try again."
            : joinState === "saving"
              ? "Saving…"
              : "Paste the link your guests use to join, not your own “start meeting” link."
      }
    >
      <input
        value={joinUrl}
        onChange={(e) => setJoinUrl(e.target.value)}
        maxLength={WEBINAR_LIMITS.joinUrl}
        inputMode="url"
        placeholder="https://zoom.us/j/…"
        aria-invalid={joinInvalid}
        aria-describedby={joinInvalid ? joinHintId : undefined}
        className={`${INPUT} ${joinInvalid ? "border-red-300" : ""}`}
      />
    </Field>
  );
}

export function ContentPanel({ w, update, joinUrl, setJoinUrl, notes, setNotes, joinInvalid, joinState, timezone }: ContentProps) {
  return (
    <div className="space-y-7">
      <Section title="Your webinar">
        <Field label="Headline" right={<Counter value={w.title} max={WEBINAR_LIMITS.title} />}>
          <textarea value={w.title} onChange={(e) => update("title", e.target.value)} maxLength={WEBINAR_LIMITS.title} rows={2} className={`${INPUT} resize-none`} />
        </Field>
        <Field label="Short description" right={<Counter value={w.subtitle} max={WEBINAR_LIMITS.subtitle} />}>
          <textarea value={w.subtitle} onChange={(e) => update("subtitle", e.target.value)} maxLength={WEBINAR_LIMITS.subtitle} rows={3} className={`${INPUT} resize-none`} />
        </Field>
        {w.delivery_type !== "automated" ? <DateLengthFields w={w} update={update} timezone={timezone} /> : null}
      </Section>

      <Divider />

      <Section title="What they'll learn" hint="Three short outcomes work best. You can add up to five.">
        <div className="space-y-2">
          {w.bullets.map((bullet, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={bullet}
                maxLength={WEBINAR_LIMITS.bullet}
                onChange={(e) => update("bullets", w.bullets.map((b, j) => (j === i ? e.target.value : b)))}
                aria-label={`Outcome ${i + 1}`}
                className={INPUT}
              />
              <button
                type="button"
                onClick={() => update("bullets", w.bullets.filter((_, j) => j !== i))}
                aria-label={`Remove outcome ${i + 1}`}
                title="Remove this line"
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-border-strong text-muted-foreground transition-colors hover:bg-secondary"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
          ))}
          {w.bullets.length < WEBINAR_LIMITS.bullets ? (
            <button type="button" onClick={() => update("bullets", [...w.bullets, ""])} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-strong bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
              <Plus className="size-4" aria-hidden="true" />
              Add another line
            </button>
          ) : null}
        </div>
      </Section>

      <Divider />

      <Section title="Host">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Host name">
            <input value={w.presenter_name} onChange={(e) => update("presenter_name", e.target.value)} maxLength={60} placeholder="Amelia Harlow" className={INPUT} />
          </Field>
          <Field label="Title">
            <input value={w.presenter_title} onChange={(e) => update("presenter_title", e.target.value)} maxLength={WEBINAR_LIMITS.hostTitle} placeholder="Founder, Harlow & Co." className={INPUT} />
          </Field>
        </div>
      </Section>

      <Divider />

      <Section
        title="Private to you"
        hint={
          w.delivery_type === "automated"
            ? "Visitors never see this."
            : w.access_type === "paid"
            ? "Visitors never see this. Buyers don't get the meeting link from us: send it from your checkout confirmation."
            : "Visitors never see this. Only people who sign up get the meeting link, in their confirmation email, reminders and calendar invite."
        }
      >
        {w.delivery_type !== "automated" ? <JoinLinkField joinUrl={joinUrl} setJoinUrl={setJoinUrl} joinInvalid={joinInvalid} joinState={joinState} /> : null}
      </Section>

      <MoreOptions label="More options: bio, button text and notes">
        <Field label="Short bio" hint="Optional. Hidden on the page while empty." right={<Counter value={w.host_bio} max={WEBINAR_LIMITS.hostBio} />}>
          <textarea value={w.host_bio} onChange={(e) => update("host_bio", e.target.value)} maxLength={WEBINAR_LIMITS.hostBio} rows={3} className={`${INPUT} resize-none`} />
        </Field>
        <Field label="One line of social proof" hint="Optional and genuine, e.g. “Trusted by 1,200 founders”. Hidden while empty." right={<Counter value={w.social_proof} max={WEBINAR_LIMITS.socialProof} />}>
          <input value={w.social_proof} onChange={(e) => update("social_proof", e.target.value)} maxLength={WEBINAR_LIMITS.socialProof} className={INPUT} />
        </Field>
        <Field label="Sign-up button text">
          <input value={w.cta_label} onChange={(e) => update("cta_label", e.target.value)} maxLength={40} className={INPUT} />
        </Field>
        <Field label="Notes for you" hint="Only you see these. Say what this webinar is for; it also helps when you @mention it in AI Chat.">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={WEBINAR_LIMITS.notes} rows={2} className={`${INPUT} resize-none`} />
        </Field>
      </MoreOptions>
    </div>
  );
}

// ── Brand ─────────────────────────────────────────────────────────────────

function ColorField({
  label,
  hint,
  value,
  fallback,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  fallback: string;
  onChange: (v: string) => void;
}) {
  const shown = isHex(value) ? value : fallback;
  const [draft, setDraft] = useState(shown);
  useEffect(() => setDraft(shown), [shown]);
  return (
    <div className="flex items-center gap-3">
      <label className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border-strong" style={{ background: shown }}>
        <input type="color" value={shown} onChange={(e) => onChange(e.target.value.toLowerCase())} aria-label={label} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </label>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      <input
        value={draft}
        onChange={(e) => {
          const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
          setDraft(v);
          if (isHex(v)) onChange(v.toLowerCase());
        }}
        onBlur={() => setDraft(shown)}
        maxLength={7}
        spellCheck={false}
        aria-label={`${label} hex code`}
        className="h-11 w-[6rem] rounded-lg border border-border-strong bg-card px-2 font-mono text-sm uppercase outline-none focus:border-primary"
      />
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

type BrandProps = PanelProps & { onError: (m: string) => void };

export function BrandPanel({ w, update, notify, onError }: BrandProps) {
  const t = getTemplate(w.template_id);
  const defaults = resolvePalette(t, {});
  const active = resolveFontPairId(t, w.font_pair);
  const customised = Boolean(w.theme_bg || w.theme_ink || w.theme_brand || w.theme_accent);

  function applyPreset(p: (typeof COLOR_PRESETS)[number]) {
    update("theme_bg", p.bg.toLowerCase());
    update("theme_ink", p.ink.toLowerCase());
    update("theme_brand", p.brand.toLowerCase());
    update("theme_accent", p.accent.toLowerCase());
    notify(null);
  }

  return (
    <div className="space-y-7">
      <Section title="Your brand" hint="Shown at the top of your page in place of any platform branding.">
        <Field label="Business or brand name" right={<Counter value={w.brand_name} max={WEBINAR_LIMITS.brandName} />}>
          <input value={w.brand_name} onChange={(e) => update("brand_name", e.target.value)} maxLength={WEBINAR_LIMITS.brandName} placeholder="Harlow & Co." className={INPUT} />
        </Field>
        <Field label="Tagline" hint="Optional. Hidden while empty." right={<Counter value={w.brand_tagline} max={WEBINAR_LIMITS.brandTagline} />}>
          <input value={w.brand_tagline} onChange={(e) => update("brand_tagline", e.target.value)} maxLength={WEBINAR_LIMITS.brandTagline} className={INPUT} />
        </Field>
        <ImageSlot
          webinarId={w.id}
          kind="logo"
          label="Logo"
          hint="Replaces the name text. A PNG with a transparent background works best."
          url={w.logo_url}
          onChange={(u) => update("logo_url", u)}
          onError={onError}
        />
      </Section>

      <MoreOptions label="More options: colours and fonts">
      <Section title="Colours" hint="Start from a palette, or set your own. Text and buttons adjust automatically so everything stays readable.">
        <div className="grid grid-cols-2 gap-2">
          {COLOR_PRESETS.map((p) => {
            const selected = [p.bg, p.ink, p.brand, p.accent].every((c, i) => c.toLowerCase() === [w.theme_bg, w.theme_ink, w.theme_brand, w.theme_accent][i]);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                aria-pressed={selected}
                className={`flex min-h-12 items-center gap-2.5 rounded-xl border p-2 text-left transition-colors hover:bg-secondary ${selected ? "border-[#2563eb] ring-2 ring-[#2563eb]" : "border-border"}`}
              >
                <span className="grid size-9 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-md border border-border-strong">
                  <span style={{ background: p.bg }} />
                  <span style={{ background: p.brand }} />
                  <span style={{ background: p.ink }} />
                  <span style={{ background: p.accent }} />
                </span>
                <span className="min-w-0 text-sm font-medium leading-tight">{p.name}</span>
                {selected ? <Check className="ml-auto size-3.5 shrink-0" /> : null}
              </button>
            );
          })}
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-3.5">
          <ColorField label="Background" hint="The page" value={w.theme_bg} fallback={defaults.bg} onChange={(v) => update("theme_bg", v)} />
          <ColorField label="Text" hint="Headlines and body" value={w.theme_ink} fallback={defaults.ink} onChange={(v) => update("theme_ink", v)} />
          <ColorField label="Brand" hint="Banners, numbers, accents" value={w.theme_brand} fallback={defaults.brand} onChange={(v) => update("theme_brand", v)} />
          <ColorField label="Button" hint="The register button" value={w.theme_accent} fallback={defaults.accent} onChange={(v) => update("theme_accent", v)} />
        </div>
        {customised ? (
          <button
            type="button"
            onClick={() => {
              update("theme_bg", "");
              update("theme_ink", "");
              update("theme_brand", "");
              update("theme_accent", "");
            }}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline underline-offset-2"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Back to this template&apos;s own colours
          </button>
        ) : null}
      </Section>

      <Divider />

      <Section title="Fonts" hint="Each choice pairs a headline font with a text font that look good together.">
        <div className="grid grid-cols-1 gap-2">
          {FONT_PAIR_IDS.map((id) => {
            const selected = id === active;
            const isTemplateDefault = id === t.fonts;
            return (
              <button
                key={id}
                type="button"
                onClick={() => update("font_pair", id === t.fonts ? "" : id)}
                aria-pressed={selected}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-secondary ${selected ? "border-[#2563eb] ring-2 ring-[#2563eb]" : "border-border"}`}
              >
                <span className="w-12 shrink-0 text-3xl leading-none" style={{ fontFamily: FONT_PAIRS[id].heading, fontWeight: FONT_PAIRS[id].headingWeight }}>
                  Aa
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {FONT_PAIR_CATALOG[id].label}
                    {isTemplateDefault ? <span className="ml-2 text-xs font-normal text-muted-foreground">(design default)</span> : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground" style={{ fontFamily: FONT_PAIRS[id].body }}>
                    {FONT_PAIR_CATALOG[id].note}
                  </span>
                </span>
                {selected ? <Check className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </Section>
      </MoreOptions>
    </div>
  );
}

// ── Images ────────────────────────────────────────────────────────────────

const HERO_USE: Record<LayoutId, string> = {
  editorial: "Shown beside your registration form.",
  photo: "The full-width photograph your headline sits on. This template is built around it.",
  minimal: "A wide strip under the form. Optional; the page looks complete without it.",
  host: "A soft photo behind the banner, under your brand colour.",
  asymmetric: "The large offset image next to your headline.",
  split: "Fills the coloured half behind your headline, under your brand colour.",
  poster: "A wide band between the headline and the details. Optional.",
  letter: "A photograph set into the letter, under the opening lines. Optional.",
  bento: "The image tile beside the outcomes. Without it the tile shows your initials.",
  agenda: "A wide image under your headline. Optional.",
  card: "The full-page backdrop behind the card, under your brand colour.",
  training: "A faint photo behind the dark headline area. Optional; the page looks complete without it.",
};

const PORTRAIT_USE: Record<LayoutId, string> = {
  editorial: "A small photo beside your name. Also used as the main image if you have no other photo.",
  photo: "A small photo beside your name.",
  minimal: "A small photo beside your name.",
  host: "The large portrait this template is built around.",
  asymmetric: "A small photo beside your name. Also used as the main image if you have no other photo.",
  split: "A small photo beside your name. Also used as the main image if you have no other photo.",
  poster: "A small photo beside your name.",
  letter: "A small photo beside your name. Also used as the main image if you have no other photo.",
  bento: "A small photo beside your name. Also used as the main image if you have no other photo.",
  agenda: "A small photo beside your name. Also used as the main image if you have no other photo.",
  card: "A small photo beside your name. Also used as the main image if you have no other photo.",
  training: "The round photo in the Presented by section.",
};

type ImagesProps = PanelProps & {
  onFind: () => void;
  onSuggest: () => void;
  suggesting: boolean;
  onError: (m: string) => void;
};

export function ImagesPanel({ w, update, onFind, onSuggest, suggesting, onError }: ImagesProps) {
  const layout = getTemplate(w.template_id).layout;
  return (
    <div className="space-y-5">
      <ImageSlot
        webinarId={w.id}
        kind="hero"
        label="Main photo"
        hint={HERO_USE[layout]}
        url={w.image_url}
        focusX={w.image_focus_x}
        focusY={w.image_focus_y}
        onChange={(u) => update("image_url", u)}
        onFocus={(x, y) => {
          update("image_focus_x", x);
          update("image_focus_y", y);
        }}
        onFind={onFind}
        onSuggest={onSuggest}
        suggesting={suggesting}
        onError={onError}
      />
      <ImageSlot
        webinarId={w.id}
        kind="portrait"
        label="Host portrait"
        hint={PORTRAIT_USE[layout]}
        url={w.portrait_url}
        focusX={w.portrait_focus_x}
        focusY={w.portrait_focus_y}
        onChange={(u) => update("portrait_url", u)}
        onFocus={(x, y) => {
          update("portrait_focus_x", x);
          update("portrait_focus_y", y);
        }}
        onError={onError}
      />
      <p className="text-xs text-muted-foreground">
        Your own portrait is uploaded, not searched: a stock photo can&apos;t be you. Images are resized and saved to your account, so they stay put when you switch templates or publish. Photos from search are free for commercial use.
      </p>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────

/** `thanks` = the thank-you page step: only its choices. Otherwise the registration page's template. */
export function LayoutPanel({ w, update, onBrowse, thanks = false }: PanelProps & { onBrowse?: () => void; thanks?: boolean }): ReactNode {
  const t = getTemplate(w.template_id);
  const siblings = templatesInCategory(t.category);
  return (
    <div className="space-y-6">
      {thanks ? null : (
      <Section title="Template" hint="Switching never loses your text, images, brand or colours.">
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t.category}</p>
          <p className="mt-1 text-base font-semibold tracking-[-0.01em]">{t.name}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.description}</p>
          <button type="button" onClick={onBrowse} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90">
            Browse all templates
          </button>
        </div>
      </Section>
      )}

      {!thanks ? null : (
      <Section title="Thank-you page" hint="What people see right after they register. It works with every template.">
        <div className="grid grid-cols-1 gap-2">
          {(
            [
              { id: "", name: "Simple confirmation", blurb: w.delivery_type === "automated" ? "A short “You're registered” card with your video." : "A short “You're registered” card with calendar buttons." },
              { id: "training", name: "Midnight Training thank-you page", blurb: w.delivery_type === "automated" ? "A full page: your video, what you'll learn and an optional offer." : "A full page: seat confirmed, what you'll learn, calendar, join link and an optional offer." },
            ] as const
          ).map((o) => {
            const selected = w.thank_you_template === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => update("thank_you_template", o.id)}
                aria-pressed={selected}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-secondary ${selected ? "border-foreground ring-1 ring-foreground" : "border-border"}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{o.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{o.blurb}</span>
                </span>
                {selected ? <Check className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </Section>
      )}

      {thanks ? null : (
      <Section title={`More in ${t.category}`} hint="Different compositions, in colours chosen for this kind of business.">
        <div className="grid grid-cols-1 gap-2">
          {siblings.map((s) => {
            const selected = s.id === t.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => update("template_id", s.id)}
                aria-pressed={selected}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-secondary ${selected ? "border-foreground ring-1 ring-foreground" : "border-border"}`}
              >
                <span className="grid size-9 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-md border border-border-strong">
                  <span style={{ background: s.seed.bg }} />
                  <span style={{ background: s.seed.brand }} />
                  <span style={{ background: s.seed.ink }} />
                  <span style={{ background: s.seed.accent }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{s.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{LAYOUT_LABELS[s.layout].name}: {LAYOUT_LABELS[s.layout].blurb}</span>
                </span>
                {selected ? <Check className="size-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </Section>
      )}
    </div>
  );
}

// ── Page text (Training templates) ────────────────────────────────────────

/**
 * Every editable line of the Training page (or, with `thanks`, of its thank-you
 * page), grouped by where it appears. The testimonial and footer show on both
 * pages: they are edited with the registration page when it is a Training one.
 */
export function TextPanel({ w, update, thanks = false }: PanelProps & { thanks?: boolean }): ReactNode {
  const onPage = getTemplate(w.template_id).layout === "training";
  const groups = COPY_GROUPS.filter((g) =>
    g.id === "proof" || g.id === "footer" ? (thanks ? !onPage : true) : g.id === "thanks" || g.id === "offer" ? thanks : !thanks,
  );
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Every line is yours to change. Leave a box empty to hide that part of the page, or reset it to bring the original wording back.
      </p>
      {groups.map((g, i) => (
        <div key={g.id} className="space-y-6">
          {i ? <Divider /> : null}
          <Section title={g.title} hint={g.hint}>
            {COPY_FIELDS.filter((f) => f.group === g.id).map((f) => {
              const own = w.page_copy[f.key];
              const value = own ?? copyOf({}, f.key);
              const set = (v: string) => update("page_copy", { ...w.page_copy, [f.key]: v });
              return (
                <Field
                  key={f.key}
                  label={f.label}
                  right={
                    own !== undefined ? (
                      <button
                        type="button"
                        onClick={() => {
                          const { [f.key]: _drop, ...rest } = w.page_copy;
                          void _drop;
                          update("page_copy", rest);
                        }}
                        title="Bring back the original wording"
                        className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-foreground underline underline-offset-2"
                      >
                        <RotateCcw className="size-3.5" aria-hidden="true" />
                        Reset
                      </button>
                    ) : (
                      <Counter value={value} max={f.max} />
                    )
                  }
                >
                  {f.long ? (
                    <textarea value={value} onChange={(e) => set(e.target.value)} maxLength={f.max} rows={f.max > 300 ? 4 : 2} placeholder={f.sample} className={`${INPUT} resize-y`} />
                  ) : (
                    <input value={value} onChange={(e) => set(e.target.value)} maxLength={f.max} placeholder={f.sample} className={INPUT} />
                  )}
                </Field>
              );
            })}
          </Section>
        </div>
      ))}
    </div>
  );
}
