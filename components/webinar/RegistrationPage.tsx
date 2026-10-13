"use client";

/**
 * The public registration page, in whichever template the host picked.
 *
 * Content, brand, colours and fonts come from the webinar; composition and
 * defaults from the template (lib/webinar-templates.ts). This component owns
 * what must behave the same everywhere: the clock, the form, validation and
 * the success state. Layouts (page-layouts.tsx) only arrange the parts.
 *
 *   upcoming  countdown + form
 *   live      "Happening now" + form (late joiners get the link by email)
 *   ended     "This session has ended", form closed
 *   closed    a week after the end: a short "finished" notice
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import "@/components/webinar/registration.css";
import {
  AsymmetricLayout,
  EditorialLayout,
  HostLayout,
  MinimalLayout,
  PhotoLayout,
} from "@/components/webinar/page-layouts";
import { BrandMark, Headline, PageProvider, type FormState, type PageState } from "@/components/webinar/page-parts";
import { FONT_PAIRS } from "@/lib/webinar-fonts";
import { getTemplate, resolveFontPairId, resolvePalette } from "@/lib/webinar-templates";
import { isValidEmail, normalizeEmail, sessionEnd, sessionPhase, type RegistrationResult, type SessionPhase, type Webinar } from "@/lib/webinars";

type Props = {
  webinar: Webinar;
  /**
   * "preview" renders inside the editor: the form shows the success state
   * without writing a registration, so the host can check both screens.
   */
  mode: "live" | "preview";
  onRegister?: (name: string, email: string) => Promise<RegistrationResult | void>;
  /** Gallery thumbnail: the clock is frozen so a grid of pages doesn't tick every second. */
  frozen?: boolean;
};

/**
 * The current time, or null before mount. Anything derived from the clock or
 * the visitor's timezone must not render on the server: prerendered HTML
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

/** Shown in the VISITOR's timezone, labelled, so nobody turns up an hour off. */
function formatWhen(iso: string): { date: string; time: string; short: string; weekday: string; day: string; month: string } | null {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return null;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return {
    date: new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
      ...(sameYear ? {} : { year: "numeric" as const }),
    }).format(d),
    time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(d),
    short: `${new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(d)} · ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d)}`,
    weekday: new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(d),
    day: String(d.getDate()),
    month: new Intl.DateTimeFormat(undefined, { month: "long", ...(sameYear ? {} : { year: "numeric" as const }) }).format(d),
  };
}

const LAYOUTS = {
  editorial: EditorialLayout,
  photo: PhotoLayout,
  minimal: MinimalLayout,
  host: HostLayout,
  asymmetric: AsymmetricLayout,
} as const;

