"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Target, Calendar } from "lucide-react";
import { OnboardingData } from "@/lib/onboarding";

interface StepGoalsAccomplishmentProps {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

const GOALS = [
  "Get more leads",
  "Get more customers",
  "Increase sales",
  "Build my brand",
  "Grow my audience",
  "Automate my business",
  "Improve my marketing",
  "Sell products/services online",
  "Create digital products",
  "Scale my business",
];

export function StepGoalsAccomplishment({
  data,
  onChange,
}: StepGoalsAccomplishmentProps) {
  const toggleGoal = (goal: string) => {
    const current = data.mainGoals || [];
    if (current.includes(goal)) {
      onChange({ mainGoals: current.filter((g) => g !== goal) });
    } else {
      onChange({ mainGoals: [...current, goal] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          What do you want to achieve?
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Define your target outcomes so we can prioritize the most impactful playbooks and automated workflows.
        </p>
      </div>

      {/* Q8: Main Goals (Multi-select) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-[var(--primary)]" />
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
              What is your main goal? <span className="text-[var(--accent)]">*</span>
            </label>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">
            Select all that apply
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {GOALS.map((goal) => {
            const isSelected = (data.mainGoals || []).includes(goal);
            return (
              <button
                key={goal}
                type="button"
                onClick={() => toggleGoal(goal)}
                className={`group relative flex items-center justify-between rounded-xl border p-3.5 text-left text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--card)] text-[var(--primary)] shadow-xs ring-1 ring-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                }`}
              >
                <span>{goal}</span>
                {isSelected ? (
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]"
                  >
                    <Check className="size-2.5 stroke-[3]" />
                  </motion.span>
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-[var(--border)] group-hover:border-[var(--border-strong)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Q9: 3–6 Month Accomplishment */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-[var(--primary)]" />
          <label htmlFor="targetAccomplishment" className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
            What would you like to accomplish in the next 3–6 months?
          </label>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Optional, but helps our AI Avatar and Offer modules formulate precise strategic recommendations.
        </p>
        <textarea
          id="targetAccomplishment"
          rows={3}
          value={data.targetAccomplishment}
          onChange={(e) => onChange({ targetAccomplishment: e.target.value })}
          placeholder="e.g., Launch our flagship group program and generate $30k in new monthly recurring revenue..."
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 transition-all hover:border-[var(--border-strong)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        />
      </div>
    </div>
  );
}
