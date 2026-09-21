"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { onAuthStateChanged, updateProfile, type User } from "firebase/auth";
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
import { StepChoosePlan } from "@/components/onboarding/StepChoosePlan";

const STEP_TITLES = [
  "About You",
  "Your Business",
  "Current Stage",
  "Goals & Vision",
  "Experience",
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
        if (draft.step && draft.step >= 1 && draft.step <= 6) {
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
      if (next.firstName?.trim() && typeof window !== "undefined") {
        try {
          localStorage.setItem("astrocraft_user_first_name", next.firstName.trim());
          if (currentUser?.uid) {
            localStorage.setItem(`astrocraft_onboarding_first_name_${currentUser.uid}`, next.firstName.trim());
          }
        } catch {}
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
    if (currentStep === 1 && formData.firstName?.trim()) {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("astrocraft_user_first_name", formData.firstName.trim());
          if (currentUser?.uid) {
            localStorage.setItem(`astrocraft_onboarding_first_name_${currentUser.uid}`, formData.firstName.trim());
          }
        }
        if (auth.currentUser) {
          const full = [formData.firstName.trim(), formData.lastName?.trim()].filter(Boolean).join(" ");
          updateProfile(auth.currentUser, { displayName: full }).catch(() => {});
        }
      } catch {}
    }
    if (currentStep < 6) {
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
        if (currentStep < 6 && isStepValid(currentStep)) {
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
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
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
    <div className="relative min-h-screen w-full overflow-hidden bg-background p-4 font-sans flex flex-col items-center justify-center sm:p-6 lg:p-8">
      {/* Centered setup card */}
      <div
        className="relative z-10 flex w-full max-w-[820px] flex-col justify-between overflow-hidden rounded-3xl border border-border bg-card p-5 sm:min-h-[640px] sm:px-9 sm:py-7"
      >
        {/* Top: Stepper & Progress Bar inside the box */}
        <div className="shrink-0">
          <AppleStepper
            currentStep={currentStep}
            totalSteps={6}
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
                <StepChoosePlan
                  data={formData}
                  isSubmitting={isSubmitting}
                  onSelectAndSubmit={handleFinalSubmit}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {submitError && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-accent/40 bg-accent-soft px-3 py-2.5 text-xs leading-5 text-accent"
            >
              {submitError}
            </p>
          )}
        </div>

        {/* Navigation Actions Bar INSIDE the Box */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border pt-4">
          <div className="min-w-0">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <ArrowLeft className="size-4" />
                <span>Back</span>
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Fields marked <span className="text-accent">*</span> are required
              </span>
            )}
          </div>

          {currentStep < 6 ? (
            <button
              type="button"
              disabled={!isStepValid(currentStep)}
              onClick={handleNext}
              className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>Continue</span>
              <ArrowRight className="size-4" />
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Choose a plan above to finish
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
