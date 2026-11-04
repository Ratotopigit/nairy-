"use client";

/**
 * The pieces every registration layout is built from. Layouts decide WHERE
 * things go; these decide what they are, so the form, the countdown and the
 * success state behave identically in every template.
 */
import { createContext, useContext, useId, useState, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from "react";
import { CalendarPlus, Check } from "lucide-react";
import { downloadIcs, googleCalendarUrl, outlookCalendarUrl, type CalendarEvent } from "@/lib/calendar";
import { videoEmbedUrl } from "@/lib/webinar-access";
import { DEFAULT_CTA_LABEL, DEFAULT_THANKS, WEBINAR_LIMITS, calendarEvent, isValidPaymentUrl, type SessionPhase, type Webinar } from "@/lib/webinars";
import type { WebinarTemplate } from "@/lib/webinar-templates";

// ── Shared state ──────────────────────────────────────────────────────────

export type FormState = {
  name: string;
  email: string;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  nameError: string | null;
  emailError: string | null;
  formError: string | null;
  busy: boolean;
  done: boolean;
  submit: (e: FormEvent) => void;
  validateName: () => void;
  validateEmail: () => void;
  reset: () => void;
  /** Scroll to the form and focus the first field. */
  jump: () => void;
  nameRef: RefObject<HTMLInputElement>;
  emailRef: RefObject<HTMLInputElement>;
  panelRef: RefObject<HTMLDivElement>;
};

export type PageState = {
  w: Webinar;
  t: WebinarTemplate;
  mode: "live" | "preview";
  phase: SessionPhase;
  mounted: boolean;
  /** Gallery thumbnail: nothing live, such as a video player, is loaded. */
  frozen: boolean;
  countdown: { days: number; hours: number; minutes: number; seconds: number };
  when: { date: string; time: string; short: string; weekday: string; day: string; month: string } | null;
  brandName: string;
  hostName: string;
  outcomes: string[];
  joinUrl: string | null;
  form: FormState;
};

const PageContext = createContext<PageState | null>(null);

export function PageProvider({ value, children }: { value: PageState; children: ReactNode }) {
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}

export function usePage(): PageState {
  const ctx = useContext(PageContext);
  if (!ctx) throw new Error("usePage must be used inside PageProvider");
  return ctx;
}

/** The main button's words. A paid button buys, so the stock "Register now" doesn't fit it. */
export function ctaText(w: Webinar): string {
  if (w.access_type !== "paid") return w.cta_label || "Register now";
  const label = w.cta_label && w.cta_label !== DEFAULT_CTA_LABEL ? w.cta_label : "Get your ticket";
  const price = w.ticket_price.trim();
  return price ? `${label} · ${price}` : label;
}

/** The host's thank-you message. The stock one says "see you at the session", which doesn't apply to on-demand. */
export function thanksMessage(w: Webinar): string {
  const message = w.thank_you_message.trim();
  return w.delivery_type === "automated" && message === DEFAULT_THANKS ? "" : message;
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "").slice(0, 2)).toUpperCase();
}

// ── Brand mark ────────────────────────────────────────────────────────────

export function BrandMark() {
  const { w, brandName, hostName } = usePage();
  const [broken, setBroken] = useState(false);
  const label = brandName || hostName;
  if (!label && !w.logo_url) return <span />;
  if (w.logo_url && !broken) {
    return (
      <span className="wp-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wp-logo" src={w.logo_url} alt={label || "Logo"} onError={() => setBroken(true)} />
        {w.brand_tagline ? <span className="wp-brand-tag">{w.brand_tagline}</span> : null}
      </span>
    );
  }
  return (
    <span className="wp-brand">
      <span className="wp-brand-name">{label}</span>
      {w.brand_tagline ? <span className="wp-brand-tag">{w.brand_tagline}</span> : null}
    </span>
  );
}

// ── Media ─────────────────────────────────────────────────────────────────

type MediaProps = {
  src: string;
  focusX: number;
  focusY: number;
  /** A big letter for the placeholder before the host adds a photo. */
  mark?: string;
  /** Richer placeholder content (e.g. the date) shown instead of the letter. */
  fallback?: ReactNode;
  alt?: string;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * A photograph cropped around the host's chosen focal point, or, until there
 * is one (or if it fails to load), a tonal backdrop in the brand colour.
 */
export function Media({ src, focusX, focusY, mark, fallback, alt = "", priority, className = "", style }: MediaProps) {
  const { t } = usePage();
  const [broken, setBroken] = useState<string | null>(null);
  const showImage = Boolean(src) && broken !== src;
  return (
    <div className={`wp-media ${className}`} style={style}>
      <div className="wp-ph" data-backdrop={t.look.backdrop} aria-hidden="true">
        {fallback ?? (mark ? <span className="wp-ph-mark">{mark}</span> : null)}
      </div>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          style={{ objectPosition: `${focusX}% ${focusY}%` }}
          onError={() => setBroken(src)}
        />
      ) : null}
    </div>
  );
}

