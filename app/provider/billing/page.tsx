"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, Check, CreditCard, Crown, Gift } from "lucide-react";
import type { ComponentType } from "react";

/**
 * Billing. Three ways to pay for the same product. Card payments are not
 * switched on yet, so no button here charges anything: each says so, and the
 * page makes no claim about features the product doesn't have.
 */

const GREEN = "#1a4a3a";

const FEATURES = [
  "Unlimited webinars and registration pages",
  "55 designer page templates in your brand colours",
  "Confirmation and reminder emails with calendar invites",
  "Registrant list with CSV export",
  "AI Webinar Chat to define your ideal buyer",
  "AI Webinar Offer: a strategy for how to sell and grow",
  "AI Webinar Content: slide decks with .pptx and PDF export",
  "Brand assets library for logos and files",
];

type Plan = {
  id: string;
  name: string;
  tagline: string;
  Icon: ComponentType<{ className?: string }>;
  was?: string;
  price: string;
  unit: string;
  note: string;
  badge?: string;
  popular?: boolean;
  cta: string;
};

const PLANS: Plan[] = [
  {
    id: "monthly",
    name: "Monthly",
    tagline: "Perfect for getting started.",
    Icon: Gift,
    price: "$22",
    unit: "/mo",
    note: "Billed monthly",
    cta: "Start monthly",
  },
  {
    id: "annual",
    name: "Annually",
    tagline: "Best value for growing businesses.",
    Icon: Crown,
    was: "$264/yr",
    price: "$99",
    unit: "/yr",
    note: "Billed once a year, about $8.25 a month",
    badge: "Save 62%",
    popular: true,
    cta: "Start annually",
  },
  {
    id: "lifetime",
    name: "Life time",
    tagline: "Forever. No recurring costs.",
    Icon: Building2,
    price: "$222",
    unit: "",
    note: "Pay once",
    badge: "Pays for itself in about 2 years",
    cta: "Get lifetime",
  },
];

export default function BillingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex items-center gap-3">
        <Link
          href="/provider/webinars"
          aria-label="Back to webinars"
          className="grid size-9 place-items-center rounded-xl border border-border bg-card transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Billing</h1>
          <p className="text-sm text-muted-foreground">You&apos;re not on a paid plan yet. Every plan includes everything below.</p>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] bg-[#dff0df] p-4 sm:p-8">
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3 lg:gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-[28px] bg-white p-6 sm:p-8 ${
                plan.popular ? "border-2 shadow-[0_24px_50px_-28px_rgba(26,74,58,0.55)] lg:-my-3" : "border border-white shadow-[0_18px_40px_-34px_rgba(26,74,58,0.5)]"
              }`}
              style={plan.popular ? { borderColor: GREEN } : undefined}
            >
              {plan.popular ? (
                <span
                  className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white"
                  style={{ background: GREEN }}
                >
                  Most popular
                </span>
              ) : null}

              <div className="flex items-center gap-3.5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e3f1e3]" style={{ color: GREEN }}>
                  <plan.Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-serif text-2xl font-bold leading-tight tracking-[-0.02em]" style={{ color: GREEN }}>
                    {plan.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1" style={{ color: GREEN }}>
                {plan.was ? <span className="text-base font-medium text-muted-foreground line-through">{plan.was}</span> : null}
                <span className="font-serif text-5xl font-bold tracking-[-0.03em]">{plan.price}</span>
                {plan.unit ? <span className="font-serif text-2xl font-bold">{plan.unit}</span> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{plan.note}</p>
              {plan.badge ? (
                <span className="mt-3 inline-flex w-fit rounded-full bg-[#dff0df] px-3 py-1 text-xs font-semibold" style={{ color: GREEN }}>
                  {plan.badge}
                </span>
              ) : null}

              <ul className="mt-6 flex-1 space-y-3 border-t border-[#e6ece6] pt-6">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-[15px] leading-snug text-[#1d2a27]">
                    <Check className="mt-0.5 size-4 shrink-0" style={{ color: GREEN }} strokeWidth={2.5} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled
                className={`mt-8 inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full text-sm font-semibold ${
                  plan.popular ? "text-white opacity-90" : "border border-[#cfdccf] bg-white opacity-90"
                }`}
                style={plan.popular ? { background: GREEN } : { color: GREEN }}
                title="Card payments aren't switched on yet"
              >
                {plan.cta}
                <ArrowRight className="size-4" />
              </button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">Coming soon. Nothing is charged yet.</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-[24px] border border-[#cfe3cf] bg-[#e8f4e8] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full text-white" style={{ background: GREEN }}>
              <CreditCard className="size-5" />
            </span>
            <div>
              <p className="font-serif text-lg font-bold" style={{ color: GREEN }}>
                Card payments are coming soon
              </p>
              <p className="text-sm text-muted-foreground">You&apos;ll add and manage your card here. Until then, nothing is charged and nothing is locked.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
