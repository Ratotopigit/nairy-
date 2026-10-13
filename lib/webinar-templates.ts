/**
 * Registration page templates. Every template shows the same content (the
 * host fills it in once); a template only decides how it looks: layout,
 * colours, type, image shape, background and the artwork shown when the
 * host has no photo.
 *
 * Plain data, no React, so lib/webinars.ts can import the default id.
 */
import type { TemplateFont } from "@/lib/webinar-fonts";

export type TemplateLayout =
  | "classic" // centred headline, picture + countdown beside the points and form
  | "split" // story on the left, one card with picture, countdown and form on the right
  | "stage" // centred, big headline and a stage-sized countdown
  | "editorial" // magazine: left-aligned serif headline, numbered points
  | "spotlight" // one narrow centred card, picture on top
  | "band"; // coloured hero band with the headline, form card overlapping it

/** The illustration shown when the host has no photo (components/webinar/TemplateArt). */
export type TemplateArt =
  | "desk" // someone at a laptop: business
  | "conversation" // coach and client talking: coaching
  | "presenter" // someone pointing at a rising chart: founders, business
  | "meditate" // seated figure over soft hills: wellness
  | "megaphone" // someone with a megaphone, floating cards: marketing
  | "stage" // speaker under a spotlight between curtains: masterclasses
  | "teacher" // teacher at a board with books: education
  | "house" // modern house and a key: real estate
  | "rocket" // rocket and planet: product launches
  | "botanical" // leaves in a vase: calm, holistic
  | "creative" // paint shapes and a brush: creative
  | "arcs" // layered arcs: minimal
  | "peaks" // rising chart: finance
  | "stripes" // editorial stripes
  | "bolt"; // lightning bolt: fitness

export type TemplateCategory =
  | "Business"
  | "Coaching"
  | "Health & wellness"
  | "Tech & SaaS"
  | "Creative"
  | "Finance"
  | "Real estate"
  | "Education"
  | "Fitness"
  | "Marketing";

export type WebinarTemplate = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  /** Extra words people might search for. */
  tags: string[];
  layout: TemplateLayout;
  art: TemplateArt;
  imageShape: "circle" | "rounded" | "square" | "blob";
  bulletStyle: "check" | "number" | "arrow" | "dash";
  background: "plain" | "grid" | "glow" | "paper" | "diagonal" | "gradient" | "mesh";
  /** Small line above everything, e.g. "Free live training". */
  kicker: string;
  headingFont: TemplateFont;
  bodyFont: TemplateFont;
  uppercaseHeadline?: boolean;
  dark?: boolean;
  colors: {
    page: string;
    surface: string;
    ink: string;
    muted: string;
    line: string;
    accent: string;
    accentInk: string;
    /** Second colour used by artwork, badges and the band layout. */
    hero: string;
    heroInk: string;
    /** Backdrop of the artwork. */
    soft: string;
  };
};

export const DEFAULT_TEMPLATE_ID = "sage-classic";

