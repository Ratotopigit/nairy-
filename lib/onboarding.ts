import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase/config";
import { saveWorkspaceMemory } from "./workspace-memory";

export type SubscriptionTier = "free" | "pro" | "premium";

export interface OnboardingData {
  // Step 1 — About You
  firstName: string;
  lastName: string;
  role: string;
  customRole?: string;

  // Step 2 — About Your Business
  businessName: string;

  // Step 3 — Where Are You Right Now?
  businessStage: string;
  biggestChallenge: string;

  // Step 4 — What Do You Want to Achieve?
  mainGoals: string[];
  targetAccomplishment: string;

  // Step 5 — Your Experience
  experienceLevel: string;
  knownAreas: string[];

  // Step 6 — Personalize My Academy
  primaryLearningInterest: string;
  learningPreference: string;
  weeklyTimeCommitment: string;

  // Step 7 — Choose Your Plan
  selectedPlan: SubscriptionTier;
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  firstName: "",
  lastName: "",
  role: "",
  customRole: "",
  businessName: "",
  businessStage: "",
  biggestChallenge: "",
  mainGoals: [],
  targetAccomplishment: "",
  experienceLevel: "",
  knownAreas: [],
  primaryLearningInterest: "",
  learningPreference: "",
  weeklyTimeCommitment: "",
  selectedPlan: "pro",
};

const STORAGE_PREFIX = "astrocraft_onboarding_";

/**
 * Checks whether a user has already completed onboarding.
 * Checks localStorage first for fast retrieval, then Firestore.
 */
export async function checkUserOnboardingStatus(uid: string): Promise<boolean> {
  if (!uid) return false;

  // Check client cache first
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(`${STORAGE_PREFIX}completed_${uid}`);
    if (cached === "true") {
      return true;
    }
  }

  // If Firebase is not configured (demo mode), rely on localStorage
  if (!isFirebaseConfigured) {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`${STORAGE_PREFIX}completed_${uid}`) === "true";
    }
    return false;
  }

  try {
    const docRef = doc(db, "workspace_memory", uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const completed = Boolean(data?.onboarding_complete);
      if (completed && typeof window !== "undefined") {
        localStorage.setItem(`${STORAGE_PREFIX}completed_${uid}`, "true");
      }
      return completed;
    }
    return false;
  } catch (err) {
    console.warn("Failed to check onboarding status in Firestore:", err);
    // Fallback to localStorage if Firestore check fails
    if (typeof window !== "undefined") {
      return localStorage.getItem(`${STORAGE_PREFIX}completed_${uid}`) === "true";
    }
    return false;
  }
}

/**
 * Persists the final onboarding payload to Firestore workspace_memory
 * and dispatches to POST /api/onboarding.
 */
export async function saveOnboardingCompletion(
  uid: string,
  data: OnboardingData
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Mark in client cache immediately
    if (typeof window !== "undefined") {
      localStorage.setItem(`${STORAGE_PREFIX}completed_${uid}`, "true");
      clearStoredOnboardingDraft(uid);
    }

    // 2. Call the onboarding API endpoint
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: uid,
          answers: data,
          plan: data.selectedPlan,
        }),
      });
    } catch (apiErr) {
      console.warn("API route /api/onboarding call finished with warning:", apiErr);
    }

    // 3. Update Firestore workspace_memory if configured
    if (isFirebaseConfigured) {
      await saveWorkspaceMemory(uid, {
        onboarding_complete: true,
        business_profile: {
          brand_name: data.businessName,
          business_stage: data.businessStage,
          role: data.role,
          custom_role: data.customRole || null,
        },
        audience_profile: {
          main_goals: data.mainGoals,
          biggest_challenge: data.biggestChallenge,
          target_accomplishment: data.targetAccomplishment,
        },
        creation_preferences: {
          experience_level: data.experienceLevel,
          known_areas: data.knownAreas,
          primary_learning_interest: data.primaryLearningInterest,
          learning_preference: data.learningPreference,
          weekly_time_commitment: data.weeklyTimeCommitment,
          selected_plan: data.selectedPlan,
        },
        memory_summary: `Business: ${data.businessName || "Unnamed"}. Role: ${data.role}. Stage: ${data.businessStage}. Goals: ${data.mainGoals.join(", ")}. Plan: ${data.selectedPlan}.`,
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to complete onboarding save:", err);
    return { success: false, error: err?.message || "Failed to save onboarding." };
  }
}

/**
 * Retrieve saved draft to prevent loss on refresh.
 */
export function getStoredOnboardingDraft(uid: string): {
  data: Partial<OnboardingData>;
  step: number;
} | null {
  if (typeof window === "undefined" || !uid) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}draft_${uid}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Cache current draft progress on each step.
 */
export function setStoredOnboardingDraft(
  uid: string,
  data: Partial<OnboardingData>,
  step: number
): void {
  if (typeof window === "undefined" || !uid) return;
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}draft_${uid}`,
      JSON.stringify({ data, step, updatedAt: Date.now() })
    );
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Remove draft after onboarding finishes.
 */
export function clearStoredOnboardingDraft(uid: string): void {
  if (typeof window === "undefined" || !uid) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}draft_${uid}`);
  } catch {
    // Ignore
  }
}
