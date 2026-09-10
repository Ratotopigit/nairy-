"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, GraduationCap, Video, Clock } from "lucide-react";
import { OnboardingData } from "@/lib/onboarding";

interface StepPersonalizeAcademyProps {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

const LEARNING_TOPICS = [
  "Marketing",
  "Lead generation",
  "Sales",
  "Automation",
  "Content creation",
  "Building an online business",
  "Growing my audience",
  "Scaling my business",
  "Using AI for business",
];

const LEARNING_PREFERENCES = [
  "Quick videos",
  "Step-by-step guides",
  "Practical projects",
  "Templates/resources",
  "Full courses",
  "A mixture",
];

const TIME_COMMITMENTS = [
  "Less than 1 hour",
  "1–3 hours",
  "3–5 hours",
  "5+ hours",
];

export function StepPersonalizeAcademy({
  data,
  onChange,
}: StepPersonalizeAcademyProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Personalize your Academy curriculum
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Customize your learning path so you receive the highest-relevance modules first.
        </p>
      </div>

      {/* Q12: What would you like to learn first? */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-4 text-[var(--primary)]" />
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
            What would you like to learn first? <span className="text-[var(--accent)]">*</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {LEARNING_TOPICS.map((topic) => {
            const isSelected = data.primaryLearningInterest === topic;
            return (
              <button
                key={topic}
                type="button"
                onClick={() => onChange({ primaryLearningInterest: topic })}
                className={`group relative flex items-center justify-between rounded-xl border p-3.5 text-left text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--card)] text-[var(--primary)] shadow-xs ring-1 ring-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                }`}
              >
                <span>{topic}</span>
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

      {/* Q13: How do you prefer to learn? */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Video className="size-4 text-[var(--primary)]" />
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
            How do you prefer to learn? <span className="text-[var(--accent)]">*</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {LEARNING_PREFERENCES.map((pref) => {
            const isSelected = data.learningPreference === pref;
            return (
              <button
                key={pref}
                type="button"
                onClick={() => onChange({ learningPreference: pref })}
                className={`group relative flex items-center justify-between rounded-xl border p-3.5 text-left text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--card)] text-[var(--primary)] shadow-xs ring-1 ring-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                }`}
              >
                <span>{pref}</span>
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

      {/* Q14: How much time can you spend learning each week? */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-[var(--primary)]" />
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
            How much time can you spend learning each week? <span className="text-[var(--accent)]">*</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {TIME_COMMITMENTS.map((time) => {
            const isSelected = data.weeklyTimeCommitment === time;
            return (
              <button
                key={time}
                type="button"
                onClick={() => onChange({ weeklyTimeCommitment: time })}
                className={`group relative flex items-center justify-between rounded-xl border p-3.5 text-left text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--card)] text-[var(--primary)] shadow-xs ring-1 ring-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                }`}
              >
                <span>{time}</span>
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
    </div>
  );
}
