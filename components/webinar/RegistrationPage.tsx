"use client";

/**
 * The public registration page, in whichever template the host picked.
 * Templates change the look only; the content and behaviour are the same:
 *
 *   upcoming  countdown + registration form
 *   live      "Live now" + form (late joiners get the join link by email)
 *   ended     "This session has ended", form closed
 *   closed    7 days after the end: just a short "finished" notice
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, CalendarPlus, Check, Loader2, Mail } from "lucide-react";
import {
  googleCalendarLink,
  isValidEmail,
  registrationUrl,
  sessionEnd,
  sessionIcs,
  sessionPhase,
  WEBINAR_LIMITS,
  type SessionPhase,
  type Webinar,
} from "@/lib/webinars";
import { getTemplate, themedColors, type WebinarTemplate } from "@/lib/webinar-templates";
import { TEMPLATE_FONTS } from "@/lib/webinar-fonts";
import { TemplateArt } from "@/components/webinar/TemplateArt";

type Props = {
  webinar: Webinar;
  /**
   * "preview" renders inside the editor: the form shows the thank-you state
   * without writing a registration, so the owner can check both screens.
   */
  mode: "live" | "preview";
  onRegister?: (name: string, email: string) => Promise<void>;
};

/**
 * The current time, or null before mount. Anything derived from the clock or
 * the visitor's timezone must not render on the server: the prerendered HTML
 * would carry the build machine's time and zone and fail hydration.
 */
