"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Check,
  Compass,
  Target,
  TrendingUp,
  Rocket,
  UserPlus,
  Megaphone,
  Sparkles,
  Zap,
  PenTool,
  Users,
  HelpCircle,
} from "lucide-react";
import { OnboardingData } from "@/lib/onboarding";

interface StepStageChallengeProps {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

const BUSINESS_STAGES = [
  {
    id: "getting-started",
    label: "I'm just getting started",
    description: "Validating an offer, building foundational audience, or launching first product.",
    icon: Compass,
  },
  {
    id: "need-customers",
    label: "I have a business but need more customers",
    description: "Product is live, but pipeline is irregular and revenue needs consistency.",
    icon: Target,
  },
  {
    id: "regular-customers",
    label: "I have regular customers and want to grow",
    description: "Consistent traction, looking to optimize conversion funnels and expand reach.",
    icon: TrendingUp,
  },
  {
    id: "scaling",
    label: "My business is established and I'm scaling",
    description: "Predictable revenue, scaling teams, automation, and multi-channel acquisition.",
    icon: Rocket,
  },
];

const CHALLENGES = [
  { label: "Getting customers", icon: UserPlus },
  { label: "Generating leads", icon: Target },
  { label: "Increasing sales", icon: TrendingUp },
  { label: "Marketing", icon: Megaphone },
  { label: "Building my brand", icon: Sparkles },
  { label: "Automating my business", icon: Zap },
  { label: "Creating content", icon: PenTool },
  { label: "Managing customers", icon: Users },
  { label: "I'm not sure yet", icon: HelpCircle },
];

export function StepStageChallenge({ data, onChange }: StepStageChallengeProps) {
  return (
    <div className="space-y-5">
      {/* Step Heading */}
      <div>
        <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--foreground)]">
          Where are you right now?
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
          Understanding your current stage and bottlenecks helps us calibrate the right frameworks for you.
        </p>
      </div>

      {/* Q6: Business Stage */}
      <div className="space-y-2">
        <label className="block text-xs sm:text-sm font-bold text-[var(--foreground)]">
          What stage is your business currently at? <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BUSINESS_STAGES.map((stage) => {
            const isSelected = data.businessStage === stage.label;
            const Icon = stage.icon;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onChange({ businessStage: stage.label })}
                className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-150 focus:outline-none ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)]/[0.03] text-[var(--primary)] ring-1 ring-[var(--primary)] shadow-2xs"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <Icon
                      className={`size-4 shrink-0 transition-colors ${
                        isSelected
                          ? "text-[var(--primary)]"
                          : "text-slate-500 group-hover:text-slate-700"
                      }`}
                    />
                    <h4 className="text-xs sm:text-sm font-semibold truncate leading-snug">
                      {stage.label}
                    </h4>
                  </div>
                  {isSelected ? (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white"
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </motion.div>
                  ) : (
                    <span className="size-4 shrink-0 rounded-full border border-slate-300 group-hover:border-slate-400" />
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  {stage.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q7: Biggest Challenge */}
      <div className="space-y-2">
        <label className="block text-xs sm:text-sm font-bold text-[var(--foreground)]">
          What is your biggest challenge right now? <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {CHALLENGES.map(({ label, icon: Icon }) => {
            const isSelected = data.biggestChallenge === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ biggestChallenge: label })}
                className={`group relative flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-150 focus:outline-none ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)]/[0.03] text-[var(--primary)] ring-1 ring-[var(--primary)] shadow-2xs"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Icon
                    className={`size-4 shrink-0 transition-colors ${
                      isSelected
                        ? "text-[var(--primary)]"
                        : "text-slate-500 group-hover:text-slate-700"
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
                    className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white"
                  >
                    <Check className="size-2.5 stroke-[3]" />
                  </motion.div>
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-slate-300 group-hover:border-slate-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
