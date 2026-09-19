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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-card border border-border overflow-hidden p-0.5 shrink-0">
            <img
              src="/assets/webinarkit-logo.png"
              alt="WebinarKit"
              className="size-full object-contain"
            />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            WebinarKit
          </span>
          <span className="hidden sm:inline-block text-xs text-muted-foreground border-l border-border pl-3">
            {stepTitle}
          </span>
        </div>

        {/* Step Counter */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-medium tracking-wider text-muted-foreground">
            Step <span className="font-bold text-foreground">{currentStep}</span> of {totalSteps}
          </span>
          <div className="hidden sm:block text-xs font-mono font-medium text-muted-foreground">
            ({percentage}%)
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 w-full bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </header>
  );
}
