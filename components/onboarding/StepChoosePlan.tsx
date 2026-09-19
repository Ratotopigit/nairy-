"use client";

import React from "react";
import { Check, Sparkles } from "lucide-react";
import { OnboardingData, SubscriptionTier } from "@/lib/onboarding";

interface StepChoosePlanProps {
  data: OnboardingData;
  isSubmitting: boolean;
  onSelectAndSubmit: (plan: SubscriptionTier) => void;
}

const PLANS: Array<{
  id: SubscriptionTier;
  title: string;
  tagline: string;
  price: string;
  period: string;
  popular?: boolean;
  buttonLabel: string;
  features: string[];
}> = [
  {
    id: "free",
    title: "Free",
    tagline: "Foundational starter material.",
    price: "$0",
    period: "forever",
    buttonLabel: "Get Started Free",
    features: [
      "Foundational Academy blueprints",
      "1 AI Webinar Chat exploration session",
      "Basic presentation templates",
    ],
  },
  {
    id: "pro",
    title: "Pro",
    tagline: "Full access to tools & automations.",
    price: "$49",
    period: "mo",
    popular: true,
    buttonLabel: "Select Pro",
    features: [
      "Full Academy learning paths",
      "Unlimited Webinar Chat & Webinar Offer",
      "Slide deck AI generation & PPTX",
    ],
  },
  {
    id: "premium",
    title: "Premium",
    tagline: "VIP access & 1-on-1 strategic advisor.",
    price: "$149",
    period: "mo",
    buttonLabel: "Go Premium",
    features: [
      "Everything in Pro + VIP mastermind",
      "1-on-1 monthly strategic consult",
      "Custom AI prompt engines & setups",
    ],
  },
];

export function StepChoosePlan({
  data,
  isSubmitting,
  onSelectAndSubmit,
}: StepChoosePlanProps) {
  return (
    <div className="space-y-5">
      {/* Step Heading */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Choose the plan that fits your growth
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Select your subscription tier to finalize workspace setup. You can adjust anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-stretch">
        {PLANS.map((plan) => {
          const isSelected = data.selectedPlan === plan.id;
          const isPopular = Boolean(plan.popular);

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                isPopular
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
                  {plan.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plan.tagline}
                </p>

                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    /{plan.period}
                  </span>
                </div>

                <ul className="mt-3.5 space-y-2 border-t border-border pt-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-foreground leading-snug">
                      <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-0.5">
                        <Check className="size-2 stroke-[3]" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t border-border">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onSelectAndSubmit(plan.id)}
                  className={`w-full py-2.5 px-3 rounded-full font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 disabled:cursor-wait disabled:opacity-70 focus:outline-none focus:ring-1 focus:ring-primary ${
                    isPopular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-foreground border border-border hover:bg-secondary"
                  }`}
                >
                  {isSubmitting && isSelected ? (
                    <>
                      <div className="size-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      <span>Setting up...</span>
                    </>
                  ) : (
                    <>
                      <span>{plan.buttonLabel}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-1">
        <p className="text-xs text-muted-foreground">
          Encrypted data isolation • Cancel or upgrade anytime
        </p>
      </div>
    </div>
  );
}
