/**
 * Registration page templates.
 *
 * A template is a COMPOSITION (one of eleven layouts) in a category's own
 * colours and type. Every template shows the same content; the host fills it
 * in once and can switch templates without losing anything.
 *
 * Colour: a template (and a host's overrides) only ever supplies FOUR seed
 * colours: background, text, brand and button. Everything else (surfaces,
 * hairlines, muted text, on-colour text) is derived and contrast-checked in
 * `derivePalette`, so any combination a host picks stays readable.
 *
 * Plain data and pure functions, no React, so lib/webinars.ts can import it.
 */
import { contrast, darkenForWhite, ensureContrast, isDark, isHex, luminance, mix, parseHex, readableInk, rgba } from "@/lib/color";

/**
 * Curated heading + body pairings. The actual font files are loaded in
 * lib/webinar-fonts.ts; this is only the catalogue, so this module stays
 * free of Next.js and can run in tests.
 */
export const FONT_PAIR_CATALOG = {
  "bodoni-public": { label: "Magazine", note: "High-contrast serif with a clean sans" },
  "playfair-inter": { label: "Classic Editorial", note: "Elegant serif, neutral sans" },
  "playfair-bold": { label: "Bold Editorial", note: "Heavy serif headlines, neutral sans" },
  "instrument-inter": { label: "Modern Editorial", note: "Tall, refined display serif" },
  "cormorant-inter": { label: "Refined", note: "Light, airy and elegant" },
  "fraunces-inter": { label: "Warm Serif", note: "Soft, friendly and human" },
  "lora-raleway": { label: "Calm", note: "Gentle serif with a light sans" },
  "dmserif-dmsans": { label: "Friendly", note: "Approachable serif, rounded sans" },
  "jakarta-inter": { label: "Modern Sans", note: "Clean, contemporary and confident" },
  "manrope-inter": { label: "Minimal Sans", note: "Quiet, precise and neutral" },
  "bricolage-inter": { label: "Expressive", note: "Characterful grotesque for bold brands" },
} as const;

export type FontPairId = keyof typeof FONT_PAIR_CATALOG;
export const FONT_PAIR_IDS = Object.keys(FONT_PAIR_CATALOG) as FontPairId[];

export function isFontPairId(value: string): value is FontPairId {
  return value in FONT_PAIR_CATALOG;
}

export type LayoutId =
  | "editorial"
  | "photo"
  | "minimal"
  | "host"
  | "asymmetric"
  | "split"
  | "poster"
  | "letter"
  | "bento"
  | "agenda"
  | "card"
  | "training";

export const LAYOUT_LABELS: Record<LayoutId, { name: string; short: string; blurb: string }> = {
  editorial: { name: "Editorial", short: "Editorial", blurb: "Magazine masthead, big type and a side form" },
  photo: { name: "Photography-led", short: "Photo", blurb: "A full-width photo with the form resting on it" },
  minimal: { name: "Minimal", short: "Minimal", blurb: "One calm centred column and a single-row form" },
  host: { name: "Host spotlight", short: "Host", blurb: "Your portrait leads a colour banner" },
  asymmetric: { name: "Asymmetric", short: "Offset", blurb: "An offset image with an overlapping form card" },
  split: { name: "Split screen", short: "Split", blurb: "Half colour or photo, half form, side by side" },
  poster: { name: "Poster", short: "Poster", blurb: "A huge headline over a three-part strip" },
  letter: { name: "Letter", short: "Letter", blurb: "A personal letter with a date rail and inline form" },
  bento: { name: "Bento grid", short: "Bento", blurb: "Rounded tiles for headline, date, outcomes and form" },
  agenda: { name: "Programme", short: "Programme", blurb: "A form column beside a big numbered programme" },
  card: { name: "Focus card", short: "Focus", blurb: "One floating card on a colour or photo backdrop" },
  training: { name: "Sales training", short: "Training", blurb: "A dark sales hero, a long-form page and a full thank-you page" },
};

export type TemplateCategory =
  | "Business"
  | "Coaching"
  | "Health & wellness"
  | "Healthcare"
  | "Finance"
  | "Tech & SaaS"
  | "Education"
  | "Creative"
  | "Real estate"
  | "Fitness"
  | "Marketing";

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Business",
  "Coaching",
  "Health & wellness",
  "Healthcare",
  "Finance",
  "Tech & SaaS",
  "Education",
  "Creative",
  "Real estate",
  "Fitness",
  "Marketing",
];

export type PaletteSeed = { bg: string; ink: string; brand: string; accent: string };

export type TemplateLook = {
  /** Corner radius in px for fields, buttons, panels and images. */
  radius: number;
  /** Boxed inputs, or a single underline. */
  field: "box" | "line";
  /** How the learning outcomes are marked. */
  outcomes: "numbered" | "dash" | "tick";
  /** Placeholder treatment when there is no photo yet. */
  backdrop: "studio" | "paper" | "dusk";
  /** Uppercase headline. */
  caps?: boolean;
  /** Mirror the composition. */
  flip?: boolean;
  /** Fully rounded buttons. */
  pill?: boolean;
};

export type WebinarTemplate = {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  /** Extra words people might search for. */
  tags: string[];
  layout: LayoutId;
  seed: PaletteSeed;
  fonts: FontPairId;
  look: TemplateLook;
  /** Small line above the headline. */
  kicker: string;
  /** Shown first, under "Most liked" in the picker. */
  featured?: boolean;
};

