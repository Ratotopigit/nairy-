import { doc, getDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db, isFirebaseConfigured } from "./firebase/config";
import { saveWorkspaceMemory, type WorkspaceMemory } from "./workspace-memory";

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

// Legacy localStorage namespace. Kept verbatim on purpose: it is a storage key,
// never user-visible copy, and renaming it would orphan every existing user's
// cached onboarding state. Product naming is "Webinar Chat" / "Webinar Stack".
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
      if (data.firstName?.trim()) {
        localStorage.setItem("astrocraft_user_first_name", data.firstName.trim());
        localStorage.setItem(`${STORAGE_PREFIX}first_name_${uid}`, data.firstName.trim());
      }
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

    // 3. Update Firebase Auth displayName if available
    if (auth.currentUser && data.firstName?.trim()) {
      const full = [data.firstName.trim(), data.lastName?.trim()].filter(Boolean).join(" ");
      updateProfile(auth.currentUser, { displayName: full }).catch((profileErr) => {
        console.warn("Failed to sync displayName in Firebase Auth:", profileErr);
      });
    }

    // 4. Update Firestore workspace_memory if configured
    if (isFirebaseConfigured) {
      await saveWorkspaceMemory(uid, {
        onboarding_complete: true,
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        user_profile: {
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
        },
        business_profile: {
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
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
        // NOTE: never include subscription/plan/tier state here. This string is
        // fed verbatim into the assistant's prompt context, and the assistant
        // must not be told (or imply to the user) which billing plan they are on.
        // The plan itself stays in `creation_preferences.selected_plan` above.
        memory_summary: `Business: ${data.businessName || "Unnamed"}. Role: ${data.role}. Stage: ${data.businessStage}. Goals: ${data.mainGoals.join(", ")}.`,
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to complete onboarding save:", err);
    return { success: false, error: err?.message || "Failed to save onboarding." };
  }
}

/**
 * Resolves the user's first name with fallback hierarchy:
 * 1. workspace_memory.first_name or workspace_memory.business_profile.first_name
 * 2. localStorage user-specific first name
 * 3. localStorage global first name
 * 4. User auth displayName first word
 * 5. Saved draft firstName
 */
export function resolveUserFirstName(
  user?: { uid?: string; displayName?: string | null } | null,
  memory?: WorkspaceMemory | null
): string {
  // 1. Check workspace memory
  if (memory?.first_name && typeof memory.first_name === "string" && memory.first_name.trim()) {
    return memory.first_name.trim();
  }
  const bpFirstName = (memory?.business_profile as Record<string, unknown> | undefined)?.first_name;
  if (typeof bpFirstName === "string" && bpFirstName.trim()) {
    return bpFirstName.trim();
  }
  const upFirstName = (memory?.user_profile as Record<string, unknown> | undefined)?.first_name;
  if (typeof upFirstName === "string" && upFirstName.trim()) {
    return upFirstName.trim();
  }

  // 2. Check localStorage
  if (typeof window !== "undefined") {
    if (user?.uid) {
      const userKey = `${STORAGE_PREFIX}first_name_${user.uid}`;
      const cached = localStorage.getItem(userKey);
      if (cached && cached.trim()) return cached.trim();

      const draft = getStoredOnboardingDraft(user.uid);
      if (draft?.data?.firstName?.trim()) {
        return draft.data.firstName.trim();
      }
    }
    const globalCached = localStorage.getItem("astrocraft_user_first_name");
    if (globalCached && globalCached.trim()) return globalCached.trim();
  }

  // 3. Check auth displayName
  if (user?.displayName && user.displayName.trim()) {
    const firstWord = user.displayName.trim().split(/\s+/)[0];
    if (firstWord && !firstWord.toLowerCase().includes("demo")) {
      return firstWord;
    }
  }

  return "";
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
