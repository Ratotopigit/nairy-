"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Check,
  Target,
  UserPlus,
  TrendingUp,
  Sparkles,
  Users,
  Zap,
  Megaphone,
  ShoppingCart,
  Layers,
  Rocket,
} from "lucide-react";
import { OnboardingData } from "@/lib/onboarding";

interface StepGoalsAccomplishmentProps {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

const GOALS = [
  { label: "Get more leads", icon: Target },
  { label: "Get more customers", icon: UserPlus },
  { label: "Increase sales", icon: TrendingUp },
  { label: "Build my brand", icon: Sparkles },
  { label: "Grow my audience", icon: Users },
  { label: "Automate my business", icon: Zap },
  { label: "Improve my marketing", icon: Megaphone },
  { label: "Sell products/services online", icon: ShoppingCart },
  { label: "Create digital products", icon: Layers },
  { label: "Scale my business", icon: Rocket },
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
    <div className="space-y-5">
      {/* Step Heading */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          What do you want to achieve?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Define your target outcomes so we can prioritize the most impactful playbooks and automated workflows.
        </p>
      </div>

      {/* Q8: Main Goals (Multi-select) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-foreground">
            What is your main goal? <span className="text-accent">*</span>
          </label>
          <span className="text-xs text-muted-foreground">
            Select all that apply
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {GOALS.map(({ label, icon: Icon }) => {
            const isSelected = (data.mainGoals || []).includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleGoal(label)}
                className={`group relative flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border bg-card text-foreground hover:border-border-strong hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Icon
                    className={`size-4 shrink-0 transition-colors ${
                      isSelected
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  <span className="text-xs font-semibold truncate leading-snug">
                    {label}
                  </span>
                </div>
                {isSelected ? (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="size-2.5 stroke-[3]" />
                  </motion.div>
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-border-strong group-hover:border-border-strong" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Q9: 3–6 Month Accomplishment */}
      <div className="space-y-2">
        <label htmlFor="targetAccomplishment" className="block text-sm font-semibold text-foreground">
          What would you like to accomplish in 3–6 months?{" "}
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="targetAccomplishment"
          rows={3}
          value={data.targetAccomplishment}
          onChange={(e) => onChange({ targetAccomplishment: e.target.value })}
          placeholder="e.g., Launch our flagship group program and generate $30k in new monthly recurring revenue..."
          className="w-full rounded-2xl border border-border bg-card p-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all hover:border-border-strong focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}