// ── Palette ───────────────────────────────────────────────────────────────

export type Palette = {
  dark: boolean;
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  tint: string;
  brand: string;
  brandInk: string;
  brandDeep: string;
  /** The brand colour made safe to use as TEXT on the page background. */
  brandText: string;
  accent: string;
  accentInk: string;
  /** Overlay colour for text sitting on photos. */
  scrim: string;
  /** Field borders: at least 3:1 against the page and the card (WCAG 1.4.11). */
  lineStrong: string;
  /** Error text, readable on the page and the card. */
  danger: string;
  /** Soft text on the brand colour (kickers, secondary lines). */
  brandInkSoft: string;
  /** Two dark tones for the photo-less hero backdrop; white text reads on both. */
  heroA: string;
  heroB: string;
};

/**
 * Everything the page needs, from four seeds. Text colours are pushed until
 * they pass WCAG AA on every surface they can sit on, whatever the host
 * chose, so a custom colour can be unfashionable but never unreadable.
 */
export function derivePalette(seed: PaletteSeed): Palette {
  const dark = isDark(seed.bg);
  const bg = seed.bg;
  let surface = dark ? mix(bg, "#ffffff", 0.07) : mix(bg, "#ffffff", 0.62);
  // On a mid-tone page, a lighter card can leave no single text colour that
  // reads on both. Then the card just takes the page colour.
  const bestOn = (c: string) => Math.max(contrast("#000000", c), contrast("#ffffff", c));
  const bothOk = (e: string) => Math.min(contrast(e, bg), contrast(e, surface)) >= 4.5;
  if (!(bothOk("#000000") || bothOk("#ffffff")) || bestOn(bg) < 4.5) surface = bg;
  const ink = ensureContrast(seed.ink, [bg, surface], 7);
  const muted = ensureContrast(mix(ink, bg, 0.4), [bg, surface], 4.5);
  const line = mix(bg, ink, dark ? 0.2 : 0.15);
  const tint = mix(bg, seed.brand, dark ? 0.24 : 0.16);
  // Dark enough that white text on it (over a photo, or on a bare backdrop)
  // always reads, whatever brand colour the host chose.
  const brandDeep = darkenForWhite(mix(seed.brand, "#000000", 0.35), 6);
  return {
    dark,
    bg,
    surface,
    ink,
    muted,
    line,
    tint,
    brand: seed.brand,
    brandInk: readableInk(seed.brand),
    brandDeep,
    brandText: ensureContrast(seed.brand, [bg, surface], 4.5),
    accent: seed.accent,
    accentInk: readableInk(seed.accent),
    scrim: rgba(mix(brandDeep, "#000000", 0.35), 1),
    lineStrong: ensureContrast(mix(bg, ink, 0.45), [bg, surface], 3),
    danger: ensureContrast(dark ? "#ff8f84" : "#b42318", [bg, surface], 4.5),
    brandInkSoft: ensureContrast(mix(readableInk(seed.brand), seed.brand, 0.22), seed.brand, 4.5),
    heroA: brandDeep,
    heroB: darkenForWhite(mix(brandDeep, seed.brand, 0.3), 5),
  };
}

/** The colours a host has overridden, "" = the template's own. */
export type ThemeOverrides = {
  theme_bg?: string;
  theme_ink?: string;
  theme_brand?: string;
  theme_accent?: string;
};

export function seedWithOverrides(seed: PaletteSeed, o: ThemeOverrides): PaletteSeed {
  return {
    bg: o.theme_bg && isHex(o.theme_bg) ? o.theme_bg : seed.bg,
    ink: o.theme_ink && isHex(o.theme_ink) ? o.theme_ink : seed.ink,
    brand: o.theme_brand && isHex(o.theme_brand) ? o.theme_brand : seed.brand,
    accent: o.theme_accent && isHex(o.theme_accent) ? o.theme_accent : seed.accent,
  };
}

// ── Colour presets hosts can pick from ────────────────────────────────────

export type ColorPreset = { id: string; name: string } & PaletteSeed;

