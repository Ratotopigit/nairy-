"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import {
  INITIAL_ONBOARDING_DATA,
  OnboardingData,
  SubscriptionTier,
  checkUserOnboardingStatus,
  getStoredOnboardingDraft,
  setStoredOnboardingDraft,
  saveOnboardingCompletion,
} from "@/lib/onboarding";

import { AppleStepper } from "@/components/onboarding/AppleStepper";
import { StepAboutYou } from "@/components/onboarding/StepAboutYou";
import { StepBusiness } from "@/components/onboarding/StepBusiness";
import { StepStageChallenge } from "@/components/onboarding/StepStageChallenge";
import { StepGoalsAccomplishment } from "@/components/onboarding/StepGoalsAccomplishment";
import { StepExperience } from "@/components/onboarding/StepExperience";
import { StepPersonalizeAcademy } from "@/components/onboarding/StepPersonalizeAcademy";
import { StepChoosePlan } from "@/components/onboarding/StepChoosePlan";

const STEP_TITLES = [
  "About You",
  "Your Business",
  "Current Stage",
  "Goals & Vision",
  "Experience",
  "Academy Path",
  "Choose Plan",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [formData, setFormData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // 1. Session verification & Draft Restoration
  useEffect(() => {
    let active = true;

    async function handleUserSession(user: User | null) {
      if (!active) return;
      if (!user) {
        router.replace("/login");
        return;
      }

      setCurrentUser(user);

      // Check if user already completed onboarding
      const isCompleted = await checkUserOnboardingStatus(user.uid);
      if (isCompleted) {
        router.replace("/provider");
        return;
      }

      // Restore saved draft if available
      const draft = getStoredOnboardingDraft(user.uid);
      if (draft && draft.data) {
        setFormData((prev) => ({
          ...prev,
          ...draft.data,
          // Pre-fill name from auth profile if empty
          firstName: draft.data.firstName || user.displayName?.split(" ")[0] || prev.firstName,
          lastName: draft.data.lastName || user.displayName?.split(" ").slice(1).join(" ") || prev.lastName,
        }));
        if (draft.step && draft.step >= 1 && draft.step <= 7) {
          setCurrentStep(draft.step);
        }
      } else if (user.displayName) {
        const parts = user.displayName.trim().split(" ");
        setFormData((prev) => ({
          ...prev,
          firstName: parts[0] || "",
          lastName: parts.slice(1).join(" ") || "",
        }));
      }

      setIsCheckingSession(false);
    }

    if (!isFirebaseConfigured) {
      const demoUser = {
        uid: "demo-user-id",
        email: "demo@example.com",
        displayName: "Demo Provider",
      } as unknown as User;
      handleUserSession(demoUser);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      handleUserSession(user);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  // 2. Cache draft changes
  const updateData = (patch: Partial<OnboardingData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...patch };
      if (currentUser?.uid) {
        setStoredOnboardingDraft(currentUser.uid, next, currentStep);
      }
      return next;
    });
  };

  // 3. Step validation
  const isStepValid = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 1:
          return (
            Boolean(formData.firstName?.trim()) &&
            Boolean(formData.lastName?.trim()) &&
            Boolean(formData.role) &&
            (formData.role !== "Other" || Boolean(formData.customRole?.trim()))
          );
        case 2:
          return Boolean(formData.businessName?.trim());
        case 3:
          return Boolean(formData.businessStage) && Boolean(formData.biggestChallenge);
        case 4:
          return Boolean(formData.mainGoals && formData.mainGoals.length > 0);
        case 5:
          return (
            Boolean(formData.experienceLevel) &&
            Boolean(formData.knownAreas && formData.knownAreas.length > 0)
          );
        case 6:
          return (
            Boolean(formData.primaryLearningInterest) &&
            Boolean(formData.learningPreference) &&
            Boolean(formData.weeklyTimeCommitment)
          );
        case 7:
          return Boolean(formData.selectedPlan);
        default:
          return true;
      }
    },
    [formData]
  );

  // 4. Step Navigation
  const handleNext = useCallback(() => {
    if (!isStepValid(currentStep)) return;
    if (currentStep < 7) {
      setDirection(1);
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (currentUser?.uid) {
        setStoredOnboardingDraft(currentUser.uid, formData, nextStep);
      }
    }
  }, [currentStep, isStepValid, currentUser, formData]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setDirection(-1);
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (currentUser?.uid) {
        setStoredOnboardingDraft(currentUser.uid, formData, prevStep);
      }
    }
  }, [currentStep, currentUser, formData]);

  const handleJumpToStep = useCallback(
    (targetStep: number) => {
      if (targetStep < currentStep) {
        setDirection(-1);
        setCurrentStep(targetStep);
        if (currentUser?.uid) {
          setStoredOnboardingDraft(currentUser.uid, formData, targetStep);
        }
      }
    },
    [currentStep, currentUser, formData]
  );

  // 5. Enter key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        (e.target as HTMLElement)?.tagName !== "TEXTAREA"
      ) {
        if (currentStep < 7 && isStepValid(currentStep)) {
          e.preventDefault();
          handleNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, isStepValid, handleNext]);

  // 6. Final Submission
  const handleFinalSubmit = async (selectedPlan: SubscriptionTier) => {
    if (!currentUser?.uid || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const completePayload: OnboardingData = {
      ...formData,
      selectedPlan,
    };

    const result = await saveOnboardingCompletion(currentUser.uid, completePayload);

    if (result.success) {
      router.replace("/provider");
    } else {
      setIsSubmitting(false);
      setSubmitError(result.error || "Failed to complete onboarding. Please try again.");
    }
  };

  if (isCheckingSession) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)] text-sm text-[var(--muted-foreground)]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
          <span>Preparing your workspace...</span>
        </div>
      </div>
    );
  }

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 18 : -18,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 18 : -18,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden bg-[var(--background)]">
      {/* Ambient subtle backdrop glows */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[640px] h-[420px] bg-emerald-300/12 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 w-[520px] h-[380px] bg-amber-200/15 rounded-full blur-3xl" />


      {/* Apple-style Centered Box with Frosted Glassmorphism & Diffused Shadow */}
      <div
        className="w-full max-w-[820px] min-h-[640px] relative z-10 rounded-3xl border border-white/90 bg-white/95 backdrop-blur-2xl shadow-[0_24px_64px_-12px_rgba(29,42,39,0.08),0_0_1px_1px_rgba(255,255,255,0.9)_inset,0_2px_4px_rgba(0,0,0,0.02)] p-6 sm:px-9 sm:py-7 flex flex-col justify-between overflow-hidden transition-none"
      >
        {/* Top: Stepper & Progress Bar inside the box */}
        <div className="shrink-0">
          <AppleStepper
            currentStep={currentStep}
            totalSteps={7}
            stepTitles={STEP_TITLES}
            onStepClick={handleJumpToStep}
          />
        </div>

        {/* Content Section with fluid directional transitions */}
        <div className="flex-1 flex flex-col justify-center px-1 py-4 min-h-0">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {currentStep === 1 && (
                <StepAboutYou data={formData} onChange={updateData} />
              )}
              {currentStep === 2 && (
                <StepBusiness data={formData} onChange={updateData} />
              )}
              {currentStep === 3 && (
                <StepStageChallenge data={formData} onChange={updateData} />
              )}
              {currentStep === 4 && (
                <StepGoalsAccomplishment data={formData} onChange={updateData} />
              )}
              {currentStep === 5 && (
                <StepExperience data={formData} onChange={updateData} />
              )}
              {currentStep === 6 && (
                <StepPersonalizeAcademy data={formData} onChange={updateData} />
              )}
              {currentStep === 7 && (
                <StepChoosePlan
                  data={formData}
                  isSubmitting={isSubmitting}
                  onSelectAndSubmit={handleFinalSubmit}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {submitError && (
            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {submitError}
            </p>
          )}
        </div>

        {/* Navigation Actions Bar INSIDE the Box */}
        <div className="shrink-0 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] shadow-2xs"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400">
                Required fields are marked with <span className="text-red-500">*</span>
              </span>
            )}
          </div>

          {currentStep < 7 ? (
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs text-slate-400">
                Press <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 shadow-2xs">Enter ↵</kbd>
              </span>
              <button
                type="button"
                disabled={!isStepValid(currentStep)}
                onClick={handleNext}
                className="flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--primary)]/90 hover:shadow active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              Choose any plan above to complete setup
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
