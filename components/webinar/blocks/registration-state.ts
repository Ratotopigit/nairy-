"use client";

/**
 * The state every public page shares: the clock, the theme variables, and the
 * registration form (validation, sign-up, the on-demand "remember me", the
 * join link that arrives after sign-up). RegistrationPage and BlockPage both
 * run it, so a form block behaves exactly like the template form.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { FormState, PageState } from "@/components/webinar/page-parts";
import { FONT_PAIRS } from "@/lib/webinar-fonts";
import { getTemplate, resolveFontPairId, resolvePalette } from "@/lib/webinar-templates";
import { isValidEmail, normalizeEmail, sessionPhase, type RegistrationResult, type SessionPhase, type Webinar } from "@/lib/webinars";

/**
 * The current time, or null before mount. Anything derived from the clock or
 * the visitor's timezone must not render on the server: prerendered HTML
 * would carry the build machine's time and zone and fail hydration.
 */
export function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Shown in the VISITOR's timezone, labelled, so nobody turns up an hour off. */
function formatWhen(iso: string): PageState["when"] {
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

/** On-demand sign-ups, per webinar, so a returning visitor on this browser goes straight to the video. */
const watcherKey = (id: string) => `webinar-watcher:${id}`;

function rememberWatcher(id: string) {
  try {
    window.localStorage.setItem(watcherKey(id), "1");
  } catch {
    // Blocked storage only means signing up again next time.
  }
}

function isRememberedWatcher(id: string): boolean {
  try {
    return window.localStorage.getItem(watcherKey(id)) === "1";
  } catch {
    return false;
  }
}

type Options = {
  webinar: Webinar;
  mode: "live" | "preview";
  onRegister?: (name: string, email: string) => Promise<RegistrationResult | void>;
  /** Told after every successful sign-up (and the preview's pretend one). */
  onRegistered?: () => void;
  frozen?: boolean;
  startDone?: boolean;
  onDoneChange?: (done: boolean) => void;
  /** The thank-you screen is drawn from blocks, so the training thank-you template must not take over the theme. */
  blockThanks?: boolean;
};

export function useRegistration({ webinar: w, mode, onRegister, onRegistered, frozen = false, startDone = false, onDoneChange, blockThanks = false }: Options) {
  // Signed up. A preview can flip screens from outside (its Sign-up / Thank-you switch).
  const [signedUp, setDone] = useState(startDone);
  const paid = w.access_type === "paid";
  const automated = w.delivery_type === "automated";
  const done = signedUp && !paid;
  useEffect(() => {
    setDone(startDone);
  }, [startDone]);
  useEffect(() => {
    if (mode === "live" && automated && isRememberedWatcher(w.id)) setDone(true);
  }, [mode, automated, w.id]);
  useEffect(() => {
    onDoneChange?.(done);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  // The full thank-you page has its own look (whatever the sign-up template was); the host's colour overrides still apply.
  const showThanks = done && w.thank_you_template === "training" && !blockThanks;
  const t = getTemplate(showThanks ? "training-midnight" : w.template_id);
  const palette = useMemo(
    () => resolvePalette(t, w),
    // Only the colour fields matter; the rest of the webinar changing must not recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, w.theme_bg, w.theme_ink, w.theme_brand, w.theme_accent],
  );
  const font = FONT_PAIRS[resolveFontPairId(t, w.font_pair)];

  const hasSession = !automated && Boolean(w.next_session_at);
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
      if (paid) return; // No layout renders a form for paid; a registration here would email the join link.
      setFormError(null);
      const nameOk = checkName(name);
      const emailOk = checkEmail(email);
      if (!nameOk || !emailOk) {
        (nameOk ? emailRef : nameRef).current?.focus();
        return;
      }
      if (mode === "preview") {
        setDone(true);
        onRegistered?.();
        return;
      }
      setBusy(true);
      try {
        const result = await onRegister?.(name, email);
        setDone(true);
        if (automated) rememberWatcher(w.id);
        // The attendee's own join link arrives a moment later; the success
        // screen is already showing and simply gains it in the calendar links.
        if (result && "joinUrl" in result) {
          void result.joinUrl.then((url) => alive.current && setJoinUrl(url));
        }
        onRegistered?.();
      } catch (e) {
        console.error("registration failed:", e);
        setFormError("We couldn't register you just now. Please try again in a moment.");
      } finally {
        if (alive.current) setBusy(false);
      }
    },
    [name, email, mode, onRegister, onRegistered, checkName, checkEmail, paid, automated, w.id],
  );

  function jumpToForm() {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 400);
  }

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
    jump: jumpToForm,
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
    if (mode !== "live" || !el || typeof IntersectionObserver === "undefined") {
      setFormVisible(true); // No form on screen (e.g. a block page without a form block): no sticky button.
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode, phase, done, t.layout]);

  const outcomes = w.bullets.map((b) => b.trim()).filter(Boolean).slice(0, 5);
  const state: PageState = {
    w,
    t,
    mode,
    phase,
    mounted,
    frozen,
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
    "--btn-radius": t.look.pill ? "999px" : `${t.look.radius}px`,
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

  return { state, vars, dataAttrs, done, phase, mounted, showThanks, t, formVisible, jumpToForm };
}