/**
 * What a photo slot shows before there is a photo: the session date, set big.
 * It is real information laid out as a design element, so a new page looks
 * finished without a stock image, and the photo simply replaces it.
 */
export function DateMark() {
  const { when, phase, brandName, hostName } = usePage();
  if (!when || phase === "none" || phase === "ended") {
    const letter = initials(brandName || hostName).slice(0, 1);
    return letter ? <span className="wp-ph-mark">{letter}</span> : null;
  }
  return (
    <div className="wp-datemark">
      <div className="wp-dm-row">
        <span className="wp-dm-day">{when.day}</span>
        <span className="wp-dm-col">
          <span className="wp-dm-small">{when.weekday}</span>
          <span className="wp-dm-small">{when.month}</span>
        </span>
      </div>
      <span className="wp-dm-time">{when.time}</span>
    </div>
  );
}

// ── Text pieces ───────────────────────────────────────────────────────────

export function Kicker({ children }: { children?: ReactNode }) {
  const { t, phase, w } = usePage();
  // Template kickers say "Free live workshop" and the like, so they only suit free live webinars.
  const stock = w.delivery_type === "automated" ? "On-demand webinar" : w.access_type === "paid" ? "Live webinar" : t.kicker;
  return <p className="wp-kicker">{children ?? (phase === "live" ? "Live now" : stock)}</p>;
}

export function Headline({ className = "" }: { className?: string }) {
  const { w } = usePage();
  return <h1 className={`wp-h1 ${className}`}>{w.title || "Your webinar title"}</h1>;
}

export function Subtitle() {
  const { w } = usePage();
  return w.subtitle ? <p className="wp-sub">{w.subtitle}</p> : null;
}

const TICK = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.2 8.6l3 3 6.6-7.2" />
  </svg>
);

