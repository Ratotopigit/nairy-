export const HANDOFF = {
  blueprint: "astrocraft:latest-blueprint",
  idea: "astrocraft:avatar-idea",
  autoBuild: "astrocraft:auto-build-content",
  session: "astrocraft:source-session-id",
  prompt: "astrocraft:generation-prompt",
  sections: "astrocraft:selected-sections",
  intent: "astrocraft:creation-intent",
  offerFocus: "astrocraft:offer-focus",
} as const;

export type BuyerBlueprintLike = {
  persona_name?: string;
  demographics?: string;
  core_fear?: string;
  buying_trigger?: string;
  objections?: string[];
  headlines?: string[];
  content_ideas?: string[];
  elevator_pitch?: string;
  offer?: {
    title?: string;
    promise?: string;
    pricing?: string;
    scope?: string[];
  };
};

export type HandoffSection = {
  id: string;
  label: string;
  selected: boolean;
};

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

export function suggestedSections(blueprint: BuyerBlueprintLike | null, ideaText = ""): HandoffSection[] {
  if (ideaText && /Slide-by-Slide Presentation Outline:/i.test(ideaText)) {
    const match = ideaText.match(/Slide-by-Slide Presentation Outline:\s*([\s\S]*?)(?:$)/i);
    if (match && match[1]) {
      const slideLines = match[1]
        .split(/\n+/)
        .map((line) => line.trim().replace(/^[-*•\d.]+\s*/, ""))
        .filter((line) => line.length > 5);
      if (slideLines.length) {
        return slideLines.map((label, index) => ({
          id: `slide-outline-${index}`,
          label,
          selected: true,
        }));
      }
    }
  }

  const ideas = list(blueprint?.content_ideas);
  const headlines = list(blueprint?.headlines);
  const objections = list(blueprint?.objections);
  const fromBlueprint = [
    ...ideas.map((label, index) => ({ id: `idea-${index}`, label, selected: true })),
    ...headlines.slice(0, 4).map((label, index) => ({ id: `hook-${index}`, label: `Hook: ${label}`, selected: true })),
    ...objections.slice(0, 3).map((label, index) => ({ id: `objection-${index}`, label: `Handle objection: ${label}`, selected: true })),
  ];
  if (fromBlueprint.length) return fromBlueprint.slice(0, 12);
  if (ideaText.trim()) {
    return ideaText
      .split(/\n+/)
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter((line) => line.length > 12)
      .slice(0, 8)
      .map((label, index) => ({ id: `chat-${index}`, label, selected: true }));
  }
  return [
    { id: "open", label: "Opening hook and audience fit", selected: true },
    { id: "problem", label: "Core problem and cost of waiting", selected: true },
    { id: "shift", label: "Belief shift / unique mechanism", selected: true },
    { id: "proof", label: "Proof placeholders and process", selected: true },
    { id: "offer", label: "Offer, investment, and next step", selected: true },
    { id: "close", label: "Q&A and closing CTA", selected: true },
  ];
}

export function buildGenerationPrompt(input: {
  blueprint: BuyerBlueprintLike | null;
  ideaText: string;
  sections: HandoffSection[];
  assetContext?: string;
}): string {
  const blueprint = input.blueprint ?? {};
  const selected = input.sections.filter((section) => section.selected).map((section) => section.label);
  const offer = blueprint.offer;
  return [
    input.ideaText.trim() ? `Brainstormed idea:\n${input.ideaText.trim()}` : "",
    blueprint.persona_name ? `Buyer: ${blueprint.persona_name}` : "",
    blueprint.demographics ? `Audience: ${blueprint.demographics}` : "",
    blueprint.core_fear ? `Core problem: ${blueprint.core_fear}` : "",
    blueprint.buying_trigger ? `Buying trigger: ${blueprint.buying_trigger}` : "",
    blueprint.elevator_pitch ? `Pitch: ${blueprint.elevator_pitch}` : "",
    typeof offer?.title === "string" ? `Offer: ${offer.title}` : "",
    typeof offer?.promise === "string" ? `Promise: ${offer.promise}` : "",
    typeof offer?.pricing === "string" ? `Investment: ${offer.pricing}` : "",
    list(offer?.scope).length ? `Offer scope: ${list(offer?.scope).join("; ")}` : "",
    selected.length ? `Use these sections, in this order:\n${selected.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : "",
    input.assetContext ? `Brand, uploads, and brief:\n${input.assetContext}` : "",
    "Keep speaker-ready copy. Do not invent proof, stats, or testimonials. Use placeholders where evidence is missing.",
  ].filter(Boolean).join("\n\n");
}

export function storeHandoff(values: Partial<Record<keyof typeof HANDOFF, string>>) {
  for (const [key, value] of Object.entries(values)) {
    const storageKey = HANDOFF[key as keyof typeof HANDOFF];
    if (!storageKey) continue;
    if (value) sessionStorage.setItem(storageKey, value);
    else sessionStorage.removeItem(storageKey);
  }
}