export function RegistrationPage({ webinar: w, mode, onRegister, frozen = false }: Props) {
  const t = getTemplate(w.template_id);
  const palette = useMemo(
    () => resolvePalette(t, w),
    // Only the colour fields matter; the rest of the webinar changing must not recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, w.theme_bg, w.theme_ink, w.theme_brand, w.theme_accent],
  );
  const font = FONT_PAIRS[resolveFontPairId(t, w.font_pair)];

  const hasSession = Boolean(w.next_session_at);
  const now = useNow(hasSession && !frozen);
  const mounted = now !== null;
  // Before mount, assume upcoming so the prerendered layout doesn't jump.
  const phase: SessionPhase = !hasSession ? "none" : mounted ? sessionPhase(w, now) : "upcoming";
  const start = hasSession ? new Date(w.next_session_at) : null;
  const countdown = splitDuration(start && mounted ? start.getTime() - now : 0);
  const when = useMemo(() => (mounted && hasSession ? formatWhen(w.next_session_at) : null), [mounted, hasSession, w.next_session_at]);

  // ── Form ────────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const checkName = useCallback((value: string) => {
    const ok = value.trim().length > 0;
    setNameError(ok ? null : "Please enter your name.");
    return ok;
  }, []);
  const checkEmail = useCallback((value: string) => {
    const v = normalizeEmail(value);
    const ok = isValidEmail(v);
    setEmailError(ok ? null : v ? "That email address doesn't look right. Check it and try again." : "Please enter your email address.");
    return ok;
  }, []);

  const submit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      setFormError(null);
      const nameOk = checkName(name);
      const emailOk = checkEmail(email);
      if (!nameOk || !emailOk) {
        (nameOk ? emailRef : nameRef).current?.focus();
        return;
      }
      if (mode === "preview") return setDone(true);
      setBusy(true);
      try {
        const result = await onRegister?.(name, email);
        setDone(true);
        // The attendee's own join link arrives a moment later; the success
        // screen is already showing and simply gains it in the calendar links.
        if (result && "joinUrl" in result) {
          void result.joinUrl.then((url) => alive.current && setJoinUrl(url));
        }
      } catch (e) {
        console.error("registration failed:", e);
        setFormError("We couldn't register you just now. Please try again in a moment.");
      } finally {
        if (alive.current) setBusy(false);
      }
    },
    [name, email, mode, onRegister, checkName, checkEmail],
  );

  const form: FormState = {
    name,
    email,
    setName: (v) => {
      setName(v);
      if (nameError) setNameError(null);
    },
    setEmail: (v) => {
      setEmail(v);
      if (emailError) setEmailError(null);
    },
    nameError,
    emailError,
    formError,
    busy,
    done,
    submit: (e) => void submit(e),
    validateName: () => {
      if (name) checkName(name);
    },
    validateEmail: () => {
      if (email) checkEmail(email);
    },
    reset: () => {
      setDone(false);
      setName("");
      setEmail("");
    },
    nameRef,
    emailRef,
    panelRef,
  };

  // Mobile sticky button: only while the form is off screen, so it never
  // covers the form it points to. Live page only: inside the editor preview a
  // fixed bar would pin to the dashboard window, not the preview frame.
  const [formVisible, setFormVisible] = useState(true);
  useEffect(() => {
    const el = panelRef.current;
    if (mode !== "live" || !el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode, phase, done, t.layout]);

  function jumpToForm() {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 400);
  }

  const outcomes = w.bullets.map((b) => b.trim()).filter(Boolean).slice(0, 5);
  const state: PageState = {
    w,
    t,
    mode,
    phase,
    mounted,
    countdown,
    when,
    brandName: w.brand_name.trim(),
    hostName: w.presenter_name.trim(),
    outcomes,
    joinUrl,
    form,
  };

  const vars = {
    "--bg": palette.bg,
    "--surface": palette.surface,
    "--ink": palette.ink,
    "--muted": palette.muted,
    "--line": palette.line,
    "--lineStrong": palette.lineStrong,
    "--tint": palette.tint,
    "--brand": palette.brand,
    "--brand-ink": palette.brandInk,
    "--brand-ink-soft": palette.brandInkSoft,
    "--brand-deep": palette.brandDeep,
    "--brand-text": palette.brandText,
    "--accent": palette.accent,
    "--accent-ink": palette.accentInk,
    "--scrim": palette.scrim,
    "--danger": palette.danger,
    "--hero-a": palette.heroA,
    "--hero-b": palette.heroB,
    "--font-head": font.heading,
    "--font-body": font.body,
    "--head-w": font.headingWeight,
    "--head-track": font.tracking,
    "--radius": `${t.look.radius}px`,
    minHeight: mode === "live" ? "100vh" : undefined,
    background: palette.bg,
  } as CSSProperties;

  const dataAttrs = {
    "data-layout": t.layout,
    "data-field": t.look.field,
    "data-outcomes": t.look.outcomes,
    "data-caps": t.look.caps ? "" : undefined,
    "data-flip": t.look.flip ? "" : undefined,
  };

  // A week after the session: the page says so and nothing more.
  if (phase === "closed") {
    const ended = sessionEnd(w);
    return (
      <div className="wp-root" style={vars}>
        <div className="wp" {...dataAttrs}>
          <PageProvider value={state}>
            <div className="wp-wrap" style={{ paddingBlock: "clamp(40px, 10cqi, 120px)", display: "grid", gap: "1.25rem", maxWidth: "46rem" }}>
              <BrandMark />
              <Headline />
              <p className="wp-sub">
                This webinar has finished
                {ended && mounted ? ` (it ended ${new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long" }).format(ended)})` : ""}. Registration is closed.
              </p>
              {mode === "preview" ? (
                <p className="wp-fine" style={{ textAlign: "left" }}>
                  This is what visitors see now. Set a new date to open registration again; the same link keeps working.
                </p>
              ) : null}
            </div>
          </PageProvider>
        </div>
      </div>
    );
  }

  const Layout = LAYOUTS[t.layout];
  const open = phase !== "ended";

  return (
    <div className="wp-root" style={vars}>
      <div className="wp" {...dataAttrs}>
        <PageProvider value={state}>
          <Layout />
        </PageProvider>
      </div>
      {mode === "live" && !done && open && !formVisible ? (
        <div className="wp-sticky">
          <button type="button" className="wp-btn" onClick={jumpToForm}>
            {w.cta_label || "Register now"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
