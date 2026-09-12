"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface AppleStepperProps {
  currentStep: number;
  totalSteps: number;
  stepTitles?: string[];
  onStepClick?: (step: number) => void;
}

export function AppleStepper({
  currentStep,
  totalSteps,
  stepTitles,
  onStepClick,
}: AppleStepperProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Numbered Circles & Connecting Dashes */}
      <div className="w-full max-w-[520px] flex items-center justify-between px-2 sm:px-4">
        {steps.map((step, index) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isClickable = isCompleted && onStepClick;

          return (
            <React.Fragment key={step}>
              {/* Step Circle */}
              <motion.button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(step)}
                whileHover={isClickable ? { scale: 1.08 } : undefined}
                whileTap={isClickable ? { scale: 0.95 } : undefined}
                aria-label={`Step ${step}${stepTitles ? `: ${stepTitles[step - 1]}` : ""}`}
                aria-current={isCurrent ? "step" : undefined}
                className={`relative flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full text-xs transition-all duration-300 focus:outline-none ${
                  isCurrent
                    ? "bg-[var(--primary)] text-white font-bold border-2 border-[var(--primary)] shadow-sm scale-105"
                    : isCompleted
                    ? "bg-[var(--primary)] text-white border-2 border-[var(--primary)] font-medium cursor-pointer"
                    : "border border-slate-200 bg-white text-slate-500 font-medium cursor-default"
                }`}
              >
                {isCompleted ? (
                  <Check className="size-3.5 stroke-[2.5]" />
                ) : (
                  <span>{step}</span>
                )}
              </motion.button>

              {/* Connecting Line between circles */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-3 h-[1px] bg-slate-200" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Title Label */}
      {stepTitles && stepTitles[currentStep - 1] && (
        <div className="mt-3 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">
            Step {currentStep} of {totalSteps} •{" "}
            <span className="font-bold text-[var(--primary)]">
              {stepTitles[currentStep - 1]}
            </span>
          </span>
        </div>
      )}

      {/* Progress Bar Divider Line */}
      <div className="relative w-full mt-4 h-[1px] bg-slate-200/80">
        <motion.div
          className="absolute top-0 left-0 h-[3px] -translate-y-[1px] bg-[var(--primary)] rounded-full"
          initial={false}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
