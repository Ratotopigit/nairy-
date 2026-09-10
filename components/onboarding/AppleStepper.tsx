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
      <div className="w-full max-w-md flex items-center justify-between px-2 sm:px-4">
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
                className={`relative flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full text-xs transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  isCurrent
                    ? "border-2 border-orange-500 bg-white text-orange-600 font-bold shadow-xs scale-105"
                    : isCompleted
                    ? "border border-orange-500/40 bg-orange-50/40 text-orange-600 font-medium hover:bg-orange-50 cursor-pointer"
                    : "border border-slate-200 bg-white text-slate-700 font-medium cursor-default"
                }`}
              >
                {isCompleted ? (
                  <Check className="size-3.5 stroke-[2.5]" />
                ) : (
                  <span>{step}</span>
                )}
              </motion.button>

              {/* Connecting Bar between circles (half-filled with orange for active step) */}
              {index < steps.length - 1 && (
                <div className="relative flex-1 mx-1.5 sm:mx-2.5 h-1 min-w-[12px] max-w-[42px] rounded-full overflow-hidden bg-slate-200/80">
                  <motion.div
                    className="h-full bg-orange-500 rounded-full"
                    initial={false}
                    animate={{
                      width:
                        step < currentStep
                          ? "100%"
                          : step === currentStep
                          ? "50%"
                          : "0%",
                    }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Title Label */}
      {stepTitles && stepTitles[currentStep - 1] && (
        <div className="mt-3 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
            Step {currentStep} of {totalSteps} •{" "}
            <span className="font-semibold text-orange-600">
              {stepTitles[currentStep - 1]}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
