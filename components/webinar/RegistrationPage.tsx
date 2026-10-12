"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
import {
  isValidEmail,
  registrationUrl,
  sessionIcs,
  WEBINAR_LIMITS,
  type Webinar,
} from "@/lib/webinars";

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

function formatSession(iso: string): string | null {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return null;
  // Shown in the VISITOR's timezone, labelled, so nobody turns up an hour off.
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function RegistrationPage({ webinar, mode, onRegister }: Props) {
  const sessionTime = webinar.next_session_at ? new Date(webinar.next_session_at).getTime() : NaN;
  const hasSession = Number.isFinite(sessionTime);
  const now = useNow(hasSession);
  const mounted = now !== null;
  const remaining = hasSession && mounted ? sessionTime - now : 0;
  const countdown = splitDuration(remaining);
  // Timezone-dependent, so client-only for the same reason as the clock.
  const sessionLabel = mounted ? formatSession(webinar.next_session_at) : null;
  // Before mount, assume the session is upcoming so the layout doesn't jump.
  const upcoming = hasSession && (!mounted || remaining > 0);

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
  }, [mode]);

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
    const ics = sessionIcs(webinar, registrationUrl(webinar.id));
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

  return (
    <div className="min-h-full bg-[#fbfaf6] text-[#1d2a27]">
      <div className="bg-[#1d2a27] px-5 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f4f1e8]">
        Free live training
        {webinar.presenter_name ? (
          <span className="font-normal normal-case tracking-normal text-[#f4f1e8]/70">
            {" "}· presented by {webinar.presenter_name}
            {webinar.presenter_title ? `, ${webinar.presenter_title}` : ""}
          </span>
        ) : null}
      </div>

      <div className="mx-auto max-w-5xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <header className="mx-auto max-w-3xl text-center reg-rise">
          <h1 className="text-balance text-3xl font-bold leading-[1.1] tracking-[-0.03em] sm:text-5xl">
            {webinar.title || "Untitled webinar"}
          </h1>
          {webinar.subtitle ? (
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-7 text-[#4c5a56] sm:text-lg">
              {webinar.subtitle}
            </p>
          ) : null}
        </header>

        <div className="mt-10 grid items-start gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-12">
          <div className="reg-rise [animation-delay:60ms]">
            {webinar.image_url ? (
              // Owner-supplied URL; a plain img keeps the static export simple.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={webinar.image_url}
                alt=""
                className="mx-auto aspect-square w-full max-w-[200px] rounded-full object-cover shadow-[0_20px_60px_-25px_rgba(29,42,39,0.45)] md:max-w-none"
              />
            ) : (
              <div className="mx-auto grid aspect-square w-full max-w-[200px] place-items-center rounded-full bg-gradient-to-br from-[#e6ece7] to-[#d5e0d7] text-center text-sm text-[#68736f] md:max-w-none">
                {webinar.presenter_name || "Presenter"}
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#68736f]">
                {hasSession ? (upcoming ? "Next session in" : "Session") : "Next session"}
              </p>
              {upcoming ? (
                <div className="mt-3 flex justify-center gap-3" aria-live="off">
                  {(
                    [
                      ["days", countdown.days],
                      ["hours", countdown.hours],
                      ["minutes", countdown.minutes],
                      ["seconds", countdown.seconds],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="w-16 rounded-xl border border-[#ddd7ca] bg-white py-2.5">
                      <div className="text-2xl font-bold tabular-nums">
                        {mounted ? String(value).padStart(2, "0") : "--"}
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-[#68736f]">{label}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm font-medium">
                  {hasSession ? "This session is under way." : "Date to be announced"}
                </p>
              )}
              {sessionLabel ? <p className="mt-3 text-sm text-[#4c5a56]">{sessionLabel}</p> : null}
            </div>
          </div>

          <div className="reg-rise [animation-delay:120ms]">
            {bullets.length ? (
              <>
                <h2 className="text-xl font-semibold tracking-[-0.02em]">Here&apos;s what you&apos;ll learn</h2>
                <ul className="mt-4 space-y-3">
                  {bullets.map((bullet, i) => (
                    <li key={i} className="flex gap-3 text-[15px] leading-6">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#1f4d3d] text-white">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <div
              ref={formCardRef}
              className="mt-8 scroll-mt-6 rounded-2xl border border-[#ddd7ca] bg-white p-5 shadow-[0_10px_40px_-25px_rgba(29,42,39,0.4)] sm:p-6"
            >
              {done ? (
                <div className="reg-rise text-center" role="status">
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#1f4d3d] text-white">
                    <Check className="size-6" strokeWidth={2.5} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">You&apos;re registered</h3>
                  <p className="mt-2 text-sm leading-6 text-[#4c5a56]">{webinar.thank_you_message}</p>
                  {sessionLabel ? (
                    <button
                      type="button"
                      onClick={downloadIcs}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#ddd7ca] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[#f4f1e8]"
                    >
                      <CalendarPlus className="size-4" />
                      Add to calendar
                    </button>
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
                      className="w-full rounded-xl border border-[#d8d2c6] bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#1f4d3d] focus:ring-2 focus:ring-[#1f4d3d]/20"
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
                      className="w-full rounded-xl border border-[#d8d2c6] bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#1f4d3d] focus:ring-2 focus:ring-[#1f4d3d]/20"
                    />
                  </label>
                  {error ? (
                    <p role="alert" className="text-sm text-red-700">{error}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b95f35] px-5 py-3.5 text-[15px] font-semibold uppercase tracking-[0.06em] text-white transition hover:bg-[#a5532d] active:scale-[0.99] disabled:opacity-70"
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                    {webinar.cta_label || "Register now"}
                  </button>
                  <p className="text-center text-xs text-[#68736f]">Free. We&apos;ll only email you about this session.</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {mode === "live" && !done && !formVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ddd7ca] bg-[#fbfaf6]/95 p-3 backdrop-blur md:hidden reg-rise">
          <button
            type="button"
            onClick={jumpToForm}
            className="w-full rounded-xl bg-[#b95f35] px-5 py-3.5 text-[15px] font-semibold uppercase tracking-[0.06em] text-white transition active:scale-[0.99]"
          >
            {webinar.cta_label || "Register now"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
