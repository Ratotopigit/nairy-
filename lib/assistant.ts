/**
 * Authenticated bridge to the n8n Content Maker workflow.
 */
import type { FontSetId, Purpose, RatioId, Slide, StyleId } from "./deck";
import { readN8nJson } from "./n8n-response";
import { supabase } from "./supabase/client";

export type AssistantActions = {
  reply?: string;
  style?: StyleId;
  fontSet?: FontSetId;
  palette?: string;
  purpose?: Purpose;
  ratio?: RatioId;
  slideCount?: number;
  generate?: boolean;
  rewriteSelected?: "None" | "Shorter" | "More professional" | "More visual" | "More minimal" | "Same content, new layout";
  slides?: Slide[];
};

export type AssistantContext = {
  mode: "generate" | "assistant";
  projectId: string;
  blueprintSessionId: string | null;
  message: string;
  description: string;
  purpose: string;
  slideCount: string;
  style: string;
  fontSet: string;
  palette: string;
  ratio: string;
  slides: Slide[];
  selectedSlideId: string | null;
  messages: { id: string; role: "user" | "assistant"; text: string }[];
};

const WEBHOOK_URL = "/api/n8n/content-maker";

export async function askAssistant(ctx: AssistantContext): Promise<AssistantActions | null> {
  if (!WEBHOOK_URL?.trim()) throw new Error("The Content Maker n8n webhook is not configured.");
  const [{ data: authData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  if (!authData.user || !sessionData.session?.access_token) {
    throw new Error("Your sign-in session expired. Please sign in again.");
  }
  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      mode: ctx.mode,
      project_id: ctx.projectId,
      session_id: ctx.blueprintSessionId,
      user_id: authData.user.id,
      message: ctx.message,
      description: ctx.description,
      purpose: ctx.purpose,
      slide_count: ctx.slideCount,
      style: ctx.style,
      font_set: ctx.fontSet,
      palette: ctx.palette,
      ratio: ctx.ratio,
      slides: ctx.slides,
      selected_slide_id: ctx.selectedSlideId,
      messages: ctx.messages,
    }),
  });
  const raw = await readN8nJson<Record<string, unknown> | Array<Record<string, unknown>>>(
    res,
    "Content Maker workflow",
  );
  const data = Array.isArray(raw) ? raw[0] : raw;
  return (data?.actions ?? data) as AssistantActions;
}