export const COLOR_PRESETS: ColorPreset[] = [
  { id: "ivory-blue", name: "Ivory & Slate Blue", bg: "#F7F4EE", ink: "#23262B", brand: "#3F5B73", accent: "#2E4A62" },
  { id: "cream-espresso", name: "Cream & Espresso", bg: "#F3F0E8", ink: "#2A211C", brand: "#3B2A22", accent: "#6B4430" },
  { id: "ivory-sage", name: "Ivory & Sage", bg: "#F7F5EF", ink: "#263129", brand: "#6F8F72", accent: "#3F5E46" },
  { id: "white-teal", name: "White & Soft Teal", bg: "#FFFFFF", ink: "#1E2A27", brand: "#7FA89D", accent: "#2F5D55" },
  { id: "medical-blue", name: "White & Medical Blue", bg: "#F7FAFC", ink: "#14283C", brand: "#2C6FA3", accent: "#1F5F95" },
  { id: "forest-cream", name: "Cream & Forest", bg: "#F4F1E8", ink: "#1D2B23", brand: "#274837", accent: "#1F3B2D" },
  { id: "charcoal-warm", name: "Warm White & Charcoal", bg: "#F6F3EE", ink: "#24272A", brand: "#6E6A5E", accent: "#3A3F3C" },
  { id: "black-white", name: "Black & White", bg: "#FFFFFF", ink: "#111315", brand: "#111315", accent: "#111315" },
  { id: "stone-olive", name: "Stone & Olive", bg: "#EFEBE3", ink: "#272A25", brand: "#5E6648", accent: "#3F4632" },
  { id: "warm-clay", name: "Warm Clay", bg: "#F8F3EC", ink: "#2B2522", brand: "#B07A5B", accent: "#8E4F36" },
  { id: "navy-cream", name: "Cream & Navy", bg: "#FBF8F2", ink: "#1F2A44", brand: "#3E5C86", accent: "#263F66" },
  { id: "mustard-black", name: "Cream, Mustard & Black", bg: "#FAF6EF", ink: "#1C1C1C", brand: "#D9A93B", accent: "#1C1C1C" },
  { id: "dusty-lavender", name: "Dusty Lavender", bg: "#EDE8F0", ink: "#241F2B", brand: "#8E7BA3", accent: "#4B3A5C" },
  { id: "graphite", name: "Graphite", bg: "#14171A", ink: "#F1EFEA", brand: "#8FA3B5", accent: "#E8E2D6" },
];

// ── Sample content (gallery thumbnails) ───────────────────────────────────

export type Sample = {
  brand: string;
  tagline: string;
  title: string;
  subtitle: string;
  host: string;
  hostTitle: string;
  bio: string;
  outcomes: [string, string, string];
};

export const CATEGORY_SAMPLES: Record<TemplateCategory, Sample> = {
  Business: {
    brand: "Harlow & Co.",
    tagline: "Strategy for growing teams",
    title: "Build a client pipeline that doesn't rely on referrals",
    subtitle: "A practical session on turning your expertise into a steady flow of qualified enquiries.",
    host: "Amelia Harlow",
    hostTitle: "Founder, Harlow & Co.",
    bio: "Amelia has spent twelve years helping service businesses grow without adding headcount.",
    outcomes: ["Map the three sources of repeatable leads", "Write an offer your best clients ask for", "Set up a weekly rhythm you can sustain"],
  },
  Coaching: {
    brand: "Rowan Coaching",
    tagline: "Clarity for the next chapter",
    title: "Find your next step when everything feels uncertain",
    subtitle: "A live workshop for people ready to stop circling and start deciding.",
    host: "Rowan Ellis",
    hostTitle: "Certified career coach",
    bio: "Rowan has coached more than 400 people through career and life transitions.",
    outcomes: ["Name what you actually want", "Spot the pattern that keeps you stuck", "Leave with one decision and a date"],
  },
  "Health & wellness": {
    brand: "Fern & Root",
    tagline: "Everyday wellbeing",
    title: "Sleep deeper and wake rested, without a complicated routine",
    subtitle: "A calm, guided session on the small changes that make the biggest difference.",
    host: "Maya Linden",
    hostTitle: "Nutritionist and breathwork guide",
    bio: "Maya blends nutrition science with gentle daily practices.",
    outcomes: ["Wind down in ten minutes or less", "Eat for steadier energy", "Build an evening you look forward to"],
  },
  Healthcare: {
    brand: "Northside Clinic",
    tagline: "Family and preventive care",
    title: "Understanding your heart health after 40",
    subtitle: "Our cardiologist explains what to watch, what to ask, and when to get checked.",
    host: "Dr. Priya Raman",
    hostTitle: "Consultant cardiologist",
    bio: "Dr. Raman leads preventive cardiology at Northside Clinic.",
    outcomes: ["Know the early warning signs", "Understand your key numbers", "Prepare for your next check-up"],
  },
  Finance: {
    brand: "Calder Wealth",
    tagline: "Independent financial planning",
    title: "Plan your retirement income with confidence",
    subtitle: "A clear walk-through of how to turn savings into reliable, tax-aware income.",
    host: "James Calder",
    hostTitle: "Chartered financial planner",
    bio: "James has advised families on retirement planning for over fifteen years.",
    outcomes: ["Estimate how much you will really need", "Order your accounts for tax efficiency", "Avoid the three most common mistakes"],
  },
  "Tech & SaaS": {
    brand: "Northwind",
    tagline: "Workflow software for lean teams",
    title: "See how teams ship twice as fast with one shared workflow",
    subtitle: "A live product walkthrough with time for your questions.",
    host: "Dana Okafor",
    hostTitle: "Head of Product",
    bio: "Dana leads product at Northwind and has run over 200 customer onboardings.",
    outcomes: ["Set up your first automated workflow", "Connect the tools you already use", "Measure what changes in week one"],
  },
  Education: {
    brand: "Larch Academy",
    tagline: "Learning that sticks",
    title: "How to help your child read with confidence",
    subtitle: "A free class for parents with simple routines that work at home.",
    host: "Helen Marsh",
    hostTitle: "Primary literacy specialist",
    bio: "Helen has taught early reading for eighteen years.",
    outcomes: ["Choose books at the right level", "Make ten minutes a day count", "Know when to ask for extra help"],
  },
  Creative: {
    brand: "Atelier Noor",
    tagline: "Design and visual storytelling",
    title: "Build a portfolio that gets you hired for the work you love",
    subtitle: "A live studio session on editing, sequencing and presenting your best work.",
    host: "Noor Hassan",
    hostTitle: "Art director and educator",
    bio: "Noor has led creative teams at studios in London and Dubai.",
    outcomes: ["Choose the projects that tell your story", "Write case studies people read", "Present your work with confidence"],
  },
  "Real estate": {
    brand: "Hartwell Homes",
    tagline: "Residential property advisers",
    title: "Buying your first home: what to know before you view",
    subtitle: "A relaxed session on budgets, mortgages and spotting a good property.",
    host: "Oliver Hartwell",
    hostTitle: "Property adviser",
    bio: "Oliver has helped more than 300 first-time buyers get the keys.",
    outcomes: ["Work out what you can really afford", "Read a listing like a professional", "Make an offer that is taken seriously"],
  },
  Fitness: {
    brand: "Ironwood Training",
    tagline: "Strength for real life",
    title: "Build strength in 30 minutes, three days a week",
    subtitle: "A live training session with the exact plan, no gym required.",
    host: "Marcus Bell",
    hostTitle: "Strength and conditioning coach",
    bio: "Marcus has coached everyone from beginners to national athletes.",
    outcomes: ["Follow a simple three-day structure", "Train safely with minimal equipment", "Track progress that keeps you going"],
  },
  Marketing: {
    brand: "Brightside Studio",
    tagline: "Marketing that earns attention",
    title: "Turn your next campaign into your best-performing one",
    subtitle: "A live masterclass on the messaging, channels and numbers that matter.",
    host: "Tessa Quinn",
    hostTitle: "Marketing strategist",
    bio: "Tessa has run campaigns for brands from startups to household names.",
    outcomes: ["Write messaging that stops the scroll", "Pick the two channels worth your budget", "Read results and decide what to do next"],
  },
};

