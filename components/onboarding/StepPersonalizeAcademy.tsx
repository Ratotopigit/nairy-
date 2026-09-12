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
        <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--foreground)]">
          Personalize your Academy curriculum
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
          Customize your learning path so you receive the highest-relevance modules first.
        </p>
      </div>

      {/* Q12: What would you like to learn first? */}
      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-bold text-[var(--foreground)]">
          What would you like to learn first? <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LEARNING_TOPICS.map(({ label, icon: Icon }) => {
            const isSelected = data.primaryLearningInterest === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ primaryLearningInterest: label })}
                className={`group relative flex items-center justify-between rounded-2xl border px-3 py-2 text-left transition-all duration-150 focus:outline-none ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)]/[0.03] text-[var(--primary)] ring-1 ring-[var(--primary)] shadow-2xs"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Icon
                    className={`size-3.5 sm:size-4 shrink-0 transition-colors ${
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

      {/* Q13: How do you prefer to learn? */}
      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-bold text-[var(--foreground)]">
          How do you prefer to learn? <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LEARNING_PREFERENCES.map(({ label, icon: Icon }) => {
            const isSelected = data.learningPreference === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ learningPreference: label })}
                className={`group relative flex items-center justify-between rounded-2xl border px-3 py-2 text-left transition-all duration-150 focus:outline-none ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)]/[0.03] text-[var(--primary)] ring-1 ring-[var(--primary)] shadow-2xs"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Icon
                    className={`size-3.5 sm:size-4 shrink-0 transition-colors ${
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

      {/* Q14: How much time can you spend learning each week? */}
      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-bold text-[var(--foreground)]">
          Weekly learning commitment <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TIME_COMMITMENTS.map(({ label, icon: Icon }) => {
            const isSelected = data.weeklyTimeCommitment === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ weeklyTimeCommitment: label })}
                className={`group relative flex items-center justify-between rounded-2xl border px-3 py-2 text-left transition-all duration-150 focus:outline-none ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)]/[0.03] text-[var(--primary)] ring-1 ring-[var(--primary)] shadow-2xs"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <Icon
                    className={`size-3.5 sm:size-4 shrink-0 transition-colors ${
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
