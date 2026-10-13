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
  | "stage" // dark, centred, big headline and a stage-sized countdown
  | "editorial" // magazine: left-aligned serif headline, numbered points
  | "spotlight" // one narrow centred card, picture on top
  | "band"; // coloured hero band with the headline, form card overlapping it

export type TemplateArt =
  | "orbits"
  | "waves"
  | "grid"
  | "sunburst"
  | "blobs"
  | "stripes"
  | "dots"
  | "peaks"
  | "rings"
  | "petals"
  | "arcs"
  | "bolt";

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
  imageShape: "circle" | "rounded" | "arch" | "square" | "blob";
  bulletStyle: "check" | "number" | "arrow" | "dash";
  background: "plain" | "dots" | "grid" | "glow" | "paper" | "diagonal" | "gradient";
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
    /** Third colour for artwork. */
    soft: string;
  };
};

export const DEFAULT_TEMPLATE_ID = "sage-classic";

export const WEBINAR_TEMPLATES: WebinarTemplate[] = [
  {
    id: "sage-classic",
    name: "Sage Classic",
    description: "Calm, trustworthy and warm. The original Webinar Stack look.",
    category: "Business",
    tags: ["consulting", "classic", "green", "warm", "professional"],
    layout: "classic",
    art: "orbits",
    imageShape: "circle",
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
      soft: "#dfe8e1",
    },
  },
  {
    id: "midnight-launch",
    name: "Midnight Launch",
    description: "Dark stage with electric cyan. Made for product launches and tech demos.",
    category: "Tech & SaaS",
    tags: ["dark", "launch", "product", "software", "ai", "startup", "neon", "demo"],
    layout: "stage",
    art: "grid",
    imageShape: "rounded",
    bulletStyle: "arrow",
    background: "glow",
    kicker: "Live product session",
    headingFont: "spaceGrotesk",
    bodyFont: "inter",
    uppercaseHeadline: true,
    dark: true,
    colors: {
      page: "#070b16",
      surface: "#0f1629",
      ink: "#eef3ff",
      muted: "#93a1bf",
      line: "#1f2a44",
      accent: "#22d3ee",
      accentInk: "#04131a",
      hero: "#6366f1",
      heroInk: "#ffffff",
      soft: "#1e2b4f",
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
    description: "Warm peach and coral with an arched portrait. Feels personal and hopeful.",
    category: "Coaching",
    tags: ["life coach", "mindset", "women", "personal growth", "warm", "orange", "peach"],
    layout: "split",
    art: "sunburst",
    imageShape: "arch",
    bulletStyle: "check",
    background: "gradient",
    kicker: "Free workshop",
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
      hero: "#ffb38a",
      heroInk: "#2b1a12",
      soft: "#ffe1cc",
    },
  },
  {
    id: "ocean-calm",
    name: "Ocean Calm",
    description: "Soft aqua and gentle waves. For wellbeing, therapy and mindfulness sessions.",
    category: "Health & wellness",
    tags: ["meditation", "therapy", "mental health", "yoga", "calm", "blue", "teal", "breathwork"],
    layout: "spotlight",
    art: "waves",
    imageShape: "blob",
    bulletStyle: "dash",
    background: "gradient",
    kicker: "Free guided session",
    headingFont: "lora",
    bodyFont: "nunito",
    colors: {
      page: "#eef7f6",
      surface: "#ffffff",
      ink: "#0f2e2c",
      muted: "#4f6f6c",
      line: "#cfe4e1",
      accent: "#0f766e",
      accentInk: "#ffffff",
      hero: "#7cc7bf",
      heroInk: "#0f2e2c",
      soft: "#d4eeea",
    },
  },
  {
    id: "bold-block",
    name: "Bold Block",
    description: "Loud yellow band and heavy type. Stops the scroll for sales and marketing events.",
    category: "Marketing",
    tags: ["sales", "ads", "agency", "yellow", "loud", "funnel", "ecommerce", "black"],
    layout: "band",
    art: "dots",
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
      soft: "#fff0a8",
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
    name: "Forest Retreat",
    description: "Deep green night with a golden glow. Grounded, natural and a little magical.",
    category: "Health & wellness",
    tags: ["nature", "holistic", "retreat", "spiritual", "green", "dark", "herbal", "sustainability"],
    layout: "stage",
    art: "petals",
    imageShape: "arch",
    bulletStyle: "dash",
    background: "glow",
    kicker: "An evening session",
    headingFont: "fraunces",
    bodyFont: "manrope",
    dark: true,
    colors: {
      page: "#0f1f17",
      surface: "#16291f",
      ink: "#f1efe4",
      muted: "#a9b5a6",
      line: "#24402f",
      accent: "#e9c46a",
      accentInk: "#1a1405",
      hero: "#2f6b4a",
      heroInk: "#f1efe4",
      soft: "#21402f",
    },
  },
  {
    id: "lavender-studio",
    name: "Lavender Studio",
    description: "Lilac, violet and soft shapes. For designers, artists and creative courses.",
    category: "Creative",
    tags: ["design", "art", "photography", "content creator", "purple", "playful", "brand"],
    layout: "split",
    art: "blobs",
    imageShape: "blob",
    bulletStyle: "check",
    background: "dots",
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
      soft: "#ddd0ff",
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
    name: "Estate Luxe",
    description: "Charcoal and champagne with elegant serif type. For property and premium services.",
    category: "Real estate",
    tags: ["property", "luxury", "realtor", "mortgage", "interior", "premium", "gold", "dark"],
    layout: "editorial",
    art: "rings",
    imageShape: "arch",
    bulletStyle: "dash",
    background: "plain",
    kicker: "Private online event",
    headingFont: "cormorant",
    bodyFont: "manrope",
    dark: true,
    colors: {
      page: "#161514",
      surface: "#1f1d1b",
      ink: "#f3ede2",
      muted: "#b4aa9a",
      line: "#3a3530",
      accent: "#d4b483",
      accentInk: "#161514",
      hero: "#8a7350",
      heroInk: "#f3ede2",
      soft: "#2a2622",
    },
  },
  {
    id: "classroom-bright",
    name: "Classroom Bright",
    description: "Sky blue with an orange spark. Friendly for courses, tutoring and schools.",
    category: "Education",
    tags: ["course", "teacher", "school", "learning", "kids", "parents", "blue", "orange", "friendly"],
    layout: "spotlight",
    art: "dots",
    imageShape: "circle",
    bulletStyle: "number",
    background: "dots",
    kicker: "Free online class",
    headingFont: "nunito",
    bodyFont: "nunito",
    colors: {
      page: "#eaf6ff",
      surface: "#ffffff",
      ink: "#0c2a43",
      muted: "#4a6680",
      line: "#cfe6f7",
      accent: "#f97316",
      accentInk: "#ffffff",
      hero: "#38bdf8",
      heroInk: "#0c2a43",
      soft: "#d4ecfb",
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
    description: "Earthy clay and cream with a soft arc. Good for founders telling their story.",
    category: "Business",
    tags: ["founder", "small business", "story", "earthy", "clay", "brown", "handmade"],
    layout: "split",
    art: "arcs",
    imageShape: "circle",
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
      soft: "#efd9c3",
    },
  },
  {
    id: "neon-growth",
    name: "Neon Growth",
    description: "Violet night with a pink-to-blue glow. Built for growth, ads and creator economy.",
    category: "Marketing",
    tags: ["growth", "social media", "instagram", "tiktok", "creator", "gradient", "purple", "dark"],
    layout: "spotlight",
    art: "rings",
    imageShape: "circle",
    bulletStyle: "check",
    background: "glow",
    kicker: "Live strategy session",
    headingFont: "sora",
    bodyFont: "inter",
    dark: true,
    colors: {
      page: "#120b26",
      surface: "#1b1236",
      ink: "#f4f0ff",
      muted: "#a99fca",
      line: "#2d2152",
      accent: "#ec4899",
      accentInk: "#ffffff",
      hero: "#38bdf8",
      heroInk: "#120b26",
      soft: "#2b1d55",
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