// Ids are stored on webinars, so they never change even when a template is
// redesigned and renamed (e.g. "midnight-launch" is now "Launch Day").
export const WEBINAR_TEMPLATES: WebinarTemplate[] = [
  {
    id: "sage-classic",
    name: "Sage Classic",
    description: "Calm, trustworthy and warm, with a host at work. The original Webinar Stack look.",
    category: "Business",
    tags: ["consulting", "classic", "green", "warm", "professional", "laptop", "illustration"],
    layout: "classic",
    art: "desk",
    imageShape: "rounded",
    bulletStyle: "check",
    background: "paper",
    kicker: "Free live training",
    headingFont: "inter",
    bodyFont: "inter",
    colors: {
      page: "#fbfaf6",
      surface: "#ffffff",
      ink: "#1d2a27",
      muted: "#5b6763",
      line: "#ddd7ca",
      accent: "#b95f35",
      accentInk: "#ffffff",
      hero: "#1f4d3d",
      heroInk: "#f4f1e8",
      soft: "#e4ebe4",
    },
  },
  {
    id: "midnight-launch",
    name: "Launch Day",
    description: "Bright and confident, with a rocket taking off. For product launches and demos.",
    category: "Tech & SaaS",
    tags: ["launch", "product", "software", "ai", "startup", "demo", "blue", "rocket", "illustration"],
    layout: "split",
    art: "rocket",
    imageShape: "rounded",
    bulletStyle: "arrow",
    background: "mesh",
    kicker: "Live product launch",
    headingFont: "spaceGrotesk",
    bodyFont: "inter",
    colors: {
      page: "#f5f7ff",
      surface: "#ffffff",
      ink: "#0b1533",
      muted: "#55607a",
      line: "#dfe5f5",
      accent: "#2563eb",
      accentInk: "#ffffff",
      hero: "#1e3a8a",
      heroInk: "#ffffff",
      soft: "#dfe7ff",
    },
  },
  {
    id: "editorial-ink",
    name: "Editorial Ink",
    description: "A magazine feature: big serif headline, numbered points, deep red accent.",
    category: "Coaching",
    tags: ["author", "book", "speaker", "serif", "magazine", "thought leadership", "red"],
    layout: "editorial",
    art: "stripes",
    imageShape: "square",
    bulletStyle: "number",
    background: "paper",
    kicker: "A live masterclass",
    headingFont: "playfair",
    bodyFont: "lora",
    colors: {
      page: "#f7f3ea",
      surface: "#fffdf8",
      ink: "#191714",
      muted: "#5f5a52",
      line: "#d9d1c1",
      accent: "#b3261e",
      accentInk: "#ffffff",
      hero: "#191714",
      heroInk: "#f7f3ea",
      soft: "#eadfca",
    },
  },
  {
    id: "sunrise-coach",
    name: "Sunrise Coach",
    description: "Warm peach and coral, with a coach and client mid-conversation. Personal and hopeful.",
    category: "Coaching",
    tags: ["life coach", "mindset", "women", "personal growth", "warm", "orange", "peach", "people", "illustration"],
    layout: "split",
    art: "conversation",
    imageShape: "rounded",
    bulletStyle: "check",
    background: "gradient",
    kicker: "Free coaching workshop",
    headingFont: "dmSerif",
    bodyFont: "manrope",
    colors: {
      page: "#fff4ec",
      surface: "#ffffff",
      ink: "#2b1a12",
      muted: "#7a5a4b",
      line: "#f2d7c6",
      accent: "#e8590c",
      accentInk: "#ffffff",
      hero: "#c2410c",
      heroInk: "#ffffff",
      soft: "#ffe3d0",
    },
  },
  {
    id: "ocean-calm",
    name: "Bloom Wellness",
    description: "Blush and berry with a meditating figure over soft hills. For wellbeing and therapy.",
    category: "Health & wellness",
    tags: ["meditation", "therapy", "mental health", "yoga", "calm", "pink", "women", "breathwork", "illustration"],
    layout: "spotlight",
    art: "meditate",
    imageShape: "rounded",
    bulletStyle: "dash",
    background: "mesh",
    kicker: "Live wellness session",
    headingFont: "lora",
    bodyFont: "nunito",
    colors: {
      page: "#fdf6f3",
      surface: "#ffffff",
      ink: "#3b1d2a",
      muted: "#7d5f6b",
      line: "#f1dcd8",
      accent: "#b4436c",
      accentInk: "#ffffff",
      hero: "#e7a1ad",
      heroInk: "#3b1d2a",
      soft: "#fbe7e4",
    },
  },
  {
    id: "bold-block",
    name: "Bold Block",
    description: "Loud yellow band, heavy type and a speaker with a megaphone. Stops the scroll.",
    category: "Marketing",
    tags: ["sales", "ads", "agency", "yellow", "loud", "funnel", "ecommerce", "black", "illustration"],
    layout: "band",
    art: "megaphone",
    imageShape: "rounded",
    bulletStyle: "arrow",
    background: "plain",
    kicker: "Free live training",
    headingFont: "archivoBlack",
    bodyFont: "inter",
    colors: {
      page: "#fffdf2",
      surface: "#ffffff",
      ink: "#111111",
      muted: "#555248",
      line: "#e8e2c8",
      accent: "#111111",
      accentInk: "#ffd23f",
      hero: "#ffd23f",
      heroInk: "#111111",
      soft: "#fff3b8",
    },
  },
  {
    id: "capital-navy",
    name: "Capital Navy",
    description: "Navy and gold with a rising chart. Serious enough for investors and advisers.",
    category: "Finance",
    tags: ["investing", "wealth", "accounting", "tax", "banking", "navy", "gold", "b2b"],
    layout: "band",
    art: "peaks",
    imageShape: "rounded",
    bulletStyle: "check",
    background: "plain",
    kicker: "Live briefing",
    headingFont: "fraunces",
    bodyFont: "manrope",
    colors: {
      page: "#f6f7fa",
      surface: "#ffffff",
      ink: "#0f1d33",
      muted: "#56627a",
      line: "#dde2ec",
      accent: "#c9a227",
      accentInk: "#0f1d33",
      hero: "#0f2a4a",
      heroInk: "#f6f7fa",
      soft: "#1d3e66",
    },
  },
  {
    id: "forest-retreat",
    name: "Pure Balance",
    description: "Sand, clay and botanical shapes. Natural and grounded without feeling sleepy.",
    category: "Health & wellness",
    tags: ["nature", "holistic", "nutrition", "herbal", "skincare", "sustainability", "earthy", "plants"],
    layout: "classic",
    art: "botanical",
    imageShape: "rounded",
    bulletStyle: "check",
    background: "paper",
    kicker: "An evening of calm",
    headingFont: "fraunces",
    bodyFont: "manrope",
    colors: {
      page: "#f8f4ee",
      surface: "#fffdf9",
      ink: "#2b2420",
      muted: "#6f6359",
      line: "#e7ddd0",
      accent: "#b5652b",
      accentInk: "#ffffff",
      hero: "#7a5c43",
      heroInk: "#fffdf9",
      soft: "#efe4d6",
    },
  },
  {
    id: "lavender-studio",
    name: "Lavender Studio",
    description: "Lilac, violet and painterly shapes. For designers, artists and creative courses.",
    category: "Creative",
    tags: ["design", "art", "photography", "content creator", "purple", "playful", "brand", "paint"],
    layout: "split",
    art: "creative",
    imageShape: "blob",
    bulletStyle: "check",
    background: "gradient",
    kicker: "Live creative class",
    headingFont: "sora",
    bodyFont: "sora",
    colors: {
      page: "#f5f1ff",
      surface: "#ffffff",
      ink: "#1e1433",
      muted: "#655a7d",
      line: "#e2d9f7",
      accent: "#6d28d9",
      accentInk: "#ffffff",
      hero: "#f472b6",
      heroInk: "#1e1433",
      soft: "#e4d8ff",
    },
  },
  {
    id: "clean-minimal",
    name: "Clean Minimal",
    description: "White space, sharp type and one indigo accent. Lets the offer do the talking.",
    category: "Tech & SaaS",
    tags: ["minimal", "simple", "white", "saas", "product", "indigo", "modern"],
    layout: "classic",
    art: "arcs",
    imageShape: "rounded",
    bulletStyle: "check",
    background: "grid",
    kicker: "Free webinar",
    headingFont: "inter",
    bodyFont: "inter",
    colors: {
      page: "#ffffff",
      surface: "#ffffff",
      ink: "#0b0b12",
      muted: "#5c5f6e",
      line: "#e6e7ee",
      accent: "#4f46e5",
      accentInk: "#ffffff",
      hero: "#a5b4fc",
      heroInk: "#0b0b12",
      soft: "#eef0ff",
    },
  },
  {
    id: "estate-luxe",
    name: "Open House",
    description: "Slate and brass with a modern home and its key. Clean and aspirational for property.",
    category: "Real estate",
    tags: ["property", "realtor", "mortgage", "home buying", "investment property", "interior", "brass", "illustration"],
    layout: "band",
    art: "house",
    imageShape: "rounded",
    bulletStyle: "check",
    background: "plain",
    kicker: "Live property webinar",
    headingFont: "playfair",
    bodyFont: "manrope",
    colors: {
      page: "#f7f5f0",
      surface: "#ffffff",
      ink: "#1d2327",
      muted: "#5d6670",
      line: "#e3ded4",
      accent: "#b08446",
      accentInk: "#ffffff",
      hero: "#23303b",
      heroInk: "#f7f5f0",
      soft: "#e2eaef",
    },
  },
  {
    id: "classroom-bright",
    name: "Bright Class",
    description: "Sunflower and royal blue with a teacher at the board. Friendly, clear and focused.",
    category: "Education",
    tags: ["course", "teacher", "school", "learning", "tutoring", "parents", "students", "blue", "yellow", "illustration"],
    layout: "split",
    art: "teacher",
    imageShape: "rounded",
    bulletStyle: "number",
    background: "gradient",
    kicker: "Free online class",
    headingFont: "nunito",
    bodyFont: "nunito",
    colors: {
      page: "#fffaf0",
      surface: "#ffffff",
      ink: "#1f2a44",
      muted: "#5b6680",
      line: "#f0e4c8",
      accent: "#2f5bd3",
      accentInk: "#ffffff",
      hero: "#f5b82e",
      heroInk: "#1f2a44",
      soft: "#fdeec9",
    },
  },
  {
    id: "power-lift",
    name: "Power Lift",
    description: "Black, lime and condensed type with diagonal energy. For fitness and sport.",
    category: "Fitness",
    tags: ["gym", "training", "nutrition", "sport", "athlete", "energy", "lime", "black", "dark"],
    layout: "band",
    art: "bolt",
    imageShape: "rounded",
    bulletStyle: "arrow",
    background: "diagonal",
    kicker: "Live training session",
    headingFont: "anton",
    bodyFont: "inter",
    uppercaseHeadline: true,
    dark: true,
    colors: {
      page: "#0b0b0b",
      surface: "#151515",
      ink: "#f5f5f5",
      muted: "#a3a3a3",
      line: "#2a2a2a",
      accent: "#a3e635",
      accentInk: "#0b0b0b",
      hero: "#a3e635",
      heroInk: "#0b0b0b",
      soft: "#1f2a0d",
    },
  },
  {
    id: "terracotta-talk",
    name: "Terracotta Talk",
    description: "Earthy clay and cream with a founder presenting their growth. Tells a story.",
    category: "Business",
    tags: ["founder", "small business", "story", "earthy", "clay", "brown", "presenting", "chart", "illustration"],
    layout: "split",
    art: "presenter",
    imageShape: "rounded",
    bulletStyle: "number",
    background: "paper",
    kicker: "Live founder session",
    headingFont: "fraunces",
    bodyFont: "inter",
    colors: {
      page: "#f6efe6",
      surface: "#fffaf3",
      ink: "#2a1d15",
      muted: "#6d5a4c",
      line: "#e5d6c4",
      accent: "#a8482b",
      accentInk: "#ffffff",
      hero: "#d98c5f",
      heroInk: "#2a1d15",
      soft: "#f0dcc6",
    },
  },
  {
    id: "neon-growth",
    name: "Spotlight",
    description: "A speaker on stage between red curtains. For masterclasses and big-name sessions.",
    category: "Marketing",
    tags: ["masterclass", "keynote", "speaker", "event", "stage", "influencer", "red", "illustration"],
    layout: "stage",
    art: "stage",
    imageShape: "rounded",
    bulletStyle: "check",
    background: "mesh",
    kicker: "Live masterclass",
    headingFont: "sora",
    bodyFont: "inter",
    colors: {
      page: "#fff7f3",
      surface: "#ffffff",
      ink: "#1c1412",
      muted: "#6f5d57",
      line: "#f3ddd3",
      accent: "#e11d48",
      accentInk: "#ffffff",
      hero: "#2a1714",
      heroInk: "#fff7f3",
      soft: "#ffe2d6",
    },
  },
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Business",
  "Coaching",
  "Health & wellness",
  "Tech & SaaS",
  "Creative",
  "Finance",
  "Real estate",
  "Education",
  "Fitness",
  "Marketing",
];

