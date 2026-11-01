"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { billingEnabled, fetchIntroEligibility, useEntitlement } from "@/lib/billing";
import { INTRO_DAYS, INTRO_PRICE, PAYMENT_TERMS, PLAN_CATALOG, introTerms } from "@/lib/plans";

/**
 * Offer for every signed-in account without a subscription, once per visit
 * (browser session), never on the Billing page. People who still qualify for the
 * $1 week (same server rule as checkout) see "$1 for 7 days"; returning customers
 * see the regular monthly price, so it never promises a price checkout won't
 * charge. The button opens Billing's own confirm-and-pay step for Monthly.
 */

const BLUE = "#2563eb";
const DISMISS_KEY = "billing:trial-popup-dismissed";
const MONTHLY = PLAN_CATALOG.find((p) => p.id === "monthly")!;

function dismissedThisVisit(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberDismissed(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {}
}

export default function TrialPopup() {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, paid } = useEntitlement();
  const [open, setOpen] = useState(false);
  // true = qualifies for the $1 week; false/null = show the regular price.
  const [intro, setIntro] = useState<boolean | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onBilling = pathname.startsWith("/provider/billing");

  useEffect(() => {
    if (!billingEnabled || loading || paid || onBilling || dismissedThisVisit()) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void fetchIntroEligibility().then((intro) => {
        if (!active || dismissedThisVisit()) return;
        setIntro(intro);
        setOpen(true);
      });
    }, 1500);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [loading, paid, onBilling]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => panelRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    rememberDismissed();
    setOpen(false);
  }

  function start() {
    rememberDismissed();
    setOpen(false);
    router.push("/provider/billing?start=monthly");
  }

  if (!open || onBilling) return null;
  const trial = intro === true;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={close}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-popup-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full overflow-hidden rounded-t-3xl bg-white p-6 shadow-2xl outline-none sm:max-w-md sm:rounded-3xl sm:p-7"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-xl border border-border hover:bg-secondary"
        >
          <X className="size-4" />
        </button>

        <span className="inline-flex rounded-full bg-[#dbeafe] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: BLUE }}>
          {trial ? `${INTRO_DAYS}-day trial` : "Upgrade"}
        </span>
        <h2 id="trial-popup-title" className="mt-3 font-serif text-3xl font-bold leading-tight tracking-[-0.02em]" style={{ color: BLUE }}>
          {trial ? `Try Webinar Stack for ${INTRO_PRICE}` : "Get everything in Webinar Stack"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {trial
            ? `Everything included for your first ${INTRO_DAYS} days. Build your webinar, pages, slides and emails.`
            : "Webinars, pages, slides, emails and the AI tools, in one plan."}
        </p>

        <div className="mt-5 rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] p-4">
          <p className="font-serif text-3xl font-bold" style={{ color: BLUE }}>
            {trial ? INTRO_PRICE : MONTHLY.price} <span className="text-base">{trial ? "today" : "/month"}</span>
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {trial ? introTerms(MONTHLY) : `${MONTHLY.billedAs}, renews until you cancel.`}
          </p>
        </div>

        <button
          type="button"
          onClick={start}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: BLUE }}
        >
          {trial ? `Start my ${INTRO_PRICE} trial` : MONTHLY.fullPriceCta}
          <ArrowRight className="size-4" />
        </button>
        <button type="button" onClick={close} className="mt-2 w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          Not now
        </button>
        <p className="mt-2 text-center text-[11px] leading-snug text-muted-foreground">{PAYMENT_TERMS}</p>
      </div>
    </div>
  );
}
