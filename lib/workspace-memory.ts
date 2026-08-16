import { supabase } from "./supabase/client";

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
  const { data } = await supabase
    .from("workspace_memory")
    .select("owner_id,onboarding_complete,business_profile,audience_profile,offer_profile,brand_profile,creation_preferences,memory_summary,source_session_id")
    .eq("owner_id", ownerId)
    .maybeSingle();

  return (data as WorkspaceMemory | null) ?? null;
}

export async function saveWorkspaceMemory(
  ownerId: string,
  patch: Partial<Omit<WorkspaceMemory, "owner_id">>,
) {
  return supabase.from("workspace_memory").upsert({
    owner_id: ownerId,
    ...patch,
    updated_at: new Date().toISOString(),
  }, { onConflict: "owner_id" });
}

export function memoryContext(memory: WorkspaceMemory | null): string {
  if (!memory) return "";
  return [
    memory.memory_summary,
    Object.keys(memory.business_profile).length ? `Business: ${JSON.stringify(memory.business_profile)}` : "",
    Object.keys(memory.audience_profile).length ? `Audience: ${JSON.stringify(memory.audience_profile)}` : "",
    Object.keys(memory.offer_profile).length ? `Offer: ${JSON.stringify(memory.offer_profile)}` : "",
    Object.keys(memory.creation_preferences).length ? `Preferences: ${JSON.stringify(memory.creation_preferences)}` : "",
  ].filter(Boolean).join("\n");
}