/** Colours hosts can pick from; any other colour works too. */
export const THEME_SWATCHES = [
  "#b95f35", "#e8590c", "#dc2626", "#db2777", "#6d28d9", "#4f46e5",
  "#2563eb", "#0f766e", "#1f4d3d", "#16a34a", "#c9a227", "#111111",
] as const;

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

/** Black or white, whichever reads better on `hex` (WCAG relative luminance). */
export function readableInk(hex: string): string {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  // Contrast against white vs against near-black; pick the higher.
  return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.05 ? "#ffffff" : "#111111";
}

/**
 * The template's colours with the host's overrides applied: "accent" is the
 * button, "brand" the badges, ticks, band and artwork. Text on top of each
 * is chosen automatically so it stays readable whatever they pick.
 */
export function themedColors(
  template: WebinarTemplate,
  overrides: { theme_accent?: string; theme_brand?: string },
): WebinarTemplate["colors"] {
  const c = { ...template.colors };
  if (overrides.theme_accent && isHexColor(overrides.theme_accent)) {
    c.accent = overrides.theme_accent;
    c.accentInk = readableInk(overrides.theme_accent);
  }
  if (overrides.theme_brand && isHexColor(overrides.theme_brand)) {
    c.hero = overrides.theme_brand;
    c.heroInk = readableInk(overrides.theme_brand);
    // The artwork's backdrop follows the brand, tinted toward the page.
    c.soft = mixHex(c.page, overrides.theme_brand, template.dark ? 0.35 : 0.2);
  }
  return c;
}

function mixHex(a: string, b: string, amount: number): string {
  if (!isHexColor(a) || !isHexColor(b)) return a;
  const ch = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return `#${[1, 3, 5]
    .map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * amount).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function getTemplate(id: string | undefined): WebinarTemplate {
  return WEBINAR_TEMPLATES.find((t) => t.id === id) ?? WEBINAR_TEMPLATES[0];
}

/** Matches name, category, description and tags, every word must hit. */
export function searchTemplates(text: string, category: TemplateCategory | "All" = "All"): WebinarTemplate[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  return WEBINAR_TEMPLATES.filter((t) => {
    if (category !== "All" && t.category !== category) return false;
    const haystack = [t.name, t.category, t.description, ...t.tags, t.dark ? "dark" : "light"]
      .join(" ")
      .toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}
