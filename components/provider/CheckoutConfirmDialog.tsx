"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Lock, X } from "lucide-react";
import type { CheckoutPlan } from "@/lib/billing";
import { INTRO_DAYS, INTRO_PRICE, TERMS_URL, type PlanInfo } from "@/lib/plans";

/**
 * Confirms the plan and the exact charges before Stripe Checkout opens. The
 * checkbox here is the explicit consent the server requires (accept_terms, recorded
 * as terms_accepted_at on the subscription); continuing without it is not possible.
 * Same overlay pattern as NewWebinarDialog: a bottom sheet on phones, centred above.
 */

const GREEN = "#1a4a3a";
const MONTHS: Record<CheckoutPlan, number> = { monthly: 1, annual: 12, two_year: 24 };
const TITLE: Record<CheckoutPlan, string> = { monthly: "Monthly", annual: "Annual", two_year: "Two-year" };

/** When the first full price is charged: after the 7-day week, or one interval from today. */
export function firstRenewal(plan: CheckoutPlan, intro: boolean | null, now = new Date()): Date {
  if (intro !== false) return new Date(now.getTime() + INTRO_DAYS * 86_400_000);
  const d = new Date(now);
  d.setMonth(d.getMonth() + MONTHS[plan]);
  return d;
}

const formatDate = (d: Date) => d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

interface Props {
  plan: PlanInfo | null;
  plans: PlanInfo[];
  /** First-time subscriber? null while it can't be confirmed. */
  intro: boolean | null;
  checking: boolean;
  busy: boolean;
  error: string;
  onChangePlan: (plan: CheckoutPlan) => void;
  onConfirm: (plan: CheckoutPlan) => void;
  onClose: () => void;
}

export function CheckoutConfirmDialog({ plan, plans, intro, checking, busy, error, onChangePlan, onConfirm, onClose }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [needsAgreement, setNeedsAgreement] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const open = plan !== null;

  // Focus moves into the dialog (its title is announced) and returns to the plan button afterwards.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => panelRef.current?.focus(), 30);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [open]);

  // Tab stays inside the dialog; Escape closes it (not while checkout is opening).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled])")];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  // A new plan or a reopened dialog asks for consent again.
  useEffect(() => {
    setAgreed(false);
    setNeedsAgreement(false);
  }, [plan?.id]);

  if (!plan) return null;

  const renewal = formatDate(firstRenewal(plan.id, intro));
  const today = intro === true ? INTRO_PRICE : intro === false ? plan.price : null;
  const interval = plan.renews ?? "";

  function confirm() {
    if (!plan || busy) return;
    if (!agreed) {
      setNeedsAgreement(true);
      checkboxRef.current?.focus();
      return;
    }
    onConfirm(plan.id);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={() => !busy && onClose()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-confirm-title"
        aria-describedby="checkout-confirm-summary"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] outline-none w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e6ece6] px-5 pb-4 pt-5 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Confirm your plan</p>
            <h2 id="checkout-confirm-title" className="mt-1 font-serif text-2xl font-bold leading-tight tracking-[-0.02em]" style={{ color: GREEN }}>
              {TITLE[plan.id]} plan
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-border hover:bg-secondary disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 sm:px-6">
          <div role="radiogroup" aria-label="Change plan" className="grid grid-cols-3 gap-1 rounded-2xl bg-[#eef7ee] p-1">
            {plans.map((p) => {
              const selected = p.id === plan.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={busy}
                  onClick={() => onChangePlan(p.id)}
                  className={`rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:text-sm ${selected ? "bg-white shadow-sm" : "hover:bg-white/60"}`}
                  style={{ color: GREEN }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          <dl id="checkout-confirm-summary" className="mt-4 divide-y divide-[#e6ece6] rounded-2xl border border-[#cfe3cf]">
            <div className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted-foreground">Charged today</dt>
              <dd className="text-right font-serif text-2xl font-bold" style={{ color: GREEN }}>
                {checking ? <span className="font-sans text-sm font-medium text-muted-foreground">Checking…</span> : today ?? `${INTRO_PRICE} or ${plan.price}`}
              </dd>
            </div>
            {intro !== false ? (
              <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-sm text-muted-foreground">Introductory period</dt>
                <dd className="text-right text-sm font-semibold text-[#1d2a27]">{INTRO_DAYS} days for {INTRO_PRICE}, one time</dd>
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted-foreground">{intro !== false ? "First full charge" : "Next charge"}</dt>
              <dd className="text-right text-sm font-semibold text-[#1d2a27]">
                {plan.price} on {renewal}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="text-sm text-muted-foreground">Then</dt>
              <dd className="text-right text-sm font-semibold text-[#1d2a27]">
                {plan.price} {interval}
              </dd>
            </div>
          </dl>
          {intro === null && !checking ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {INTRO_PRICE} if this is your first subscription, otherwise {plan.price}. Stripe shows the exact amount before you pay.
            </p>
          ) : null}

          <ul className="mt-4 space-y-2 text-[13px] leading-snug text-[#1d2a27]">
            <li>
              <strong>Automatic renewal.</strong>{" "}
              {intro !== false
                ? `Unless you cancel before ${renewal}, your card is charged ${plan.price} then and ${interval} after that until you cancel.`
                : `Your card is charged ${plan.price} today and ${interval} after that until you cancel.`}
            </li>
            <li>
              <strong>Cancel anytime</strong> in Manage billing. No further charges are made and you keep access until the end of the period
              you&apos;ve paid for{intro !== false ? " (or the end of your 7 days)" : ""}.
            </li>
            <li>
              <strong>Refunds.</strong> Payments{intro !== false ? `, including the ${INTRO_PRICE} charge,` : ""} are non-refundable, except
              where a refund is required by law, such as under the Australian Consumer Law.
            </li>
          </ul>
          <a
            href={TERMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-semibold underline underline-offset-4"
            style={{ color: GREEN }}
          >
            Read the full Terms of Service
          </a>

          <label className={`mt-4 flex cursor-pointer items-start gap-2.5 rounded-2xl border p-3 text-sm text-[#1d2a27] ${needsAgreement && !agreed ? "border-red-300 bg-red-50" : "border-[#cfe3cf]"}`}>
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={agreed}
              disabled={busy}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setNeedsAgreement(false);
              }}
              aria-describedby={needsAgreement && !agreed ? "checkout-consent-needed" : undefined}
              className="mt-0.5 size-4 shrink-0"
              style={{ accentColor: GREEN }}
            />
            <span>
              I agree to these terms and authorise Webinar Stack to charge my card {today ?? "the amount shown at checkout"} today and {plan.price}{" "}
              {interval} from {renewal} until I cancel.
            </span>
          </label>
          {needsAgreement && !agreed ? (
            <p id="checkout-consent-needed" role="alert" className="mt-1.5 text-xs font-medium text-red-700">
              Please tick the box to agree to the payment terms.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-[#e6ece6] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-5">
          <button
            type="button"
            onClick={confirm}
            disabled={busy || checking}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition-opacity disabled:cursor-wait disabled:opacity-70"
            style={{ background: GREEN }}
          >
            {busy ? "Opening secure checkout…" : "Agree & Continue to Secure Checkout"}
            {busy ? null : <ArrowRight className="size-4" />}
          </button>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="size-3" /> You pay on Stripe&apos;s secure page.
          </p>
        </div>
      </div>
    </div>
  );
}