/** What the image search looks for, per category (photographs, not illustrations). */
export const CATEGORY_PHOTO_TERMS: Record<TemplateCategory, string> = {
  Business: "business meeting office",
  Coaching: "conversation coaching",
  "Health & wellness": "yoga meditation nature",
  Healthcare: "doctor clinic healthcare",
  Finance: "financial planning office",
  "Tech & SaaS": "laptop workspace technology",
  Education: "classroom learning books",
  Creative: "design studio creative",
  "Real estate": "modern house interior",
  Fitness: "gym workout training",
  Marketing: "marketing team creative",
};

// ── The templates ─────────────────────────────────────────────────────────

/** The eleven compositions, in the order templates are dealt out to categories. */
const LAYOUT_ORDER: LayoutId[] = ["editorial", "photo", "minimal", "host", "asymmetric", "split", "poster", "letter", "bento", "agenda", "card"];

/** Each category keeps five slots (ids stay stable for saved webinars). */
type Slot = "editorial" | "photo" | "minimal" | "host" | "asymmetric";
const SLOT_ORDER: Slot[] = ["editorial", "photo", "minimal", "host", "asymmetric"];

const BASE_LOOK: Record<LayoutId, TemplateLook> = {
  editorial: { radius: 2, field: "line", outcomes: "numbered", backdrop: "paper" },
  photo: { radius: 8, field: "box", outcomes: "numbered", backdrop: "studio" },
  minimal: { radius: 2, field: "line", outcomes: "dash", backdrop: "paper" },
  host: { radius: 6, field: "box", outcomes: "numbered", backdrop: "studio" },
  asymmetric: { radius: 2, field: "box", outcomes: "numbered", backdrop: "dusk" },
  split: { radius: 4, field: "line", outcomes: "tick", backdrop: "studio" },
  poster: { radius: 0, field: "line", outcomes: "numbered", backdrop: "paper" },
  letter: { radius: 6, field: "line", outcomes: "dash", backdrop: "paper" },
  bento: { radius: 20, field: "box", outcomes: "tick", backdrop: "dusk" },
  agenda: { radius: 8, field: "line", outcomes: "numbered", backdrop: "paper" },
  card: { radius: 18, field: "box", outcomes: "tick", backdrop: "studio" },
  training: { radius: 16, field: "box", outcomes: "tick", backdrop: "dusk" },
};

/**
 * Corner shapes each composition suits: a template takes the first or the
 * second by position, so neighbours differ. Sharp for editorial and poster,
 * soft for bento and card, and everything between.
 */
const RADIUS_CHOICES: Record<LayoutId, [number, number]> = {
  editorial: [0, 4],
  photo: [10, 16],
  minimal: [0, 12],
  host: [14, 22],
  asymmetric: [0, 10],
  split: [0, 8],
  poster: [0, 0],
  letter: [4, 12],
  bento: [18, 26],
  agenda: [6, 14],
  card: [16, 28],
  training: [16, 16],
};