function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function formatWhen(date: Date | null, withDay = true): string | null {
  if (!date) return null;
  // Shown in the VISITOR's timezone, labelled, so nobody turns up an hour off.
  return new Intl.DateTimeFormat(undefined, {
    ...(withDay ? { weekday: "long" as const } : {}),
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

const SHAPES: Record<WebinarTemplate["imageShape"], string> = {
  circle: "aspect-square rounded-full",
  rounded: "aspect-square rounded-[28px]",
  arch: "aspect-[4/5] rounded-t-full rounded-b-[28px]",
  square: "aspect-[4/5] rounded-none",
  blob: "aspect-square [border-radius:42%_58%_63%_37%/41%_44%_56%_59%]",
};

function backgroundStyle(t: WebinarTemplate): CSSProperties {
  const c = t.colors;
  switch (t.background) {
    case "dots":
      return { backgroundImage: `radial-gradient(${c.line} 1.2px, transparent 1.2px)`, backgroundSize: "20px 20px" };
    case "grid":
      return {
        backgroundImage: `linear-gradient(${c.line} 1px, transparent 1px), linear-gradient(90deg, ${c.line} 1px, transparent 1px)`,
        backgroundSize: "44px 44px",
        maskImage: "linear-gradient(to bottom, black, transparent 70%)",
        WebkitMaskImage: "linear-gradient(to bottom, black, transparent 70%)",
      };
    case "glow":
      return {
        backgroundImage: `radial-gradient(600px 320px at 15% 0%, ${c.hero}33, transparent 70%), radial-gradient(520px 300px at 90% 10%, ${c.accent}26, transparent 70%)`,
      };
    case "paper":
      return { backgroundImage: `linear-gradient(180deg, ${c.soft}66, transparent 420px)` };
    case "diagonal":
      return {
        backgroundImage: `repeating-linear-gradient(135deg, ${c.line}55 0 2px, transparent 2px 26px)`,
      };
    case "gradient":
      return { backgroundImage: `linear-gradient(180deg, ${c.soft}, ${c.page} 520px)` };
    default:
      return {};
  }
}

export function RegistrationPage({ webinar, mode, onRegister }: Props) {
  const base = getTemplate(webinar.template_id);
  const t: WebinarTemplate = { ...base, colors: themedColors(base, webinar) };
  const hasSession = Boolean(webinar.next_session_at);
  const now = useNow(hasSession);
  const mounted = now !== null;
  // Before mount, assume upcoming so the prerendered layout doesn't jump.
  const phase: SessionPhase = !hasSession ? "none" : mounted ? sessionPhase(webinar, now) : "upcoming";
  const start = hasSession ? new Date(webinar.next_session_at) : null;
  const countdown = splitDuration(start && mounted ? start.getTime() - now : 0);
  // Timezone-dependent, so client-only for the same reason as the clock.
  const sessionLabel = mounted ? formatWhen(start) : null;
  const open = phase === "upcoming" || phase === "live" || phase === "none";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const bullets = webinar.bullets.map((b) => b.trim()).filter(Boolean);

  // Mobile sticky CTA. Shown only while the form is off-screen, so it never
  // covers the form it points to. Live page only: inside the editor preview a
  // fixed bar would pin to the dashboard window, not the preview frame.
  const formCardRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [formVisible, setFormVisible] = useState(true);
  useEffect(() => {
    if (mode !== "live" || !formCardRef.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(formCardRef.current);
    return () => observer.disconnect();
  }, [mode, phase]);

  function jumpToForm() {
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    // preventScroll so focusing doesn't fight the smooth scroll above.
    window.setTimeout(() => nameInputRef.current?.focus({ preventScroll: true }), 350);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please enter your name.");
    if (!isValidEmail(email.trim().toLowerCase())) return setError("Please enter a valid email address.");
    if (mode === "preview") return setDone(true);
    setBusy(true);
    try {
      await onRegister?.(name, email);
      setDone(true);
    } catch (e) {
      console.error("registration failed:", e);
      setError("We couldn't register you just now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  function downloadIcs() {
    const ics = sessionIcs(webinar, registrationUrl(webinar));
    if (!ics) return;
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "webinar.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const c = t.colors;
  const rootStyle = {
    "--w-page": c.page,
    "--w-surface": c.surface,
    "--w-ink": c.ink,
    "--w-muted": c.muted,
    "--w-line": c.line,
    "--w-accent": c.accent,
    "--w-accent-ink": c.accentInk,
    "--w-hero": c.hero,
    "--w-hero-ink": c.heroInk,
    "--w-soft": c.soft,
    fontFamily: TEMPLATE_FONTS[t.bodyFont],
  } as CSSProperties;
  const headingStyle: CSSProperties = { fontFamily: TEMPLATE_FONTS[t.headingFont] };
  const heavyHeading = t.headingFont === "anton" || t.headingFont === "archivoBlack";

  // ── Closed: the session ended over a week ago. ───────────────────────────
  if (phase === "closed") {
    const ended = sessionEnd(webinar);
    return (
      <div style={rootStyle} className={`grid ${mode === "live" ? "min-h-screen" : "min-h-full"} place-items-center bg-[var(--w-page)] px-6 py-20 text-[var(--w-ink)]`}>
        <div className="max-w-md text-center reg-rise">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--w-muted)]">{t.kicker}</p>
          <h1 style={headingStyle} className="mt-3 text-balance text-2xl font-bold leading-tight sm:text-3xl">
            {webinar.title || "This webinar"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--w-muted)]">
            This webinar has finished{ended && mounted ? ` (it ended ${formatWhen(ended, false)})` : ""}. Registration is closed.
          </p>
          {mode === "preview" ? (
            <p className="mt-5 rounded-xl border border-dashed border-[var(--w-line)] px-4 py-3 text-xs text-[var(--w-muted)]">
              This is what visitors see now. Set a new date to open registration again; the same link keeps working.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // ── Pieces ───────────────────────────────────────────────────────────────

  const kickerPill = (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--w-line)] bg-[var(--w-surface)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--w-muted)]">
      {phase === "live" ? <span className="size-1.5 animate-pulse rounded-full bg-red-500" /> : <span className="size-1.5 rounded-full bg-[var(--w-accent)]" />}
      {phase === "live" ? "Live now" : t.kicker}
    </span>
  );

  const presenterLine = webinar.presenter_name ? (
    <p className="text-sm text-[var(--w-muted)]">
      Hosted by <span className="font-semibold text-[var(--w-ink)]">{webinar.presenter_name}</span>
      {webinar.presenter_title ? `, ${webinar.presenter_title}` : ""}
    </p>
  ) : null;

  const headline = (size: "md" | "lg" | "xl", align: "center" | "left" = "center", onHero = false) => (
    <>
      <h1
        style={headingStyle}
        className={[
          "text-balance",
          heavyHeading ? "leading-[0.98] tracking-[-0.01em]" : "font-bold leading-[1.08] tracking-[-0.03em]",
          t.uppercaseHeadline ? "uppercase" : "",
          size === "xl" ? "text-4xl sm:text-6xl" : size === "lg" ? "text-3xl sm:text-5xl" : "text-3xl sm:text-4xl",
          align === "center" ? "mx-auto max-w-3xl text-center" : "",
          onHero ? "text-[var(--w-hero-ink)]" : "",
        ].join(" ")}
      >
        {webinar.title || "Untitled webinar"}
      </h1>
      {webinar.subtitle ? (
        <p
          className={`mt-4 text-pretty text-base leading-7 sm:text-lg ${
            align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"
          } ${onHero ? "text-[var(--w-hero-ink)] opacity-80" : "text-[var(--w-muted)]"}`}
        >
          {webinar.subtitle}
        </p>
      ) : null}
    </>
  );

  const media = (className = "") => (
    <div className={`overflow-hidden shadow-[0_24px_60px_-30px_rgba(0,0,0,0.45)] ${SHAPES[t.imageShape]} ${className}`}>
      {webinar.image_url ? (
        // Owner-supplied URL; a plain img keeps the static export simple.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={webinar.image_url} alt={webinar.presenter_name || ""} className="size-full object-cover" />
      ) : (
        <TemplateArt art={t.art} colors={c} className="size-full" />
      )}
    </div>
  );

  const sessionPanel = (big = false) => (
    <div className="text-center">
      {phase === "upcoming" ? (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--w-muted)]">Starts in</p>
          <div className="mt-3 flex justify-center gap-2.5 sm:gap-3" aria-live="off">
            {(
              [
                ["days", countdown.days],
                ["hours", countdown.hours],
                ["minutes", countdown.minutes],
                ["seconds", countdown.seconds],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className={`rounded-xl border border-[var(--w-line)] bg-[var(--w-surface)] ${big ? "w-[72px] py-3 sm:w-20" : "w-16 py-2.5"}`}
              >
                <div style={headingStyle} className={`font-bold tabular-nums ${big ? "text-3xl" : "text-2xl"}`}>
                  {mounted ? String(value).padStart(2, "0") : "--"}
                </div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--w-muted)]">{label}</div>
              </div>
            ))}
          </div>
        </>
      ) : phase === "live" ? (
        <div className="inline-flex flex-col items-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/80" />
              <span className="relative inline-flex size-2 rounded-full bg-white" />
            </span>
            Happening now
          </span>
          <p className="mt-3 max-w-xs text-sm leading-6 text-[var(--w-muted)]">
            The session is live. Register and we&apos;ll email you the link to join straight away.
          </p>
        </div>
      ) : phase === "ended" ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--w-muted)]">Session</p>
          <p className="mt-2 text-sm font-semibold">This session has ended</p>
        </div>
      ) : (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--w-muted)]">Next session</p>
          <p className="mt-2 text-sm font-medium">Date to be announced</p>
        </div>
      )}
      {sessionLabel && phase !== "none" ? <p className="mt-3 text-sm text-[var(--w-muted)]">{sessionLabel}</p> : null}
    </div>
  );

  const bulletList = bullets.length ? (
    <div>
      <h2 style={headingStyle} className={`text-xl tracking-[-0.01em] ${heavyHeading ? "" : "font-semibold"}`}>
        Here&apos;s what you&apos;ll learn
      </h2>
      <ul className="mt-4 space-y-3.5">
        {bullets.map((bullet, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-6">
            {t.bulletStyle === "number" ? (
              <span style={headingStyle} className="w-7 shrink-0 text-lg font-bold leading-6 text-[var(--w-accent)]">
                {String(i + 1).padStart(2, "0")}
              </span>
            ) : t.bulletStyle === "arrow" ? (
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-[var(--w-accent)] text-[var(--w-accent-ink)]">
                <ArrowRight className="size-3" strokeWidth={3} />
              </span>
            ) : t.bulletStyle === "dash" ? (
              <span className="mt-3 h-0.5 w-5 shrink-0 rounded-full bg-[var(--w-accent)]" />
            ) : (
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--w-hero)] text-[var(--w-hero-ink)]">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  const calendarHref = googleCalendarLink(webinar, registrationUrl(webinar));

  const formCard = (extra: ReactNode = null, flat = false) => (
    <div
      ref={formCardRef}
      className={`scroll-mt-6 ${flat ? "" : "rounded-2xl border border-[var(--w-line)] bg-[var(--w-surface)] p-5 shadow-[0_14px_44px_-28px_rgba(0,0,0,0.45)] sm:p-6"}`}
    >
      {extra}
      {phase === "ended" ? (
        <div className="text-center">
          <h3 className="text-lg font-semibold">Registration is closed</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--w-muted)]">
            This session is over. Check back soon for the next one.
          </p>
        </div>
      ) : done ? (
        <div className="reg-rise text-center" role="status">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--w-hero)] text-[var(--w-hero-ink)]">
            <Check className="size-6" strokeWidth={2.5} />
          </div>
          <h3 className="mt-4 text-lg font-semibold">You&apos;re registered</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--w-muted)]">{webinar.thank_you_message}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--w-muted)]">
            <Mail className="size-3.5" />
            {phase === "live"
              ? "Your join link is on its way to your inbox now."
              : "We've emailed you the details and the link to join."}
          </p>
          {sessionLabel && phase === "upcoming" ? (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {calendarHref ? (
                <a
                  href={calendarHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--w-line)] px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
                >
                  <CalendarPlus className="size-4" />
                  Google Calendar
                </a>
              ) : null}
              <button
                type="button"
                onClick={downloadIcs}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--w-line)] px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
              >
                <CalendarPlus className="size-4" />
                Apple / Outlook
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-3">
          <label className="block">
            <span className="sr-only">Your name</span>
            <input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={WEBINAR_LIMITS.name}
              autoComplete="name"
              placeholder="Your name"
              className="w-full rounded-xl border border-[var(--w-line)] bg-[var(--w-page)] px-4 py-3 text-[15px] text-[var(--w-ink)] outline-none transition placeholder:text-[var(--w-muted)] focus:border-[var(--w-accent)] focus:ring-2 focus:ring-[var(--w-line)]"
            />
          </label>
          <label className="block">
            <span className="sr-only">Your email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={WEBINAR_LIMITS.email}
              autoComplete="email"
              inputMode="email"
              placeholder="Your best email"
              className="w-full rounded-xl border border-[var(--w-line)] bg-[var(--w-page)] px-4 py-3 text-[15px] text-[var(--w-ink)] outline-none transition placeholder:text-[var(--w-muted)] focus:border-[var(--w-accent)] focus:ring-2 focus:ring-[var(--w-line)]"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-red-600">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            style={heavyHeading ? headingStyle : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--w-accent)] px-5 py-3.5 text-[15px] font-semibold uppercase tracking-[0.06em] text-[var(--w-accent-ink)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {webinar.cta_label || "Register now"}
          </button>
          <p className="text-center text-xs text-[var(--w-muted)]">
            {phase === "live"
              ? "Free. We'll email you the join link right away."
              : "Free. We'll email you the details and a calendar reminder."}
          </p>
        </form>
      )}
    </div>
  );

  // ── Layouts ──────────────────────────────────────────────────────────────

  let body: ReactNode;
  switch (t.layout) {
    case "split":
      body = (
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
          <div className="reg-rise">
            {kickerPill}
            <div className="mt-5">{headline("lg", "left")}</div>
            {presenterLine ? <div className="mt-5">{presenterLine}</div> : null}
            {bulletList ? <div className="mt-9">{bulletList}</div> : null}
          </div>
          <div className="reg-rise [animation-delay:80ms]">
            {formCard(
              <div className="mb-6">
                {media("mx-auto w-full max-w-[220px]")}
                <div className="mt-5">{sessionPanel()}</div>
              </div>,
            )}
          </div>
        </div>
      );
      break;

    case "stage":
      body = (
        <div className="mx-auto max-w-5xl px-5 pb-16 pt-10 text-center sm:px-8 sm:pt-16">
          <div className="reg-rise flex flex-col items-center">
            {media("w-28 sm:w-32")}
            <div className="mt-6">{kickerPill}</div>
            <div className="mt-5">{headline("xl")}</div>
            {presenterLine ? <div className="mt-4">{presenterLine}</div> : null}
            <div className="mt-9">{sessionPanel(true)}</div>
          </div>
          <div className="mt-12 grid items-start gap-8 text-left md:grid-cols-2 md:gap-12 reg-rise [animation-delay:100ms]">
            {bulletList ?? <div />}
            {formCard()}
          </div>
        </div>
      );
      break;

    case "editorial":
      body = (
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
          <div className="reg-rise border-b-2 border-[var(--w-ink)] pb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--w-accent)]">
              {phase === "live" ? "Live now" : t.kicker}
            </p>
            <div className="mt-4">{headline("xl", "left")}</div>
          </div>
          <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-14">
            <div className="reg-rise [animation-delay:60ms]">
              {presenterLine ? <div className="mb-8">{presenterLine}</div> : null}
              {bulletList}
            </div>
            <div className="reg-rise space-y-6 [animation-delay:120ms]">
              {media("w-full max-w-[320px]")}
              <div className="border-y border-[var(--w-line)] py-5">{sessionPanel()}</div>
              {formCard()}
            </div>
          </div>
        </div>
      );
      break;

    case "spotlight":
      body = (
        <div className="mx-auto max-w-xl px-5 pb-16 pt-24 sm:pt-28">
          <div className="reg-rise relative rounded-[28px] border border-[var(--w-line)] bg-[var(--w-surface)] px-5 pb-7 pt-20 text-center shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)] sm:px-9">
            <div className="absolute left-1/2 top-0 w-32 -translate-x-1/2 -translate-y-1/2 sm:w-36">{media("w-full ring-8 ring-[var(--w-page)]")}</div>
            {kickerPill}
            <div className="mt-5">{headline("md")}</div>
            {presenterLine ? <div className="mt-4">{presenterLine}</div> : null}
            <div className="mt-7">{sessionPanel()}</div>
            {bulletList ? <div className="mt-8 text-left">{bulletList}</div> : null}
            <div className="mt-8 text-left">{formCard(null, true)}</div>
          </div>
        </div>
      );
      break;

    case "band":
      body = (
        <div>
          <div className="bg-[var(--w-hero)] text-[var(--w-hero-ink)]">
            <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 pb-28 pt-10 sm:px-8 sm:pt-14 md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
              <div className="reg-rise">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] opacity-80">
                  {phase === "live" ? "● Live now" : t.kicker}
                </p>
                <div className="mt-4">{headline("lg", "left", true)}</div>
              </div>
              <div className="reg-rise hidden md:block [animation-delay:80ms]">{media("ml-auto w-full max-w-[260px]")}</div>
            </div>
          </div>
          <div className="mx-auto -mt-20 grid max-w-6xl items-start gap-8 px-5 pb-16 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
            <div className="reg-rise order-2 pt-4 md:order-1 md:pt-28 [animation-delay:100ms]">
              {presenterLine ? <div className="mb-6">{presenterLine}</div> : null}
              {bulletList}
            </div>
            <div className="reg-rise order-1 md:order-2 [animation-delay:60ms]">
              {formCard(<div className="mb-6">{sessionPanel()}</div>)}
            </div>
          </div>
        </div>
      );
      break;

    default: // classic
      body = (
        <>
          <div className="bg-[var(--w-hero)] px-5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--w-hero-ink)]">
            {phase === "live" ? "● Live now" : t.kicker}
            {webinar.presenter_name ? (
              <span className="font-normal normal-case tracking-normal opacity-75">
                {" "}· presented by {webinar.presenter_name}
                {webinar.presenter_title ? `, ${webinar.presenter_title}` : ""}
              </span>
            ) : null}
          </div>
          <div className="mx-auto max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
            <header className="reg-rise">{headline("lg")}</header>
            <div className="mt-10 grid items-start gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-12">
              <div className="reg-rise [animation-delay:60ms]">
                {media("mx-auto w-full max-w-[200px] md:max-w-[320px]")}
                <div className="mt-6">{sessionPanel()}</div>
              </div>
              <div className="reg-rise [animation-delay:120ms]">
                {bulletList}
                <div className="mt-8">{formCard()}</div>
              </div>
            </div>
          </div>
        </>
      );
  }

  return (
    <div style={rootStyle} className={`relative ${mode === "live" ? "min-h-screen" : "min-h-full"} bg-[var(--w-page)] text-[var(--w-ink)]`}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={backgroundStyle(t)} />
      <div className="relative">{body}</div>

      {mode === "live" && !done && open && !formVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--w-line)] bg-[var(--w-page)] p-3 md:hidden reg-rise">
          <button
            type="button"
            onClick={jumpToForm}
            className="w-full rounded-xl bg-[var(--w-accent)] px-5 py-3.5 text-[15px] font-semibold uppercase tracking-[0.06em] text-[var(--w-accent-ink)] transition active:scale-[0.99]"
          >
            {webinar.cta_label || "Register now"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
