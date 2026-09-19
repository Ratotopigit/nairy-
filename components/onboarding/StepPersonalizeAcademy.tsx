"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Check,
  Megaphone,
  Target,
  TrendingUp,
  Zap,
  PenTool,
  Globe,
  Users,
  Rocket,
  Sparkles,
  Video,
  BookOpen,
  Briefcase,
  FileText,
  GraduationCap,
  Layers,
  Clock,
} from "lucide-react";
import { OnboardingData } from "@/lib/onboarding";

interface StepPersonalizeAcademyProps {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

const LEARNING_TOPICS = [
  { label: "Marketing", icon: Megaphone },
  { label: "Lead generation", icon: Target },
  { label: "Sales", icon: TrendingUp },
  { label: "Automation", icon: Zap },
  { label: "Content creation", icon: PenTool },
  { label: "Building an online business", icon: Globe },
  { label: "Growing my audience", icon: Users },
  { label: "Scaling my business", icon: Rocket },
  { label: "Using AI for business", icon: Sparkles },
];

const LEARNING_PREFERENCES = [
  { label: "Quick videos", icon: Video },
  { label: "Step-by-step guides", icon: BookOpen },
  { label: "Practical projects", icon: Briefcase },
  { label: "Templates/resources", icon: FileText },
  { label: "Full courses", icon: GraduationCap },
  { label: "A mixture", icon: Layers },
];

const TIME_COMMITMENTS = [
  { label: "Less than 1 hour", icon: Clock },
  { label: "1–3 hours", icon: Clock },
  { label: "3–5 hours", icon: Clock },
  { label: "5+ hours", icon: Clock },
];

export function StepPersonalizeAcademy({
  data,
  onChange,
}: StepPersonalizeAcademyProps) {
  return (
    <div className="space-y-4">
      {/* Step Heading */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Personalize your Academy curriculum
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Customize your learning path so you receive the highest-relevance modules first.
        </p>
      </div>

      {/* Q12: What would you like to learn first? */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-foreground">
          What would you like to learn first? <span className="text-accent">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LEARNING_TOPICS.map(({ label, icon: Icon }) => {
            const isSelected = data.primaryLearningInterest === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ primaryLearningInterest: label })}
                className={`group relative flex items-center justify-between rounded-2xl border px-3 py-2 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border bg-card text-foreground hover:border-border-strong hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Icon
                    className={`size-3.5 sm:size-4 shrink-0 transition-colors ${
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

      {/* Q13: How do you prefer to learn? */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-foreground">
          How do you prefer to learn? <span className="text-accent">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LEARNING_PREFERENCES.map(({ label, icon: Icon }) => {
            const isSelected = data.learningPreference === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ learningPreference: label })}
                className={`group relative flex items-center justify-between rounded-2xl border px-3 py-2 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border bg-card text-foreground hover:border-border-strong hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Icon
                    className={`size-3.5 sm:size-4 shrink-0 transition-colors ${
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

      {/* Q14: How much time can you spend learning each week? */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-foreground">
          Weekly learning commitment <span className="text-accent">*</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TIME_COMMITMENTS.map(({ label, icon: Icon }) => {
            const isSelected = data.weeklyTimeCommitment === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ weeklyTimeCommitment: label })}
                className={`group relative flex items-center justify-between rounded-2xl border px-3 py-2 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border bg-card text-foreground hover:border-border-strong hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <Icon
                    className={`size-3.5 sm:size-4 shrink-0 transition-colors ${
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