/** A plain colour word for a template's brand colour, used in its name. */
function colourWord(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "Classic";
  const [r, g, b] = rgb.map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  const light = luminance(hex);
  const sat = mx === 0 ? 0 : d / mx;
  if (sat < 0.14) return light < 0.06 ? "Ink" : light < 0.2 ? "Graphite" : light < 0.5 ? "Slate" : "Stone";
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (Math.round(h * 60) + 360) % 360;
  if (h < 12 || h >= 345) return light > 0.3 ? "Rose" : "Brick";
  if (h < 36) return light > 0.3 ? "Clay" : "Terracotta";
  if (h < 56) return "Ochre";
  if (h < 95) return "Olive";
  if (h < 150) return light > 0.2 ? "Sage" : "Forest";
  if (h < 190) return light > 0.2 ? "Seafoam" : "Teal";
  if (h < 208) return "Sky";
  if (h < 232) return light < 0.1 ? "Navy" : "Blue";
  if (h < 262) return "Indigo";
  if (h < 300) return light > 0.3 ? "Lilac" : "Plum";
  return "Raspberry";
}

type Spec = {
  name: string;
  description: string;
  seed: [string, string, string, string]; // background, text, brand, button
  fonts: FontPairId;
  look?: Partial<TemplateLook>;
};

type CategoryDef = {
  category: TemplateCategory;
  slug: string;
  kicker: string;
  tags: string[];
  templates: Record<Slot, Spec>;
};

