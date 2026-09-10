"use client";

import React from "react";
import { motion } from "framer-motion";

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
  stepTitle,
}: OnboardingProgressProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--card)] border border-[var(--border)] shadow-xs">
            <span className="font-mono text-xs font-bold text-[var(--primary)]">AC</span>
          </div>
          <span className="text-sm font-bold tracking-tight text-[var(--foreground)]">
            AstroCraft
          </span>
          <span className="hidden sm:inline-block text-xs text-[var(--muted-foreground)] border-l border-[var(--border)] pl-3">
            {stepTitle}
          </span>
        </div>

        {/* Step Counter */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-medium tracking-wider text-[var(--muted-foreground)]">
            Step <span className="font-bold text-[var(--foreground)]">{currentStep}</span> of {totalSteps}
          </span>
          <div className="hidden sm:block text-xs font-mono font-medium text-[var(--muted-foreground)]">
            ({percentage}%)
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-[var(--muted)]">
        <motion.div
          className="h-full bg-[var(--primary)]"
          initial={{ width: "0%" }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </header>
  );
}
