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
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Where are you right now?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Understanding your current stage and bottlenecks helps us calibrate the right frameworks for you.
        </p>
      </div>

      {/* Q6: Business Stage */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-foreground">
          What stage is your business currently at? <span className="text-accent">*</span>
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
                className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border bg-card text-foreground hover:border-border-strong hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <Icon
                      className={`size-4 shrink-0 transition-colors ${
                        isSelected
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
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
                      className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </motion.div>
                  ) : (
                    <span className="size-4 shrink-0 rounded-full border border-border-strong group-hover:border-border-strong" />
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {stage.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q7: Biggest Challenge */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-foreground">
          What is your biggest challenge right now? <span className="text-accent">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {CHALLENGES.map(({ label, icon: Icon }) => {
            const isSelected = data.biggestChallenge === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ biggestChallenge: label })}
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
    </div>
  );
}