const CATEGORY_DEFS: CategoryDef[] = [
  {
    category: "Business",
    slug: "business",
    kicker: "Live strategy session",
    tags: ["consulting", "agency", "b2b", "services", "professional", "founder"],
    templates: {
      editorial: { name: "The Briefing", description: "Ivory paper, charcoal type and a muted blue. A calm editorial page for consultants and agencies.", seed: ["#F7F4EE", "#23262B", "#3F5B73", "#2E4A62"], fonts: "bodoni-public" },
      photo: { name: "Workspace", description: "A full-width workspace photograph in deep navy with the registration form resting on top.", seed: ["#F3F2EE", "#1B2230", "#1E2B4A", "#B8552F"], fonts: "playfair-inter" },
      minimal: { name: "Monochrome", description: "Black on white, one strong headline and a single-row form.", seed: ["#FFFFFF", "#111315", "#3B6B8F", "#111315"], fonts: "manrope-inter" },
      host: { name: "The Founder", description: "Your portrait leads, on warm ivory with deep burgundy.", seed: ["#F5F1EC", "#241C1F", "#5B2536", "#7E2D45"], fonts: "fraunces-inter" },
      asymmetric: { name: "Sage Studio", description: "An offset image, an overlapping form card and calm, staggered outcomes.", seed: ["#EEF0EA", "#25282A", "#7C8F7A", "#2F3B33"], fonts: "instrument-inter" },
    },
  },
  {
    category: "Coaching",
    slug: "coaching",
    kicker: "Free live workshop",
    tags: ["coach", "mindset", "career", "life coach", "personal growth", "mentor"],
    templates: {
      editorial: { name: "Clay Journal", description: "Warm paper and terracotta, set like a personal letter.", seed: ["#FAF4EE", "#2B2220", "#C46A3F", "#A24E2A"], fonts: "fraunces-inter" },
      photo: { name: "Golden Hour", description: "A warm, full-width photograph in deep teal with an amber button.", seed: ["#F4F2EC", "#1D2A2C", "#1F3F43", "#D08A3E"], fonts: "instrument-inter" },
      minimal: { name: "Quiet Note", description: "Near-white, sage details and a gentle single column.", seed: ["#FBFAF8", "#1A1A1A", "#6E7F73", "#1A1A1A"], fonts: "dmserif-dmsans" },
      host: { name: "Your Coach", description: "A large, friendly portrait on blush with coral warmth.", seed: ["#FBEFE9", "#34221F", "#E3A08C", "#8F3F34"], fonts: "dmserif-dmsans" },
      asymmetric: { name: "Open Door", description: "Periwinkle and ivory, with an offset image and overlapping card.", seed: ["#F0F0F3", "#222634", "#7F8FB8", "#2F3E66"], fonts: "playfair-inter" },
    },
  },
  {
    category: "Health & wellness",
    slug: "wellness",
    kicker: "Live guided session",
    tags: ["wellbeing", "yoga", "nutrition", "mindfulness", "therapy", "calm", "natural"],
    templates: {
      editorial: { name: "Sage Paper", description: "Ivory and sage with a soft serif. Calm without being sleepy.", seed: ["#F7F5EF", "#263129", "#6F8F72", "#3F5E46"], fonts: "lora-raleway", look: { radius: 6 } },
      photo: { name: "Still Water", description: "A full-width nature photograph in deep teal-green with a soft white card.", seed: ["#F4F6F2", "#22302B", "#2E4A42", "#3F7F77"], fonts: "cormorant-inter", look: { radius: 10 } },
      minimal: { name: "Plain Breath", description: "White space, soft teal and a light, airy headline.", seed: ["#FFFFFF", "#1E2A27", "#7FA89D", "#2F5D55"], fonts: "manrope-inter" },
      host: { name: "Gentle Host", description: "A warm portrait on cream with moss green.", seed: ["#F4F2E8", "#2A2D1E", "#6B7B3F", "#4A5A22"], fonts: "fraunces-inter", look: { radius: 10 } },
      asymmetric: { name: "Lilac Edge", description: "Soft lilac, an offset image and a floating form.", seed: ["#F1EFF5", "#2B2838", "#A79BC4", "#4B3F72"], fonts: "instrument-inter" },
    },
  },
  {
    category: "Healthcare",
    slug: "healthcare",
    kicker: "Free health webinar",
    tags: ["hospital", "clinic", "doctor", "medical", "patient", "dental", "pharmacy", "care"],
    templates: {
      editorial: { name: "Clinical Clear", description: "White and medical blue, set in a friendly serif. Trustworthy and easy to read.", seed: ["#F7FAFC", "#14283C", "#2C6FA3", "#1F5F95"], fonts: "dmserif-dmsans", look: { radius: 6 } },
      photo: { name: "Care Team", description: "A full-width care photograph in deep green with a clean white form.", seed: ["#F2F7F5", "#12302B", "#17504A", "#2A8A7A"], fonts: "jakarta-inter", look: { radius: 8 } },
      minimal: { name: "Plain Health", description: "Pure white, teal details and clear, calm typography.", seed: ["#FFFFFF", "#0F2233", "#2A8C8C", "#17707A"], fonts: "manrope-inter" },
      host: { name: "Meet Your Doctor", description: "A reassuring portrait on soft blue-gray.", seed: ["#EEF3F6", "#14293D", "#1F4E79", "#2E7D6B"], fonts: "lora-raleway", look: { radius: 8 } },
      asymmetric: { name: "Wellbeing Grid", description: "Muted healthcare green with an offset image and floating form.", seed: ["#F1F6F2", "#18301F", "#6FA58B", "#2F6F52"], fonts: "fraunces-inter", look: { radius: 6 } },
    },
  },
  {
    category: "Finance",
    slug: "finance",
    kicker: "Live briefing",
    tags: ["wealth", "investing", "advisor", "accounting", "tax", "retirement", "banking", "insurance"],
    templates: {
      editorial: { name: "The Ledger", description: "Warm white, slate type and a muted blue. Credible and unshowy.", seed: ["#F8F7F3", "#1F2933", "#4A6A8A", "#2F4B66"], fonts: "playfair-inter" },
      photo: { name: "Skyline", description: "A full-width city photograph under deep forest green, with a warm white form.", seed: ["#F2F3F0", "#16231C", "#1E3A2D", "#3D6B55"], fonts: "bodoni-public" },
      minimal: { name: "Mono Capital", description: "Strict monochrome with a single row form.", seed: ["#FFFFFF", "#0F1214", "#5B6B7A", "#0F1214"], fonts: "manrope-inter" },
      host: { name: "The Advisor", description: "A confident portrait on cream with deep charcoal.", seed: ["#F4F1EA", "#1B1D21", "#2B2F36", "#1B1D21"], fonts: "cormorant-inter" },
      asymmetric: { name: "Navy Offset", description: "Deep navy, an offset image and an overlapping card.", seed: ["#EEF0F4", "#1C2233", "#2B3F6B", "#1C2A4A"], fonts: "instrument-inter" },
    },
  },
  {
    category: "Tech & SaaS",
    slug: "tech",
    kicker: "Live product demo",
    tags: ["software", "saas", "startup", "product", "ai", "demo", "app", "developer"],
    templates: {
      editorial: { name: "Product Journal", description: "Off-white and restrained blue with a modern serif.", seed: ["#F7F7F5", "#1B1F24", "#3D5A80", "#2B4C7E"], fonts: "instrument-inter" },
      photo: { name: "Workbench", description: "A full-width workspace photograph in deep slate with a crisp form.", seed: ["#F4F5F6", "#14181D", "#232B35", "#3A6EA5"], fonts: "jakarta-inter" },
      minimal: { name: "Graphite", description: "Monochrome with one controlled blue detail.", seed: ["#FFFFFF", "#0E1116", "#3A6EA5", "#0E1116"], fonts: "manrope-inter" },
      host: { name: "Founder Demo", description: "Your face front and centre, on soft mint and deep teal.", seed: ["#F0F5F3", "#14231F", "#1F5E55", "#2FA58E"], fonts: "dmserif-dmsans" },
      asymmetric: { name: "Signal", description: "Muted indigo, an offset image and a floating form card.", seed: ["#EFEFF4", "#1C1F2E", "#55608A", "#2C3566"], fonts: "bricolage-inter" },
    },
  },
  {
    category: "Education",
    slug: "education",
    kicker: "Free online class",
    tags: ["course", "teacher", "school", "tutor", "training", "learning", "university", "workshop"],
    templates: {
      editorial: { name: "Lecture Notes", description: "Warm white and navy with a friendly serif.", seed: ["#FBF8F2", "#1F2A44", "#3E5C86", "#263F66"], fonts: "fraunces-inter" },
      photo: { name: "Classroom Light", description: "A bright full-width classroom photograph in deep green with an amber button.", seed: ["#F4F5EF", "#17261F", "#1F4A3A", "#B5702F"], fonts: "lora-raleway" },
      minimal: { name: "Plain Syllabus", description: "White, forest green and clear, readable type.", seed: ["#FFFFFF", "#1B1F27", "#2F5D50", "#1B1F27"], fonts: "manrope-inter" },
      host: { name: "Your Instructor", description: "A warm portrait on light neutral with charcoal.", seed: ["#EFEFEF", "#25272B", "#3C4046", "#B5472F"], fonts: "dmserif-dmsans", look: { radius: 8 } },
      asymmetric: { name: "Open Course", description: "Muted blue, an offset image and a floating enrol card.", seed: ["#EEF1F4", "#1D2B3C", "#7C97B5", "#2C4A72"], fonts: "playfair-inter" },
    },
  },
  {
    category: "Creative",
    slug: "creative",
    kicker: "Live studio session",
    tags: ["design", "art", "photography", "writing", "music", "portfolio", "studio", "maker"],
    templates: {
      editorial: { name: "Studio Journal", description: "Cream paper, brick accents and a high-contrast serif.", seed: ["#F6F1EA", "#2A2220", "#A2483A", "#7A2E25"], fonts: "bodoni-public" },
      photo: { name: "On Location", description: "A full-width photograph over aubergine with a warm card.", seed: ["#F2EDF3", "#221A2A", "#3B2347", "#D0653F"], fonts: "instrument-inter" },
      minimal: { name: "Black Frame", description: "Stark black and white with a single terracotta detail.", seed: ["#FFFFFF", "#151515", "#B2603A", "#151515"], fonts: "bricolage-inter" },
      host: { name: "The Maker", description: "A bold portrait on soft aqua with deep teal.", seed: ["#E6F1F1", "#14272A", "#2F7F86", "#1D4F55"], fonts: "fraunces-inter" },
      asymmetric: { name: "Collage", description: "Dusty lavender, an offset image and a floating card.", seed: ["#EDE8F0", "#241F2B", "#8E7BA3", "#4B3A5C"], fonts: "dmserif-dmsans" },
    },
  },
  {
    category: "Real estate",
    slug: "real-estate",
    kicker: "Live property webinar",
    tags: ["property", "realtor", "agent", "mortgage", "buyer", "landlord", "interior", "homes"],
    templates: {
      editorial: { name: "Stone Journal", description: "Warm white and stone, set in an elegant light serif.", seed: ["#F6F3EE", "#24272A", "#6E6A5E", "#3A3F3C"], fonts: "cormorant-inter" },
      photo: { name: "Open House", description: "A full-width home photograph under deep olive with a warm form.", seed: ["#F3F1EC", "#20231F", "#2D332C", "#6D6E47"], fonts: "playfair-inter" },
      minimal: { name: "Plain Plans", description: "Refined monochrome with a slate detail.", seed: ["#FFFFFF", "#151718", "#4A5560", "#151718"], fonts: "manrope-inter" },
      host: { name: "Your Agent", description: "A trustworthy portrait on stone with slate navy.", seed: ["#F0ECE4", "#1F2A36", "#31465C", "#1F2F40"], fonts: "bodoni-public" },
      asymmetric: { name: "Floor Plan", description: "Stone and sage, with an offset image and overlapping card.", seed: ["#F0F1EC", "#232A22", "#8E9B86", "#3E4A38"], fonts: "instrument-inter" },
    },
  },
  {
    category: "Fitness",
    slug: "fitness",
    kicker: "Live training session",
    tags: ["gym", "training", "strength", "yoga", "running", "nutrition", "coach", "performance"],
    templates: {
      editorial: { name: "Training Log", description: "Stone paper and graphite with a confident orange accent.", seed: ["#F4F2EE", "#1B1D1F", "#1F2A2E", "#C8501F"], fonts: "bricolage-inter" },
      photo: { name: "Gym Floor", description: "A full-width training photograph in near-black with a teal button.", seed: ["#EEF0F0", "#15191A", "#12171A", "#2FA3A0"], fonts: "jakarta-inter", look: { caps: true } },
      minimal: { name: "Plain Iron", description: "White and black with one red detail.", seed: ["#FFFFFF", "#101214", "#C23B3B", "#101214"], fonts: "manrope-inter" },
      host: { name: "Coach Spotlight", description: "A strong portrait on cool gray with deep green.", seed: ["#E9ECEA", "#161A1B", "#2F4B3F", "#C9542A"], fonts: "bricolage-inter" },
      asymmetric: { name: "Rep Count", description: "A cobalt block, an offset image and a graphite card.", seed: ["#EEF0F4", "#15192B", "#2F5BD0", "#15192B"], fonts: "jakarta-inter", look: { caps: true } },
    },
  },
  {
    category: "Marketing",
    slug: "marketing",
    kicker: "Live masterclass",
    tags: ["growth", "sales", "social media", "ads", "brand", "agency", "funnel", "ecommerce"],
    templates: {
      editorial: { name: "Campaign Notes", description: "Blush paper, black type and a raspberry rule.", seed: ["#FBF4F4", "#1E1A1C", "#C2305F", "#1E1A1C"], fonts: "bricolage-inter" },
      photo: { name: "Outdoor", description: "A full-width photograph under deep ink with an orange button.", seed: ["#EEF0F3", "#10151C", "#17202A", "#E4572E"], fonts: "jakarta-inter" },
      minimal: { name: "Plain Brief", description: "Black and white with an emerald detail.", seed: ["#FFFFFF", "#111111", "#1F9D6B", "#111111"], fonts: "bricolage-inter" },
      host: { name: "Face of the Brand", description: "A bold portrait on a sky-blue block.", seed: ["#E9F0FA", "#14202E", "#3F8FD2", "#17508A"], fonts: "dmserif-dmsans" },
      asymmetric: { name: "Poster", description: "A coral block, an offset image and a black form card.", seed: ["#F3EDE6", "#20201F", "#D96A4C", "#20201F"], fonts: "instrument-inter" },
    },
  },
];

