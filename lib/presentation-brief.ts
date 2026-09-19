export type PalettePreset = "Clay" | "Ochre" | "Slate" | "Ink" | "Custom";

export type PresentationBrief = {
  business: { category: string | null; description: string };
  audience: { category: string | null; description: string };
  problem: { outcome: string | null; description: string };
  objection: { type: string | null; description: string };
  presentation: {
    type: string;
    slideCount: number | "Auto";
    ratio: string;
    style: string;
  };
  palette: {
    preset: PalettePreset;
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  assets: {
    image: string | null;
    logo: string | null;
    removeBackground: boolean;
  };
};

export type GeneratedPresentation = {
  title: string;
  slideCount: number | "Auto";
  ratio: string;
  style: string;
  openUrl: string | null;
  downloadUrl: string | null;
};

export const PALETTES: Record<
  Exclude<PalettePreset, "Custom">,
  { primary: string; secondary: string; accent: string; background: string }
> = {
  Clay: { primary: "#C85C38", secondary: "#1B1B18", accent: "#D98968", background: "#F5F3EE" },
  Ochre: { primary: "#B98A2E", secondary: "#2A2621", accent: "#E0BB6C", background: "#F7F2E7" },
  Slate: { primary: "#48606E", secondary: "#1E262B", accent: "#8FA7B3", background: "#F1F3F4" },
  Ink: { primary: "#1B1B18", secondary: "#3D3B36", accent: "#77746D", background: "#FAF9F6" },
};

const WEBHOOK_URL = process.env.NEXT_PUBLIC_PRESENTATION_WEBHOOK_URL;

/**
 * Single integration point for presentation generation.
 * Later this POSTs the brief straight to the n8n webhook.
 */
export async function submitPresentationBrief(
  payload: PresentationBrief,
): Promise<GeneratedPresentation> {
  if (WEBHOOK_URL) {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Generation failed (${res.status})`);
    const data = (await res.json()) as Partial<GeneratedPresentation>;
    return {
      title: data.title ?? derivedTitle(payload),
      slideCount: data.slideCount ?? payload.presentation.slideCount,
      ratio: data.ratio ?? payload.presentation.ratio,
      style: data.style ?? payload.presentation.style,
      openUrl: data.openUrl ?? null,
      downloadUrl: data.downloadUrl ?? null,
    };
  }

  // No webhook configured yet: simulate the round-trip so the flow stays complete.
  await new Promise((r) => setTimeout(r, 600));
  return {
    title: derivedTitle(payload),
    slideCount: payload.presentation.slideCount,
    ratio: payload.presentation.ratio,
    style: payload.presentation.style,
    openUrl: null,
    downloadUrl: null,
  };
}

function derivedTitle(payload: PresentationBrief): string {
  const base = payload.business.category ?? "Your Business";
  return `${base.split(" / ")[0]} — ${payload.presentation.type}`;
}
