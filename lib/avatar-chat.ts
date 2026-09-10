export type AvatarBlueprint = {
  persona_name: string;
  demographics: string;
  core_fear: string;
  buying_trigger: string;
  objections: string[];
  headlines: string[];
  social_hooks: string[];
  email_subject_lines: string[];
  research_notes?: string;
  primary_goals?: string[];
  values_and_beliefs?: string[];
  decision_style?: string;
  trusted_influences?: string[];
  day_in_the_life?: string;
  elevator_pitch?: string;
  content_ideas?: string[];
  search_topics?: string[];
  conversation_starters?: string[];
  competitive_edge?: string;
  strategy_synthesis?: string;
  slide_outline?: string[];
};

export type AvatarChatResponse = {
  reply: string;
  blueprint: AvatarBlueprint | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringList(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : fallback;
}

export function parseAvatarChatPayload(raw: unknown, previous: AvatarBlueprint | null): AvatarChatResponse {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const data = asRecord((candidate as { data?: unknown })?.data ?? candidate);
  const nestedBlueprint = asRecord(data.blueprint);
  const source = nestedBlueprint.persona_name || data.persona_name ? { ...data, ...nestedBlueprint } : nestedBlueprint;
  const reply = asString(data.reply)
    || asString(data.message)
    || asString(data.text)
    || asString(data.output);

  // Extract Mode 2 sections if present in reply text
  let extractedPersona = asString(source.persona_name, previous?.persona_name ?? "");
  let extractedFear = asString(source.core_fear, previous?.core_fear ?? "");
  let extractedPitch = asString(source.elevator_pitch, previous?.elevator_pitch ?? "");
  const extractedSlideOutline = asStringList(source.slide_outline, previous?.slide_outline ?? []);

  if (reply && /Slide-by-Slide Presentation Outline:/i.test(reply)) {
    const slideSectionMatch = reply.match(/Slide-by-Slide Presentation Outline:\s*([\s\S]*?)(?:$)/i);
    if (slideSectionMatch && slideSectionMatch[1]) {
      const parsedSlides = slideSectionMatch[1]
        .split(/\n+/)
        .map((l) => l.trim().replace(/^[-*•\d.]+\s*/, ""))
        .filter((l) => l.length > 5);
      if (parsedSlides.length && !extractedSlideOutline.length) {
        extractedSlideOutline.push(...parsedSlides);
      }
    }
  }

  if (reply && /Core Offer & Strategy:/i.test(reply)) {
    const offerMatch = reply.match(/Core Offer & Strategy:\s*([\s\S]*?)(?=Target Audience|Asset Utilization|Slide-by-Slide|$)/i);
    if (offerMatch && offerMatch[1] && !extractedPitch) {
      extractedPitch = offerMatch[1].trim().split("\n")[0].replace(/^[-*•]\s*/, "");
    }
  }

  if (reply && /Target Audience & Pain Points:/i.test(reply)) {
    const audienceMatch = reply.match(/Target Audience & Pain Points:\s*([\s\S]*?)(?=Core Offer|Asset Utilization|Slide-by-Slide|$)/i);
    if (audienceMatch && audienceMatch[1]) {
      const lines = audienceMatch[1].trim().split("\n").map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean);
      if (lines[0] && !extractedPersona) extractedPersona = lines[0];
      if (lines[1] && !extractedFear) extractedFear = lines[1];
    }
  }

  const hasPersona = Boolean(extractedPersona || previous?.persona_name);
  if (!hasPersona && !asString(source.persona_name) && !reply.includes("Core Offer & Strategy")) {
    return { reply, blueprint: previous };
  }

  const merged: AvatarBlueprint = {
    persona_name: extractedPersona,
    demographics: asString(source.demographics, previous?.demographics ?? ""),
    core_fear: extractedFear,
    buying_trigger: asString(source.buying_trigger, previous?.buying_trigger ?? ""),
    objections: asStringList(source.objections, previous?.objections ?? []),
    headlines: asStringList(source.headlines, previous?.headlines ?? []),
    social_hooks: asStringList(source.social_hooks, previous?.social_hooks ?? []),
    email_subject_lines: asStringList(source.email_subject_lines, previous?.email_subject_lines ?? []),
    research_notes: asString(source.research_notes, previous?.research_notes ?? ""),
    primary_goals: asStringList(source.primary_goals, previous?.primary_goals ?? []),
    values_and_beliefs: asStringList(source.values_and_beliefs, previous?.values_and_beliefs ?? []),
    decision_style: asString(source.decision_style, previous?.decision_style ?? ""),
    trusted_influences: asStringList(source.trusted_influences, previous?.trusted_influences ?? []),
    day_in_the_life: asString(source.day_in_the_life, previous?.day_in_the_life ?? ""),
    elevator_pitch: extractedPitch,
    content_ideas: asStringList(source.content_ideas, extractedSlideOutline.length ? extractedSlideOutline : previous?.content_ideas ?? []),
    search_topics: asStringList(source.search_topics, previous?.search_topics ?? []),
    conversation_starters: asStringList(source.conversation_starters, previous?.conversation_starters ?? []),
    competitive_edge: asString(source.competitive_edge, previous?.competitive_edge ?? ""),
    strategy_synthesis: asString(source.strategy_synthesis, previous?.strategy_synthesis ?? ""),
    slide_outline: extractedSlideOutline,
  };

  return {
    reply,
    blueprint: merged.persona_name ? merged : previous,
  };
}