function buildTemplates(): WebinarTemplate[] {
  const out: WebinarTemplate[] = [];
  CATEGORY_DEFS.forEach((def, categoryIndex) => {
    SLOT_ORDER.forEach((slot, slotIndex) => {
      const spec = def.templates[slot];
      // Dealt so that no category repeats a composition and each composition
      // appears in five different categories.
      const layout = LAYOUT_ORDER[(categoryIndex + 2 * slotIndex) % LAYOUT_ORDER.length];
      const [bg, ink, brand, accent] = spec.seed;
      const colour = colourWord(brand);
      const label = LAYOUT_LABELS[layout];
      const tags = [...def.tags, layout, label.name.toLowerCase(), colour.toLowerCase(), isDark(bg) ? "dark" : "light"];
      if (layout === "photo" || layout === "split" || layout === "card") tags.push("photography", "photo");
      if (layout === "host") tags.push("portrait", "personal brand");
      if (layout === "minimal" || layout === "letter") tags.push("simple", "clean");
      const radius = RADIUS_CHOICES[layout][(categoryIndex + slotIndex) % 2];
      const { radius: _ignored, ...specLook } = spec.look ?? {};
      void _ignored;
      out.push({
        id: `${def.slug}-${slot}`,
        name: `${colour} ${label.short}`,
        description: `${label.blurb}. ${colour} on ${isDark(bg) ? "dark" : "light"} paper.`,
        category: def.category,
        tags,
        layout,
        seed: { bg, ink, brand, accent },
        fonts: spec.fonts,
        look: {
          ...BASE_LOOK[layout],
          ...specLook,
          radius,
          pill: radius >= 16 && (categoryIndex + slotIndex) % 3 !== 0,
          // Alternate which side asymmetric and programme layouts sit on.
          flip: specLook.flip ?? ((layout === "asymmetric" || layout === "agenda") && categoryIndex % 2 === 1),
        },
        kicker: def.kicker,
      });
    });
  });
  return out;
}

