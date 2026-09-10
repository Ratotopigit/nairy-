"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, ShieldCheck, Zap } from "lucide-react";
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
    tagline: "Ideal for starters exploring foundational business material.",
    price: "$0",
    period: "forever free",
    buttonLabel: "Get Started Free",
    features: [
      "Access to foundational Academy lessons & blueprints",
      "1 active AI Avatar exploration session",
      "Standard community forum access",
      "Basic presentation & offer templates",
      "Standard email support",
    ],
  },
  {
    id: "pro",
    title: "Pro",
    tagline: "Full access to standard Academy paths, templates, and automations.",
    price: "$49",
    period: "per month",
    popular: true,
    buttonLabel: "Select Pro",
    features: [
      "Full access to all Academy learning paths & masterclasses",
      "Unlimited AI Avatar IQ persona sessions",
      "Unlimited Offer IQ strategy runs",
      "Automated slide deck generation & PowerPoint export",
      "Full asset library & template downloads",
      "Priority email & community support",
    ],
  },
  {
    id: "premium",
    title: "Premium",
    tagline: "Comprehensive access, VIP resources, 1-on-1 support, and advanced modules.",
    price: "$149",
    period: "per month",
    buttonLabel: "Go Premium",
    features: [
      "Everything in Pro, plus VIP mastermind access",
      "1-on-1 monthly strategic consultation & calendar hold",
      "Advanced custom AI prompt engines & multi-brand setups",
      "White-glove asset ingestion & bespoke slide themes",
      "Dedicated account advisor & instant private channel",
      "Early beta access to next-gen creation features",
    ],
  },
];

export function StepChoosePlan({
  data,
  isSubmitting,
  onSelectAndSubmit,
}: StepChoosePlanProps) {
  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left">
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Choose the plan that fits your growth
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-2xl">
          Select your subscription tier to finalize your workspace setup. You can upgrade, downgrade, or cancel anytime from your settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">
        {PLANS.map((plan) => {
          const isSelected = data.selectedPlan === plan.id;
          const isPopular = Boolean(plan.popular);

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-3xl border p-6 transition-all duration-200 ${
                isPopular
                  ? "border-[var(--primary)] bg-[var(--card)] shadow-xl ring-2 ring-[var(--primary)]/20"
                  : "border-[var(--border)] bg-[var(--card)] shadow-xs hover:border-[var(--border-strong)]"
              }`}
            >
              {/* Most Popular Badge */}
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-xs">
                    <Sparkles className="size-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                {/* Header */}
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-xl font-bold text-[var(--foreground)]">
                    {plan.title}
                  </h3>
                  {isPopular && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--primary)] font-semibold">
                      Recommended
                    </span>
                  )}
                </div>

                <p className="mt-2 text-xs text-[var(--muted-foreground)] min-h-[32px] leading-relaxed">
                  {plan.tagline}
                </p>

                {/* Price */}
                <div className="mt-5 pb-6 border-b border-[var(--border)]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
                      {plan.price}
                    </span>
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">
                      / {plan.period}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="mt-6 space-y-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-foreground)] font-semibold block">
                    What&apos;s included:
                  </span>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-[var(--foreground)] leading-snug">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)] mt-0.5">
                          <Check className="size-2.5 stroke-[3]" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onSelectAndSubmit(plan.id)}
                  className={`w-full py-3.5 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-xs disabled:cursor-wait disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                    isPopular
                      ? "bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 shadow-md"
                      : "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border-strong)] hover:bg-[var(--muted)]"
                  }`}
                >
                  {isSubmitting && data.selectedPlan === plan.id ? (
                    <>
                      <div className="size-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      <span>Setting up your workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>{plan.buttonLabel}</span>
                      {isPopular ? <Zap className="size-3.5 text-amber-300" /> : <ShieldCheck className="size-3.5 opacity-60" />}
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-2">
        <p className="text-xs text-[var(--muted-foreground)]">
          All plans come with encrypted data isolation and full compliance with our security standards.
        </p>
      </div>
    </div>
  );
}