export function Outcomes({ cols = false, title = "What you'll learn" }: { cols?: boolean; title?: string | null }) {
  const { outcomes, t } = usePage();
  if (!outcomes.length) return null;
  return (
    <div>
      {title ? <p className="wp-label wp-out-title">{title}</p> : null}
      <ol className="wp-out" data-cols={cols ? "" : undefined}>
        {outcomes.map((item, i) => (
          <li key={i}>
            <span className="wp-mark" aria-hidden="true">
              {t.look.outcomes === "numbered" ? String(i + 1).padStart(2, "0") : t.look.outcomes === "dash" ? null : TICK}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function HostCredit() {
  const { w, hostName } = usePage();
  const [broken, setBroken] = useState(false);
  if (!hostName) return null;
  return (
    <div className="wp-host">
      <span className="wp-avatar" aria-hidden="true">
        {initials(hostName)}
        {w.portrait_url && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={w.portrait_url} alt="" style={{ objectPosition: `${w.portrait_focus_x}% ${w.portrait_focus_y}%` }} onError={() => setBroken(true)} />
        ) : null}
      </span>
      <div>
        <p className="wp-host-name">{hostName}</p>
        {w.presenter_title ? <p className="wp-host-title">{w.presenter_title}</p> : null}
      </div>
    </div>
  );
}

export function Bio() {
  const { w } = usePage();
  return w.host_bio.trim() ? <p className="wp-bio">{w.host_bio}</p> : null;
}

export function Proof() {
  const { w } = usePage();
  return w.social_proof.trim() ? <p className="wp-proof">{w.social_proof}</p> : null;
}

/** "Hosted by …, with a bio and proof" block for the lower part of a page. */
export function HostBlock() {
  const { hostName, w } = usePage();
  const any = hostName || w.host_bio.trim() || w.social_proof.trim();
  if (!any) return null;
  return (
    <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
      <HostCredit />
      <Bio />
      <Proof />
    </div>
  );
}

export function Footer() {
  const { brandName } = usePage();
  if (!brandName) return null;
  return (
    <div className="wp-wrap">
      <p className="wp-foot">© {new Date().getFullYear()} {brandName}</p>
    </div>
  );
}

// ── Session: countdown + date ─────────────────────────────────────────────

export function SessionBlock() {
  const { phase, mounted, countdown, when, w } = usePage();
  const pad = (n: number) => String(n).padStart(2, "0");
  if (w.delivery_type === "automated") {
    return (
      <div className="wp-session">
        <p className="wp-label">On demand</p>
      </div>
    );
  }
  return (
    <div className="wp-session">
      {phase === "upcoming" ? (
        <>
          <p className="wp-label">Starts in</p>
          <p className="wp-count" aria-hidden={!mounted}>
            {countdown.days > 0 ? (
              <span>
                {mounted ? pad(countdown.days) : "--"}
                <i>d</i>
              </span>
            ) : null}
            <span>
              {mounted ? pad(countdown.hours) : "--"}
              <i>h</i>
            </span>
            <span>
              {mounted ? pad(countdown.minutes) : "--"}
              <i>m</i>
            </span>
            <span>
              {mounted ? pad(countdown.seconds) : "--"}
              <i>s</i>
            </span>
          </p>
        </>
      ) : phase === "live" ? (
        <span className="wp-state" data-kind="live">
          Happening now
        </span>
      ) : phase === "ended" ? (
        <span className="wp-state" data-kind="ended">
          This session has ended
        </span>
      ) : (
        <p className="wp-label">Date to be announced</p>
      )}
      {phase !== "none" ? (
        <p className="wp-date">{when ? `${when.date} · ${when.time}` : " "}</p>
      ) : null}
    </div>
  );
}

/** The one-line date for mastheads and hero copy. */
export function WhenLine({ short = false }: { short?: boolean }) {
  const { phase, when, mounted, w } = usePage();
  if (w.delivery_type === "automated") return <>On demand</>;
  if (phase === "none") return <>Date to be announced</>;
  if (phase === "live") return <>Live now</>;
  if (phase === "ended") return <>Session ended</>;
  if (!mounted || !when) return <>{" "}</>;
  return <>{short ? when.short : `${when.date} · ${when.time}`}</>;
}

// ── Registration panel ────────────────────────────────────────────────────

type PanelProps = {
  /** Heading above the session block, e.g. "Reserve your seat". */
  title?: string | null;
  float?: boolean;
  className?: string;
  /** Hide the countdown block (layouts that already show the date). */
  compact?: boolean;
  /** No card: the form sits directly on the page (minimal layout). */
  bare?: boolean;
};

/** A link to the host's checkout. Never a form: a registrant is emailed the private join link. */
function PaidCta() {
  const { w } = usePage();
  const valid = isValidPaymentUrl(w.payment_url);
  return (
    <div className="wp-form">
      {valid ? (
        <a className="wp-btn" href={new URL(w.payment_url).href} target="_blank" rel="noopener noreferrer">
          {ctaText(w)}
        </a>
      ) : (
        <button type="button" className="wp-btn" disabled style={{ cursor: "not-allowed" }}>
          {ctaText(w)}
        </button>
      )}
      <p className="wp-fine">{valid ? "You'll pay on the host's checkout page and get access through it." : "Tickets aren't on sale yet."}</p>
    </div>
  );
}

export function RegisterPanel({ title: titleProp = "Reserve your seat", float, className = "", compact, bare }: PanelProps) {
  const { form, phase, w, t } = usePage();
  const nameId = useId();
  const emailId = useId();
  const closed = phase === "ended";
  const paid = w.access_type === "paid";
  const automated = w.delivery_type === "automated";
  // Layouts pass seat wording, which only a live free session has.
  const title = titleProp && paid ? "Get your ticket" : titleProp && automated ? "Watch on demand" : titleProp;
  return (
    <div ref={form.panelRef} className={`wp-panel ${className}`} data-float={float ? "" : undefined} data-bare={bare ? "" : undefined} id="register">
      {closed ? (
        <div className="wp-closed">
          <h3>Registration is closed</h3>
          <p>This session has finished. Check back soon for the next one.</p>
        </div>
      ) : form.done ? (
        <Success />
      ) : (
        <>
          {title || !compact ? (
            <div className="wp-panel-head">
              {title ? <p className="wp-label">{title}</p> : null}
              {compact ? null : <SessionBlock />}
            </div>
          ) : null}
          {paid ? <PaidCta /> : (
          <form className="wp-form" onSubmit={form.submit} noValidate aria-label="Register for this webinar">
            <div className="wp-field">
              <label htmlFor={nameId}>Full name</label>
              <input
                ref={form.nameRef}
                id={nameId}
                className="wp-input"
                value={form.name}
                onChange={(e) => form.setName(e.target.value)}
                onBlur={form.validateName}
                maxLength={WEBINAR_LIMITS.name}
                autoComplete="name"
                placeholder="Your name"
                aria-invalid={form.nameError ? true : undefined}
                aria-describedby={form.nameError ? `${nameId}-err` : undefined}
              />
              {form.nameError ? (
                <p id={`${nameId}-err`} className="wp-err">
                  {form.nameError}
                </p>
              ) : null}
            </div>
            <div className="wp-field">
              <label htmlFor={emailId}>Email address</label>
              <input
                ref={form.emailRef}
                id={emailId}
                className="wp-input"
                type="email"
                value={form.email}
                onChange={(e) => form.setEmail(e.target.value)}
                onBlur={form.validateEmail}
                maxLength={WEBINAR_LIMITS.email}
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                aria-invalid={form.emailError ? true : undefined}
                aria-describedby={form.emailError ? `${emailId}-err` : undefined}
              />
              {form.emailError ? (
                <p id={`${emailId}-err`} className="wp-err">
                  {form.emailError}
                </p>
              ) : null}
            </div>
            {form.formError ? (
              <p role="alert" className="wp-alert">
                {form.formError}
              </p>
            ) : null}
            <button type="submit" className="wp-btn" disabled={form.busy}>
              {form.busy ? "Registering…" : w.cta_label || "Register now"}
            </button>
            <p className="wp-fine">
              {automated
                ? "Free. Watch right after you sign up."
                : phase === "live"
                  ? "Free. We'll email you the link to join right away."
                  : "Free. We'll email you the details and a calendar reminder."}
            </p>
          </form>
          )}
        </>
      )}
      <span className="wp-sr" aria-hidden="true" data-template={t.id} />
    </div>
  );
}

// ── Success ───────────────────────────────────────────────────────────────

function CalendarIcon() {
  return <CalendarPlus aria-hidden="true" />;
}

/** Google, Outlook and Apple calendar buttons for the session. */
export function CalendarButtons({ event }: { event: CalendarEvent }) {
  return (
    <div className="wp-cal-row" data-wide="">
      <a className="wp-cal-btn" href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
        <CalendarIcon />
        Google
      </a>
      <a className="wp-cal-btn" href={outlookCalendarUrl(event)} target="_blank" rel="noopener noreferrer">
        <CalendarIcon />
        Outlook
      </a>
      <button type="button" className="wp-cal-btn" onClick={() => downloadIcs(event)}>
        <CalendarIcon />
        Apple (.ics)
      </button>
    </div>
  );
}

/** The player for a free automated webinar, built only from the id parsed out of the host's link. */
export function VideoPlayer() {
  const { w, frozen } = usePage();
  const embed = videoEmbedUrl(w.video_url);
  if (!embed) return <p>The video for this webinar isn&apos;t available yet.</p>;
  return (
    <div className="wp-media" style={{ aspectRatio: "16 / 9" }}>
      {frozen ? null : (
        <iframe
          src={embed}
          title={w.title || "Webinar video"}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      )}
    </div>
  );
}

function Success() {
  const { form, w, when, phase, joinUrl, mode } = usePage();
  const event = calendarEvent(w, joinUrl);
  const showCalendar = Boolean(event) && phase !== "ended";
  const automated = w.delivery_type === "automated";
  const message = thanksMessage(w);
  return (
    <div className="wp-success" role="status">
      <span className="wp-success-mark" aria-hidden="true">
        <Check size={22} strokeWidth={2.4} />
      </span>
      <h3>You&apos;re registered!</h3>
      <div className="wp-success-copy">
        {automated ? null : <p>Check your email for your webinar details.</p>}
        {message ? <p>{w.thank_you_message}</p> : null}
        {when && phase !== "none" ? (
          <p>
            <strong>{w.title}</strong>
            <br />
            {when.date} · {when.time}
          </p>
        ) : null}
      </div>
      {automated ? <VideoPlayer /> : null}
      {showCalendar && event ? (
        <div className="wp-cal">
          <p className="wp-label">Add to your calendar</p>
          <CalendarButtons event={event} />
        </div>
      ) : null}
      {mode === "preview" ? (
        <button type="button" className="wp-cal-btn" onClick={form.reset}>
          Back to the form
        </button>
      ) : null}
    </div>
  );
}