/** Hand-made templates, shown first and under "Most liked" in the picker. */
const FEATURED_TEMPLATES: WebinarTemplate[] = [
  {
    id: "training-midnight",
    name: "Midnight Training",
    description: "A dark sales-training hero with a gold button, a long-form page and a full thank-you page after sign-up.",
    category: "Marketing",
    tags: ["sales", "training", "funnel", "on-demand", "course", "coaching", "agency", "most liked", "popular", "dark", "navy", "gold", "indigo"],
    layout: "training",
    seed: { bg: "#FFFFFF", ink: "#1A1530", brand: "#4F46E5", accent: "#FACC15" },
    fonts: "playfair-bold",
    look: BASE_LOOK.training,
    kicker: "Free live training",
    featured: true,
  },
];

export const WEBINAR_TEMPLATES: WebinarTemplate[] = [...FEATURED_TEMPLATES, ...buildTemplates()];

export const DEFAULT_TEMPLATE_ID = "business-editorial";

/**
 * Ids stored on webinars before the redesign. Each maps to its closest new
 * template, so a published page keeps working and simply looks better.
 */
const LEGACY_TEMPLATE_IDS: Record<string, string> = {
  "sage-classic": "business-editorial",
  "midnight-launch": "tech-minimal",
  "editorial-ink": "coaching-editorial",
  "sunrise-coach": "coaching-host",
  "ocean-calm": "wellness-photo",
  "bold-block": "marketing-asymmetric",
  "capital-navy": "finance-editorial",
  "forest-retreat": "wellness-editorial",
  "lavender-studio": "creative-asymmetric",
  "clean-minimal": "tech-editorial",
  "estate-luxe": "real-estate-photo",
  "classroom-bright": "education-host",
  "power-lift": "fitness-photo",
  "terracotta-talk": "business-host",
  "neon-growth": "marketing-photo",
};

const BY_ID = new Map(WEBINAR_TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string | undefined): WebinarTemplate {
  const resolved = id ? (LEGACY_TEMPLATE_IDS[id] ?? id) : DEFAULT_TEMPLATE_ID;
  return BY_ID.get(resolved) ?? BY_ID.get(DEFAULT_TEMPLATE_ID)!;
}

/** The templates of one category, in layout order. */
export function templatesInCategory(category: TemplateCategory): WebinarTemplate[] {
  return WEBINAR_TEMPLATES.filter((t) => t.category === category);
}

/** Matches name, category, description and tags; every word must hit. */
export function searchTemplates(text: string, category: TemplateCategory | "All" = "All"): WebinarTemplate[] {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  return WEBINAR_TEMPLATES.filter((t) => {
    if (category !== "All" && t.category !== category) return false;
    const haystack = [t.name, t.category, t.description, ...t.tags].join(" ").toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}

/** Palette for a template with the host's colour overrides applied. */
export function resolvePalette(template: WebinarTemplate, overrides: ThemeOverrides): Palette {
  return derivePalette(seedWithOverrides(template.seed, overrides));
}

/** Font pairing id: the host's choice, else the template's. */
export function resolveFontPairId(template: WebinarTemplate, fontPair: string | undefined): FontPairId {
  return fontPair && isFontPairId(fontPair) ? fontPair : template.fonts;
}
