import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase/config";

export type WorkspaceMemory = {
  owner_id: string;
  onboarding_complete: boolean;
  business_profile: Record<string, unknown>;
  audience_profile: Record<string, unknown>;
  offer_profile: Record<string, unknown>;
  brand_profile: Record<string, unknown>;
  creation_preferences: Record<string, unknown>;
  memory_summary: string;
  source_session_id: string | null;
};

export async function loadWorkspaceMemory(ownerId: string): Promise<WorkspaceMemory | null> {
  try {
    const docRef = doc(db, "workspace_memory", ownerId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as WorkspaceMemory;
  } catch (error) {
    console.error("Failed to load workspace memory:", error);
    return null;
  }
}

export async function saveWorkspaceMemory(
  ownerId: string,
  patch: Partial<Omit<WorkspaceMemory, "owner_id">>,
) {
  try {
    const docRef = doc(db, "workspace_memory", ownerId);
    await setDoc(
      docRef,
      {
        owner_id: ownerId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    return { data: null, error: null };
  } catch (error) {
    console.error("Failed to save workspace memory:", error);
    return { data: null, error };
  }
}

export function memoryContext(memory: WorkspaceMemory | null): string {
  if (!memory) return "";
  return [
    memory.memory_summary,
    memory.business_profile && Object.keys(memory.business_profile).length
      ? `Business: ${JSON.stringify(memory.business_profile)}`
      : "",
    memory.audience_profile && Object.keys(memory.audience_profile).length
      ? `Audience: ${JSON.stringify(memory.audience_profile)}`
      : "",
    memory.offer_profile && Object.keys(memory.offer_profile).length
      ? `Offer: ${JSON.stringify(memory.offer_profile)}`
      : "",
    memory.creation_preferences && Object.keys(memory.creation_preferences).length
      ? `Preferences: ${JSON.stringify(memory.creation_preferences)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
