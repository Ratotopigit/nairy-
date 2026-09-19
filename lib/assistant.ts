import type {
  FontSetId,
  LayoutVariant,
  Motion,
  Purpose,
  RatioId,
  Slide,
  SlideType,
  StyleId,
} from "./deck";
import { readN8nJson } from "./n8n-response";
import { auth } from "./firebase/config";
import { n8nWebhookUrl } from "@/lib/n8n-url";

export type AssistantActions = {
  reply?: string;
  style?: StyleId;
  fontSet?: FontSetId;
  palette?: string;
  purpose?: Purpose;
  ratio?: RatioId;
  motion?: Motion;
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
  assetContext?: string;
};


// A Gemini agent building up to 90 slides routinely runs past a minute.
const ASSISTANT_TIMEOUT_MS = 120_000;

export function normalizeSlide(raw: Partial<Slide>, index: number): Slide {
  const types: SlideType[] = ["title", "split", "bullets", "visual", "metrics", "services", "timeline", "process", "chart", "closing"];
  const type = types.includes(raw.type as SlideType) ? (raw.type as SlideType) : "bullets";
  const layouts: LayoutVariant[] = ["A", "B", "C", "D"];
  const layout = layouts.includes(raw.layout as LayoutVariant) ? (raw.layout as LayoutVariant) : "A";
  return {
    id: raw.id || `s${Date.now().toString(36)}_${index}`,
    name: raw.name || `Slide ${index + 1}`,
    type,
    layout,
    eyebrow: typeof raw.eyebrow === "string" ? raw.eyebrow : "",
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : `Slide ${index + 1}`,
    body: typeof raw.body === "string" ? raw.body : "",
    bullets: Array.isArray(raw.bullets)
      ? raw.bullets.filter((b): b is string => typeof b === "string" && Boolean(b.trim()))
      : [],
    metrics: Array.isArray(raw.metrics)
      ? raw.metrics.map((m) => ({
          value: typeof m?.value === "string" ? m.value : "100%",
          label: typeof m?.label === "string" ? m.label : "Metric",
        }))
      : [],
    chart: Array.isArray(raw.chart) && raw.chart.length > 0
      ? raw.chart.map((v) => Number(v) || 50)
      : [35, 55, 75, 90],
    useImage: Boolean(raw.useImage),
    image: raw.image ?? null,
    imageKind: raw.imageKind === "cutout" || raw.imageKind === "photo" ? raw.imageKind : undefined,
    art: raw.art && typeof raw.art.query === "string" && raw.art.query.trim()
      ? {
          query: raw.art.query.trim().slice(0, 100),
          kind: raw.art.kind === "photo" ? "photo" : "cutout",
          source: raw.art.source ?? null,
        }
      : null,
  };
}

/**
 * Sends the studio context to the Content Maker webhook. The webhook is the
 * only source of slides and replies — a failure throws so the caller can show
 * the real reason instead of silently substituting generated filler.
 */
export async function askAssistant(ctx: AssistantContext): Promise<AssistantActions> {
  const currentSlides = (Array.isArray(ctx.slides) ? ctx.slides : []).map(normalizeSlide);

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You need to be signed in to use the Content Maker assistant.");
  }

  const token = await currentUser.getIdToken().catch(() => null);
  if (!token) {
    throw new Error("Your sign-in session expired. Please sign in again.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ASSISTANT_TIMEOUT_MS);

  try {
    const res = await fetch(n8nWebhookUrl("content-maker"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        mode: ctx.mode,
        project_id: ctx.projectId,
        session_id: ctx.blueprintSessionId,
        user_id: currentUser.uid,
        message: ctx.message,
        description: ctx.description,
        purpose: ctx.purpose,
        slide_count: ctx.slideCount,
        style: ctx.style,
        font_set: ctx.fontSet,
        palette: ctx.palette,
        ratio: ctx.ratio,
        slides: currentSlides.map((slide) => ({ ...slide, image: null })),
        selected_slide_id: ctx.selectedSlideId,
        messages: ctx.messages,
        asset_context: ctx.assetContext ?? "",
      }),
    });

    const raw = await readN8nJson<Record<string, unknown> | Array<Record<string, unknown>>>(
      res,
      "Webinar Content workflow",
    );
    const data = Array.isArray(raw) ? raw[0] : raw;
    const candidate = ((data?.actions ?? data?.result ?? data) as AssistantActions) ?? {};

    if (Array.isArray(candidate.slides) && candidate.slides.length > 0) {
      // Images are stripped on the way out, so the agent never echoes them
      // back. Re-attach what each slide already had, or the resolved art is
      // wiped on every assistant turn.
      const keptArt = new Map(currentSlides.map((s) => [s.id, s]));
      candidate.slides = candidate.slides.map(normalizeSlide).map((slide) => {
        if (slide.image) return slide;
        const previous = keptArt.get(slide.id);
        if (!previous?.image) return slide;
        return {
          ...slide,
          image: previous.image,
          imageKind: slide.imageKind ?? previous.imageKind,
          art: slide.art ?? previous.art ?? null,
        };
      });
      return candidate;
    }
    if (candidate.reply) {
      return candidate;
    }

    throw new Error("The Content Maker workflow returned no slides and no reply.");
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("The Content Maker workflow timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
