"use client";

import React, { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { OnboardingData, SubscriptionTier } from "@/lib/onboarding";
import { billingEnabled } from "@/lib/billing";
import { CONSENT_LABEL, PAYMENT_TERMS, PLAN_CATALOG, PLAN_FEATURES, introTerms } from "@/lib/plans";

/**
 * Last onboarding step. Shows exactly the plans and prices of the Billing page
 * (both read lib/plans.ts). Picking a plan opens Stripe Checkout once card
 * payments are switched on; until then it only records the preference.
 */

interface StepChoosePlanProps {
  data: OnboardingData;
  isSubmitting: boolean;
  onSelectAndSubmit: (plan: SubscriptionTier) => void;
}

export function StepChoosePlan({
  data,
  isSubmitting,
  onSelectAndSubmit,
}: StepChoosePlanProps) {
  // Paying needs an explicit yes to the recurring terms; "Decide later" does not.
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="space-y-5">
      {/* Step Heading */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Choose the plan that fits your growth
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Every plan includes everything. Pick how you&apos;d like to pay.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-stretch">
        {PLAN_CATALOG.map((plan) => {
          const isSelected = data.selectedPlan === plan.id;
          const isPopular = Boolean(plan.popular);

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                isSelected || isPopular
                  ? "border-primary bg-primary/[0.02] ring-1 ring-primary"
                  : "border-border bg-card hover:border-border-strong"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-2.5 right-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
                    <Sparkles className="size-2.5" />
                    Popular
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-foreground">
                  {plan.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plan.tagline}
                </p>

                <div className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5">
                  {plan.was ? (
                    <span className="text-xs font-medium text-muted-foreground line-through">{plan.was}</span>
                  ) : null}
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  {plan.unit ? (
                    <span className="text-xs text-muted-foreground font-medium">{plan.unit}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{plan.note}</p>
                {billingEnabled && plan.renews ? (
                  <p className="mt-1 text-xs font-medium text-foreground">New here? {introTerms(plan)}</p>
                ) : null}
                {plan.badge ? (
                  <span className="mt-2 inline-flex w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {plan.badge}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 pt-3 border-t border-border">
                <button
                  type="button"
                  disabled={isSubmitting || (billingEnabled && !agreed)}
                  onClick={() => onSelectAndSubmit(plan.id)}
                  className={`w-full py-2.5 px-3 rounded-full font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-1 focus:ring-primary ${
                    isPopular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-foreground border border-border hover:bg-secondary"
                  }`}
                >
                  {isSubmitting && isSelected ? (
                    <>
                      <div className="size-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      <span>{billingEnabled ? "Opening checkout..." : "Setting up..."}</span>
                    </>
                  ) : (
                    <span>{plan.cta}</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {PLAN_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs text-foreground leading-snug">
            <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-0.5">
              <Check className="size-2 stroke-[3]" />
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-1.5 pt-1 text-center">
        <p className="text-xs text-muted-foreground">
          {billingEnabled
            ? "Secure checkout by Stripe. Promo codes are entered at checkout."
            : "Card payments are coming soon. Nothing is charged yet."}
        </p>
        {billingEnabled ? <p className="max-w-md text-xs font-medium text-foreground">{PAYMENT_TERMS}</p> : null}
        {billingEnabled ? (
          <label className="flex max-w-md cursor-pointer items-start gap-2 text-left text-xs text-foreground">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>{CONSENT_LABEL}</span>
          </label>
        ) : null}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onSelectAndSubmit("none")}
          className="text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:cursor-wait disabled:opacity-60"
        >
          {isSubmitting && data.selectedPlan === "none" ? "Setting up..." : "Decide later"}
        </button>
      </div>
    </div>
  );
}
