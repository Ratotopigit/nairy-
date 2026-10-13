"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, CreditCard, Sparkles } from "lucide-react";
import { PLANS } from "@/components/onboarding/StepChoosePlan";
import { auth } from "@/lib/firebase/config";
import type { SubscriptionTier } from "@/lib/onboarding";
import { loadWorkspaceMemory } from "@/lib/workspace-memory";

const TIERS: SubscriptionTier[] = ["free", "pro", "premium"];

/**
 * Billing. The same three plan cards as the first-login screen. Card payments
 * are not switched on yet, so no plan can be bought here and nothing is
 * charged: the card for the plan chosen at sign-up is marked as yours, the
 * others say they aren't available yet.
 */
export default function BillingPage() {
  const [current, setCurrent] = useState<SubscriptionTier | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const memory = await loadWorkspaceMemory(user.uid);
      const chosen = memory?.creation_preferences?.selected_plan;
      setCurrent(typeof chosen === "string" && (TIERS as string[]).includes(chosen) ? (chosen as SubscriptionTier) : "free");
    });
    return unsubscribe;
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl">
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
          <p className="text-sm text-muted-foreground">Your plan and how you pay for it.</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-stretch gap-3.5 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = current === plan.id;
          const isPopular = Boolean(plan.popular);
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                isCurrent
                  ? "border-primary bg-primary/[0.02] ring-1 ring-primary"
                  : "border-border bg-card hover:border-border-strong"
              }`}
            >
              {isPopular && !isCurrent ? (
                <div className="absolute -top-2.5 right-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground">
                    <Sparkles className="size-2.5" />
                    Popular
                  </span>
                </div>
              ) : null}
              {isCurrent ? (
                <div className="absolute -top-2.5 right-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground">
                    Your plan
                  </span>
                </div>
              ) : null}

              <div>
                <h3 className="text-base font-bold text-foreground">{plan.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{plan.tagline}</p>

                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{plan.price}</span>
                  <span className="text-xs font-medium text-muted-foreground">/{plan.period}</span>
                </div>

                <ul className="mt-3.5 space-y-2 border-t border-border pt-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs leading-snug text-foreground">
                      <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-2 stroke-[3]" />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 border-t border-border pt-3">
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-full border border-border bg-muted px-3 py-2.5 text-xs font-semibold text-muted-foreground sm:text-sm"
                >
                  {isCurrent ? "Current plan" : plan.id === "free" ? "Free plan" : "Not available yet"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-secondary text-muted-foreground">
            <CreditCard className="size-4" />
          </span>
          <div>
            <p className="font-medium">Payment method</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Card payments aren&apos;t switched on yet, so no plan can be bought here and nothing is charged. When they are, you&apos;ll add and manage your card on this page.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
