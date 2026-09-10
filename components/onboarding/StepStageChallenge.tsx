"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Compass, AlertCircle } from "lucide-react";
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
  },
  {
    id: "need-customers",
    label: "I have a business but need more customers",
    description: "Product is live, but pipeline is irregular and revenue needs consistency.",
  },
  {
    id: "regular-customers",
    label: "I have regular customers and want to grow",
    description: "Consistent traction, looking to optimize conversion funnels and expand reach.",
  },
  {
    id: "scaling",
    label: "My business is established and I'm scaling",
    description: "Predictable revenue, scaling teams, automation, and multi-channel acquisition.",
  },
];

const CHALLENGES = [
  "Getting customers",
  "Generating leads",
  "Increasing sales",
  "Marketing",
  "Building my brand",
  "Automating my business",
  "Creating content",
  "Managing customers",
  "I'm not sure yet",
];

export function StepStageChallenge({ data, onChange }: StepStageChallengeProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Where are you right now?
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Understanding your current stage and bottlenecks helps us calibrate the right frameworks for you.
        </p>
      </div>

      {/* Q6: Business Stage */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Compass className="size-4 text-[var(--primary)]" />
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
            What stage is your business currently at? <span className="text-[var(--accent)]">*</span>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BUSINESS_STAGES.map((stage) => {
            const isSelected = data.businessStage === stage.label;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onChange({ businessStage: stage.label })}
                className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--card)] shadow-xs ring-1 ring-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">
                    {stage.label}
                  </h4>
                  {isSelected ? (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]"
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </motion.div>
                  ) : (
                    <div className="size-4 shrink-0 rounded-full border border-[var(--border)] group-hover:border-[var(--border-strong)]" />
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                  {stage.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q7: Biggest Challenge */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-4 text-[var(--accent)]" />
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
            What is your biggest challenge right now? <span className="text-[var(--accent)]">*</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {CHALLENGES.map((challenge) => {
            const isSelected = data.biggestChallenge === challenge;
            return (
              <button
                key={challenge}
                type="button"
                onClick={() => onChange({ biggestChallenge: challenge })}
                className={`group relative flex items-center justify-between rounded-xl border p-3 text-left text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--card)] text-[var(--primary)] shadow-xs ring-1 ring-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                }`}
              >
                <span>{challenge}</span>
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
