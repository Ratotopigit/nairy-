import {
  FONT_SETS,
  PALETTES,
  PURPOSES,
  RATIOS,
  STYLES,
  generateDeck,
  type FontSetId,
  type LayoutVariant,
  type Motion,
  type Palette,
  type Purpose,
  type RatioId,
  type Slide,
  type SlideType,
  type StyleId,
} from "./deck";
import { readN8nJson } from "./n8n-response";
import { auth } from "./firebase/config";

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

const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL
  ? `${process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL.replace(/\/+$/, "")}/content-maker`
  : "https://explosionmarketing.app.n8n.cloud/webhook/content-maker";

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
  };
}

export async function askAssistant(ctx: AssistantContext): Promise<AssistantActions | null> {
  const currentSlides = (Array.isArray(ctx.slides) ? ctx.slides : []).map(normalizeSlide);

  try {
    const currentUser = auth.currentUser;
    const userId = currentUser?.uid || "00000000-0000-4000-8000-000000000000";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (currentUser) {
      const token = await currentUser.getIdToken().catch(() => null);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        mode: ctx.mode,
        project_id: ctx.projectId,
        session_id: ctx.blueprintSessionId,
        user_id: userId,
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

    if (res.ok) {
      const raw = await readN8nJson<Record<string, unknown> | Array<Record<string, unknown>>>(
        res,
        "Webinar Content workflow",
      );
      const data = Array.isArray(raw) ? raw[0] : raw;
      const candidate = ((data?.actions ?? data?.result ?? data) as AssistantActions) ?? {};
      if (Array.isArray(candidate.slides) && candidate.slides.length > 0) {
        candidate.slides = candidate.slides.map(normalizeSlide);
        return candidate;
      }
      if (candidate.reply) {
        return candidate;
      }
    }
  } catch (error) {
    console.warn("Webinar Content webhook error:", error);
  }

  // Resilient local intelligent command interpreter
  return executeLocalCommand(ctx, currentSlides);
}

function executeLocalCommand(ctx: AssistantContext, slides: Slide[]): AssistantActions {
  const prompt = ctx.message.trim();
  const lower = prompt.toLowerCase();
  const selectedIndex = slides.findIndex((s) => s.id === ctx.selectedSlideId);
  const targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const targetSlide = slides[targetIndex];

  const actions: AssistantActions = {
    slides: [...slides],
  };

  // 1. Check palette command
  const matchedPalette = PALETTES.find(
    (p) => lower.includes(p.id.toLowerCase()) || lower.includes(p.name.toLowerCase()),
  );
  if (matchedPalette && (lower.includes("palette") || lower.includes("color") || lower.includes("theme"))) {
    actions.palette = matchedPalette.id;
    actions.reply = `Changed palette to ${matchedPalette.name}.`;
    return actions;
  }

  // 2. Check style command
  const matchedStyle = STYLES.find((s) => lower.includes(s.id.toLowerCase()) || lower.includes(s.label.toLowerCase()));
  if (matchedStyle && (lower.includes("style") || lower.includes("theme") || lower.includes("look"))) {
    actions.style = matchedStyle.id;
    actions.reply = `Applied the ${matchedStyle.label} style across your presentation.`;
    return actions;
  }

  // 3. Check font set command
  const matchedFont = FONT_SETS.find((f) => lower.includes(f.id.toLowerCase()) || lower.includes(f.name.toLowerCase()));
  if (matchedFont && (lower.includes("font") || lower.includes("typography"))) {
    actions.fontSet = matchedFont.id;
    actions.reply = `Updated typography to ${matchedFont.name}.`;
    return actions;
  }

  // 4. Check ratio command
  const matchedRatio = RATIOS.find((r) => lower.includes(r.id) || lower.includes(r.label.toLowerCase()));
  if (matchedRatio && (lower.includes("ratio") || lower.includes("aspect") || lower.includes("size") || lower.includes("format"))) {
    actions.ratio = matchedRatio.id;
    actions.reply = `Set slide aspect ratio to ${matchedRatio.label}.`;
    return actions;
  }

  // 5. Check layout changes for selected slide
  if (targetSlide && (lower.includes("layout") || lower.includes("split") || lower.includes("metrics") || lower.includes("bullets") || lower.includes("timeline") || lower.includes("process"))) {
    let nextLayout: LayoutVariant = targetSlide.layout;
    if (lower.includes("layout a")) nextLayout = "A";
    else if (lower.includes("layout b")) nextLayout = "B";
    else if (lower.includes("layout c")) nextLayout = "C";
    else if (lower.includes("layout d")) nextLayout = "D";

    let nextType = targetSlide.type;
    if (lower.includes("split")) nextType = "split";
    else if (lower.includes("metric")) nextType = "metrics";
    else if (lower.includes("process") || lower.includes("step")) nextType = "process";
    else if (lower.includes("timeline")) nextType = "timeline";
    else if (lower.includes("bullet")) nextType = "bullets";

    const updatedSlide = {
      ...targetSlide,
      layout: nextLayout,
      type: nextType,
    };
    actions.slides = slides.map((s, i) => (i === targetIndex ? normalizeSlide(updatedSlide, i) : s));
    actions.reply = `Updated slide "${targetSlide.name}" layout to ${nextType} (Layout ${nextLayout}).`;
    return actions;
  }

  // 6. Check slide shortening / rewrite command
  if (targetSlide && (lower.includes("short") || lower.includes("concise") || lower.includes("brief") || lower.includes("punchy") || lower.includes("rewrite") || lower.includes("regenerate"))) {
    const shortenedBullets = targetSlide.bullets.length
      ? targetSlide.bullets.map((b) => {
          const firstSentence = b.split(/[.!?]/)[0]?.trim() || b;
          return firstSentence.length > 50 ? `${firstSentence.slice(0, 48)}…` : firstSentence;
        }).slice(0, 3)
      : ["Lead with direct customer benefit.", "Highlight the key mechanism.", "State the clear next step."];

    const updatedSlide: Slide = {
      ...targetSlide,
      title: targetSlide.title.length > 40 ? targetSlide.title.slice(0, 38).trim() + "…" : targetSlide.title,
      body: targetSlide.body.split(/[.!?]/)[0] || targetSlide.body,
      bullets: shortenedBullets,
    };
    actions.slides = slides.map((s, i) => (i === targetIndex ? normalizeSlide(updatedSlide, i) : s));
    actions.reply = `Shortened and polished the copy on slide "${targetSlide.name}".`;
    return actions;
  }

  // 7. Check add slide command
  if (lower.includes("add slide") || lower.includes("new slide") || lower.includes("create slide")) {
    const topic = prompt.replace(/.*(about|for|on)\s+/i, "").trim() || "Key Advantage";
    const newSlide: Slide = {
      id: `s${Date.now().toString(36)}`,
      name: topic.length > 20 ? topic.slice(0, 18) + "…" : topic,
      type: "bullets",
      layout: "A",
      eyebrow: "New Section",
      title: topic.charAt(0).toUpperCase() + topic.slice(1),
      body: `Detailed overview of ${topic} tailored to your audience's core goals.`,
      bullets: [
        `Core mechanism driving ${topic}`,
        "Defensible proof and concrete impact",
        "Clear transition to the commercial outcome",
      ],
      metrics: [{ value: "10x", label: "Impact" }, { value: "100%", label: "Clarity" }],
      chart: [40, 65, 85, 100],
      useImage: false,
    };
    actions.slides = [...slides, newSlide];
    actions.reply = `Added a new slide: "${newSlide.title}".`;
    return actions;
  }

  // 8. Check delete slide command
  if (slides.length > 1 && (lower.includes("delete slide") || lower.includes("remove slide") || lower.includes("delete this slide"))) {
    actions.slides = slides.filter((_, i) => i !== targetIndex);
    actions.reply = `Deleted slide "${targetSlide?.name || 'selected slide'}".`;
    return actions;
  }

  // 9. Full deck rebuild / generation request
  const wantsRebuild = lower.includes("generate") || lower.includes("rebuild") || lower.includes("create deck") || lower.includes("webinar") || lower.includes("pitch");
  if (wantsRebuild || ctx.mode === "generate") {
    const count = Math.min(90, Math.max(1, Number.parseInt(ctx.slideCount, 10) || 8));
    const purpose = (PURPOSES.find((p) => lower.includes(p.toLowerCase())) ?? (ctx.purpose as Purpose)) || "Sales";
    const generated = generateDeck({
      purpose,
      count,
      company: ctx.description || prompt,
      hasImage: false,
    });
    actions.slides = generated.map(normalizeSlide);
    actions.reply = `Generated ${actions.slides.length} slides for your presentation.`;
    return actions;
  }

  // 10. General conversational slide edit
  if (targetSlide) {
    const updatedSlide: Slide = {
      ...targetSlide,
      body: `Refined based on your request: "${prompt}".`,
      bullets: targetSlide.bullets.length
        ? targetSlide.bullets.map((b, i) => i === 0 ? `${b} (Aligned with: ${prompt.slice(0, 30)})` : b)
        : ["Focused value proposition", "Practical proof points", "Actionable takeaway"],
    };
    actions.slides = slides.map((s, i) => (i === targetIndex ? normalizeSlide(updatedSlide, i) : s));
    actions.reply = `Updated slide "${targetSlide.name}" to reflect: "${prompt}".`;
    return actions;
  }

  return actions;
}
