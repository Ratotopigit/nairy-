"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, Check, CreditCard, Crown, Gift } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { billingEnabled, billingTestMode, createCheckoutUrl, createPortalUrl, useEntitlement, type CheckoutPlan } from "@/lib/billing";
import { CONSENT_LABEL, PAYMENT_TERMS, PLAN_CATALOG, PLAN_FEATURES, clearPendingPlan, introTerms, pendingPlan } from "@/lib/plans";

/**
 * Billing. Three ways to pay for the same product. Checkout is hosted by
 * Stripe; this page only starts it and shows the plan the server has recorded.
 * Builds without a Stripe publishable key keep the "coming soon" state, so no
 * button ever points at a checkout that isn't there. The page makes no claim
 * about features the product doesn't have.
 */

const GREEN = "#1a4a3a";

const ICONS: Record<CheckoutPlan, ComponentType<{ className?: string }>> = { monthly: Gift, annual: Crown, two_year: Building2 };

// Prices live in lib/plans.ts, shared with the first-login plan step.
const PLANS = PLAN_CATALOG.map((plan) => ({ ...plan, Icon: ICONS[plan.id] }));

const CONFIRM_TIMEOUT_MS = 45_000;

const PLAN_LABEL: Record<CheckoutPlan, string> = { monthly: "Monthly", annual: "Annual", two_year: "Two-year" };

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function BillingPage() {
  const { loading, record, paid } = useEntitlement();
  const [pending, setPending] = useState<CheckoutPlan | null>(null);
  const [error, setError] = useState("");
  // Stripe sends people back before the server has recorded the payment. The
  // flag is read from the address once, into state: the address is cleaned up
  // straight away, and a remount must not lose track of the payment.
  const [returned, setReturned] = useState<"success" | "cancelled" | null>(null);
  const [gaveUpWaiting, setGaveUpWaiting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  // The plan picked before signing in (promo site link), highlighted until they pay.
  const [picked, setPicked] = useState<CheckoutPlan | null>(null);

  useEffect(() => {
    setPicked(pendingPlan());
    const status = new URLSearchParams(window.location.search).get("status");
    if (status === "success" || status === "cancelled") {
      setReturned(status);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const waitingForPayment = returned === "success" && !paid;
  useEffect(() => {
    if (!waitingForPayment) return;
    const timer = window.setTimeout(() => setGaveUpWaiting(true), CONFIRM_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [waitingForPayment]);

  async function startCheckout(plan: CheckoutPlan) {
    setError("");
    setPending(plan);
    try {
      const url = await createCheckoutUrl(plan, agreed);
      clearPendingPlan();
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout. Try again.");
      setPending(null);
    }
  }

  const [openingPortal, setOpeningPortal] = useState(false);
  async function openPortal() {
    setError("");
    setOpeningPortal(true);
    try {
      window.location.assign(await createPortalUrl());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open billing management. Try again.");
      setOpeningPortal(false);
    }
  }

  const currentPlan = paid && record.plan !== "none" ? record.plan : null;
  const endDate = record.currentPeriodEnd ? formatDate(record.currentPeriodEnd) : "";
  let subtitle = "You're not on a paid plan yet. Every plan includes everything below.";
  if (currentPlan === "lifetime") {
    subtitle = "You have lifetime access. Everything below is included.";
  } else if (currentPlan) {
    const name = PLAN_LABEL[currentPlan];
    if (record.status === "past_due") {
      subtitle = `Your last payment for the ${name} plan didn't go through. Update your card under Manage billing to keep access.`;
    } else if (record.status === "trialing" && !record.cancelAtPeriodEnd) {
      const info = PLAN_CATALOG.find((p) => p.id === currentPlan);
      subtitle = `You're on the ${name} plan, in your introductory week.${
        endDate && info ? ` From ${endDate} you'll be charged ${info.price} ${info.renews ?? ""} until you cancel.` : ""
      }`;
    } else if (record.cancelAtPeriodEnd) {
      subtitle = `Your ${name} plan is cancelled and ends${endDate ? ` on ${endDate}` : " at the end of the paid period"}.`;
    } else {
      subtitle = `You're on the ${name} plan.${endDate ? ` It renews on ${endDate}.` : ""}`;
    }
  } else if (loading && billingEnabled) {
    subtitle = "Checking your plan…";
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/provider/webinars"
          aria-label="Back to webinars"
          className="grid size-9 place-items-center rounded-xl border border-border bg-card transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Billing</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {billingEnabled && record.hasStripeCustomer ? (
          <button
            type="button"
            onClick={() => void openPortal()}
            disabled={openingPortal}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#cfdccf] bg-white px-4 text-sm font-semibold transition-opacity disabled:cursor-wait disabled:opacity-60"
            style={{ color: GREEN }}
          >
            <CreditCard className="size-4" />
            {openingPortal ? "Opening…" : "Manage billing"}
          </button>
        ) : null}
      </div>

      {returned === "success" ? (
        <p role="status" className="mt-4 rounded-2xl border border-[#cfe3cf] bg-[#e8f4e8] px-4 py-3 text-sm" style={{ color: GREEN }}>
          {paid
            ? "Payment received. Thank you, your plan is active."
            : gaveUpWaiting
              ? "Your payment went through but is still being confirmed. This can take a minute, so refresh this page shortly. You won't be charged twice."
              : "Payment received. Confirming your plan…"}
        </p>
      ) : null}
      {returned === "cancelled" ? (
        <p role="status" className="mt-4 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Checkout cancelled. Nothing was charged.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 rounded-[28px] bg-[#dff0df] p-4 sm:p-6">
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3 lg:gap-5">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const locked = !billingEnabled || paid || pending !== null || loading || !agreed;
            const highlight = plan.popular || (!currentPlan && picked === plan.id);
            const label = !billingEnabled ? plan.cta : isCurrent ? "Your plan" : pending === plan.id ? "Opening checkout…" : plan.cta;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl bg-white p-5 transition-transform duration-200 hover:-translate-y-0.5 ${
                  highlight ? "border-2 shadow-[0_24px_50px_-28px_rgba(26,74,58,0.55)] lg:-my-2" : "border border-white shadow-[0_18px_40px_-34px_rgba(26,74,58,0.5)]"
                }`}
                style={highlight ? { borderColor: GREEN } : undefined}
              >
                {plan.popular ? (
                  <span
                    className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white"
                    style={{ background: GREEN }}
                  >
                    Most popular
                  </span>
                ) : null}

                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#e3f1e3]" style={{ color: GREEN }}>
                    <plan.Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-serif text-xl font-bold leading-tight tracking-[-0.02em]" style={{ color: GREEN }}>
                      {plan.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1" style={{ color: GREEN }}>
                  {plan.was ? <span className="text-base font-medium text-muted-foreground line-through">{plan.was}</span> : null}
                  <span className="font-serif text-4xl font-bold tracking-[-0.03em]">{plan.price}</span>
                  {plan.unit ? <span className="font-serif text-lg font-bold">{plan.unit}</span> : null}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{plan.note}</p>
                {billingEnabled && plan.renews && !currentPlan ? (
                  <p className="mt-1 text-xs font-medium text-[#1d2a27]">New here? {introTerms(plan)}</p>
                ) : null}
                {plan.badge ? (
                  <span className="mt-2 inline-flex w-fit rounded-full bg-[#dff0df] px-2.5 py-0.5 text-[11px] font-semibold" style={{ color: GREEN }}>
                    {plan.badge}
                  </span>
                ) : null}

                <ul className="mt-4 flex-1 space-y-2 border-t border-[#e6ece6] pt-4">
                  {PLAN_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5 text-[13px] leading-snug text-[#1d2a27]">
                      <Check className="size-3.5 shrink-0" style={{ color: GREEN }} strokeWidth={2.5} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void startCheckout(plan.id)}
                  className={`mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-opacity disabled:cursor-not-allowed ${
                    plan.popular ? "text-white" : "border border-[#cfdccf] bg-white"
                  } ${locked && !isCurrent ? "opacity-60" : ""}`}
                  style={plan.popular ? { background: GREEN } : { color: GREEN }}
                  title={billingEnabled ? undefined : "Card payments aren't switched on yet"}
                >
                  {label}
                  {isCurrent ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
                </button>
                {!billingEnabled ? (
                  <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Coming soon</p>
                ) : paid && !isCurrent ? (
                  <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Changing plans isn&apos;t available yet</p>
                ) : !paid && !agreed ? (
                  <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Tick the payment terms below to continue</p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-[24px] border border-[#cfe3cf] bg-[#e8f4e8] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full text-white" style={{ background: GREEN }}>
              <CreditCard className="size-5" />
            </span>
            <div>
              <p className="font-serif text-lg font-bold" style={{ color: GREEN }}>
                {billingEnabled ? "Secure checkout by Stripe" : "Card payments are coming soon"}
              </p>
              <p className="text-sm text-muted-foreground">
                {billingEnabled
                  ? billingTestMode
                    ? "Test mode: no real charges. Pay with card 4242 4242 4242 4242, any future date and any CVC. Promo codes are entered at checkout."
                    : "You pay on Stripe's own page, so your card details never touch our servers. Have a promo code? Enter it at checkout."
                  : "You'll add and manage your card here. Until then, nothing is charged and nothing is locked."}
              </p>
              {billingEnabled ? <p className="mt-1.5 text-sm font-medium text-[#1d2a27]">{PAYMENT_TERMS}</p> : null}
              {billingEnabled && !paid ? (
                <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-[#1d2a27]">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0"
                    style={{ accentColor: GREEN }}
                  />
                  <span>{CONSENT_LABEL}</span>
                </label>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
