/**
 * Registration page templates.
 *
 * A template is a COMPOSITION (one of five layouts) in a category's own
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
import { contrast, darkenForWhite, ensureContrast, isDark, isHex, mix, readableInk, rgba } from "@/lib/color";

/**
 * Curated heading + body pairings. The actual font files are loaded in
 * lib/webinar-fonts.ts; this is only the catalogue, so this module stays
 * free of Next.js and can run in tests.
 */
export const FONT_PAIR_CATALOG = {
  "bodoni-public": { label: "Magazine", note: "High-contrast serif with a clean sans" },
  "playfair-inter": { label: "Classic Editorial", note: "Elegant serif, neutral sans" },
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

export type LayoutId = "editorial" | "photo" | "minimal" | "host" | "asymmetric";

export const LAYOUT_LABELS: Record<LayoutId, { name: string; blurb: string }> = {
  editorial: { name: "Editorial", blurb: "Big typography, magazine rhythm" },
  photo: { name: "Photography-led", blurb: "A full-width photo with the form on top" },
  minimal: { name: "Minimal", blurb: "One calm column, strong headline" },
  host: { name: "Host spotlight", blurb: "Your portrait leads" },
  asymmetric: { name: "Asymmetric", blurb: "Offset image, overlapping form" },
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

const LAYOUT_ORDER: LayoutId[] = ["editorial", "photo", "minimal", "host", "asymmetric"];

const BASE_LOOK: Record<LayoutId, TemplateLook> = {
  editorial: { radius: 2, field: "line", outcomes: "numbered", backdrop: "paper" },
  photo: { radius: 8, field: "box", outcomes: "numbered", backdrop: "studio" },
  minimal: { radius: 2, field: "line", outcomes: "dash", backdrop: "paper" },
  host: { radius: 6, field: "box", outcomes: "numbered", backdrop: "studio" },
  asymmetric: { radius: 2, field: "box", outcomes: "numbered", backdrop: "dusk" },
};

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
  templates: Record<LayoutId, Spec>;
};

const CATEGORY_DEFS: CategoryDef[] = [
  {
    category: "Business",
    slug: "business",
    kicker: "Live strategy session",
    tags: ["consulting", "agency", "b2b", "services", "professional", "founder"],
    templates: {
      editorial: { name: "The Briefing", description: "Ivory paper, charcoal type and a muted blue. A calm editorial page for consultants and agencies.", seed: ["#F7F4EE", "#23262B", "#3F5B73", "#2E4A62"], fonts: "bodoni-public" },
      photo: { name: "Workspace", description: "A full-width workspace photograph with the registration form resting on top.", seed: ["#F4F2ED", "#1F2328", "#2F3E46", "#A9532F"], fonts: "playfair-inter" },
      minimal: { name: "Monochrome", description: "Black on white, one strong headline and a single-row form.", seed: ["#FFFFFF", "#111315", "#3B6B8F", "#111315"], fonts: "manrope-inter" },
      host: { name: "The Founder", description: "Your portrait leads, on warm cream with deep espresso.", seed: ["#F3F0E8", "#2A211C", "#3B2A22", "#6B4430"], fonts: "fraunces-inter" },
      asymmetric: { name: "Sage Studio", description: "An offset image, an overlapping form card and calm, staggered outcomes.", seed: ["#EEF0EA", "#25282A", "#7C8F7A", "#2F3B33"], fonts: "instrument-inter" },
    },
  },
  {
    category: "Coaching",
    slug: "coaching",
    kicker: "Free live workshop",
    tags: ["coach", "mindset", "career", "life coach", "personal growth", "mentor"],
    templates: {
      editorial: { name: "Clay Journal", description: "Warm paper and soft clay, set like a personal letter.", seed: ["#F8F3EC", "#2B2522", "#B07A5B", "#8E4F36"], fonts: "fraunces-inter" },
      photo: { name: "Golden Hour", description: "A warm, full-width photograph with a calm registration card.", seed: ["#F6F1EA", "#28211D", "#3C2F2A", "#B8714F"], fonts: "instrument-inter" },
      minimal: { name: "Quiet Note", description: "Near-white, sage details and a gentle single column.", seed: ["#FBFAF8", "#1A1A1A", "#6E7F73", "#1A1A1A"], fonts: "dmserif-dmsans" },
      host: { name: "Your Coach", description: "A large, friendly portrait on sand with espresso type.", seed: ["#F2EBE3", "#2D2420", "#D8C3AE", "#5A4438"], fonts: "dmserif-dmsans" },
      asymmetric: { name: "Open Door", description: "Olive and ivory, with an offset image and overlapping card.", seed: ["#EFE9E1", "#262626", "#A3B18A", "#3A4A3D"], fonts: "playfair-inter" },
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
      host: { name: "Gentle Host", description: "A warm portrait on cream with earthy sand tones.", seed: ["#F5F0E8", "#2E2A25", "#C9B79C", "#7A5C3E"], fonts: "fraunces-inter", look: { radius: 10 } },
      asymmetric: { name: "Botanical Edge", description: "Muted greens and an offset image with a floating form.", seed: ["#EDF1EA", "#2A332D", "#9DB59B", "#43603F"], fonts: "instrument-inter" },
    },
  },
  {
    category: "Healthcare",
    slug: "healthcare",
    kicker: "Free health webinar",
    tags: ["hospital", "clinic", "doctor", "medical", "patient", "dental", "pharmacy", "care"],
    templates: {
      editorial: { name: "Clinical Clear", description: "White and medical blue, set in a friendly serif. Trustworthy and easy to read.", seed: ["#F7FAFC", "#14283C", "#2C6FA3", "#1F5F95"], fonts: "dmserif-dmsans", look: { radius: 6 } },
      photo: { name: "Care Team", description: "A full-width care photograph in deep blue with a clean white form.", seed: ["#F3F7FA", "#12263A", "#1B4B72", "#1F6FAF"], fonts: "jakarta-inter", look: { radius: 8 } },
      minimal: { name: "Plain Health", description: "Pure white, teal details and clear, calm typography.", seed: ["#FFFFFF", "#0F2233", "#2A8C8C", "#17707A"], fonts: "manrope-inter" },
      host: { name: "Meet Your Doctor", description: "A reassuring portrait on soft blue-gray.", seed: ["#EEF3F6", "#14293D", "#1F4E79", "#2E7D6B"], fonts: "lora-raleway", look: { radius: 8 } },
      asymmetric: { name: "Wellbeing Grid", description: "Muted healthcare green with an offset image and floating form.", seed: ["#F0F5F3", "#17302C", "#5B9B8A", "#2D6F63"], fonts: "fraunces-inter", look: { radius: 6 } },
    },
  },
  {
    category: "Finance",
    slug: "finance",
    kicker: "Live briefing",
    tags: ["wealth", "investing", "advisor", "accounting", "tax", "retirement", "banking", "insurance"],
    templates: {
      editorial: { name: "The Ledger", description: "Warm white, slate type and a muted blue. Credible and unshowy.", seed: ["#F8F7F3", "#1F2933", "#4A6A8A", "#2F4B66"], fonts: "playfair-inter" },
      photo: { name: "Skyline", description: "A full-width city photograph under charcoal, with a warm white form.", seed: ["#F2F2EE", "#1C1F22", "#1F2A33", "#3D5A73"], fonts: "bodoni-public" },
      minimal: { name: "Mono Capital", description: "Strict monochrome with a single row form.", seed: ["#FFFFFF", "#0F1214", "#5B6B7A", "#0F1214"], fonts: "manrope-inter" },
      host: { name: "The Advisor", description: "A confident portrait on cream with deep forest green.", seed: ["#F4F1E8", "#1D2B23", "#274837", "#1F3B2D"], fonts: "cormorant-inter" },
      asymmetric: { name: "Slate Offset", description: "Cool slate blues with an offset image and overlapping card.", seed: ["#ECEEF0", "#1E2730", "#6C8095", "#34495E"], fonts: "instrument-inter" },
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
      host: { name: "Founder Demo", description: "Your face front and centre, on cool gray and slate.", seed: ["#F2F4F5", "#1A2027", "#2D3A48", "#3A6EA5"], fonts: "dmserif-dmsans" },
      asymmetric: { name: "Signal", description: "Slate blue, an offset image and a floating form card.", seed: ["#ECEFF1", "#1B222A", "#5F7A94", "#26384C"], fonts: "bricolage-inter" },
    },
  },
  {
    category: "Education",
    slug: "education",
    kicker: "Free online class",
    tags: ["course", "teacher", "school", "tutor", "training", "learning", "university", "workshop"],
    templates: {
      editorial: { name: "Lecture Notes", description: "Warm white and navy with a friendly serif.", seed: ["#FBF8F2", "#1F2A44", "#3E5C86", "#263F66"], fonts: "fraunces-inter" },
      photo: { name: "Classroom Light", description: "A bright full-width classroom photograph in navy with an amber button.", seed: ["#F6F4EE", "#1E2B3A", "#213A57", "#B5702F"], fonts: "lora-raleway" },
      minimal: { name: "Plain Syllabus", description: "White, forest green and clear, readable type.", seed: ["#FFFFFF", "#1B1F27", "#2F5D50", "#1B1F27"], fonts: "manrope-inter" },
      host: { name: "Your Instructor", description: "A warm portrait on light neutral with forest green.", seed: ["#F1EFE8", "#2A2A2A", "#365A44", "#2E4F3B"], fonts: "dmserif-dmsans", look: { radius: 8 } },
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
      photo: { name: "On Location", description: "A full-width photograph over plum-charcoal with a warm card.", seed: ["#F3EEE8", "#231E1C", "#3A2E3B", "#B2603A"], fonts: "instrument-inter" },
      minimal: { name: "Black Frame", description: "Stark black and white with a single terracotta detail.", seed: ["#FFFFFF", "#151515", "#B2603A", "#151515"], fonts: "bricolage-inter" },
      host: { name: "The Maker", description: "A bold portrait on clay-pink with deep brown type.", seed: ["#EFE6DD", "#2B2320", "#C08A6A", "#5C3B34"], fonts: "fraunces-inter" },
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
      minimal: { name: "Plain Plans", description: "Refined monochrome with a sand detail.", seed: ["#FFFFFF", "#151718", "#8A7F6A", "#151718"], fonts: "manrope-inter" },
      host: { name: "Your Agent", description: "A trustworthy portrait on stone with olive.", seed: ["#EFEBE3", "#272A25", "#5E6648", "#3F4632"], fonts: "bodoni-public" },
      asymmetric: { name: "Floor Plan", description: "Cream and slate, with an offset image and overlapping card.", seed: ["#F1EEE8", "#232B33", "#8C9AA5", "#2F3D49"], fonts: "instrument-inter" },
    },
  },
  {
    category: "Fitness",
    slug: "fitness",
    kicker: "Live training session",
    tags: ["gym", "training", "strength", "yoga", "running", "nutrition", "coach", "performance"],
    templates: {
      editorial: { name: "Training Log", description: "Stone paper and graphite with a confident orange accent.", seed: ["#F4F2EE", "#1B1D1F", "#1F2A2E", "#C8501F"], fonts: "bricolage-inter" },
      photo: { name: "Gym Floor", description: "A full-width training photograph in near-black with a bold button.", seed: ["#EFEFEC", "#17191A", "#161A1C", "#D4572B"], fonts: "jakarta-inter", look: { caps: true } },
      minimal: { name: "Plain Iron", description: "White and black with one orange detail.", seed: ["#FFFFFF", "#101214", "#D4572B", "#101214"], fonts: "manrope-inter" },
      host: { name: "Coach Spotlight", description: "A strong portrait on cool gray with deep green.", seed: ["#E9ECEA", "#161A1B", "#2F4B3F", "#C9542A"], fonts: "bricolage-inter" },
      asymmetric: { name: "Rep Count", description: "A brick-orange block, an offset image and a graphite card.", seed: ["#F1F0EC", "#1A1D1E", "#C4532A", "#1A1D1E"], fonts: "jakarta-inter", look: { caps: true } },
    },
  },
  {
    category: "Marketing",
    slug: "marketing",
    kicker: "Live masterclass",
    tags: ["growth", "sales", "social media", "ads", "brand", "agency", "funnel", "ecommerce"],
    templates: {
      editorial: { name: "Campaign Notes", description: "Cream paper, black type and a mustard rule.", seed: ["#FAF6EF", "#1C1C1C", "#D9A93B", "#1C1C1C"], fonts: "bricolage-inter" },
      photo: { name: "Outdoor", description: "A full-width photograph under deep brown with a mustard button.", seed: ["#F4EFE7", "#1F1B17", "#2B2420", "#D9A93B"], fonts: "jakarta-inter" },
      minimal: { name: "Plain Brief", description: "Black and white with a mustard detail.", seed: ["#FFFFFF", "#111111", "#D9A93B", "#111111"], fonts: "bricolage-inter" },
      host: { name: "Face of the Brand", description: "A bold portrait on a mustard block.", seed: ["#F1E9DD", "#241D19", "#D9A93B", "#241D19"], fonts: "dmserif-dmsans" },
      asymmetric: { name: "Poster", description: "A coral block, an offset image and a black form card.", seed: ["#F3EDE6", "#20201F", "#D96A4C", "#20201F"], fonts: "instrument-inter" },
    },
  },
];

function buildTemplates(): WebinarTemplate[] {
  const out: WebinarTemplate[] = [];
  CATEGORY_DEFS.forEach((def, categoryIndex) => {
    LAYOUT_ORDER.forEach((layout) => {
      const spec = def.templates[layout];
      const [bg, ink, brand, accent] = spec.seed;
      const tags = [...def.tags, layout, LAYOUT_LABELS[layout].name.toLowerCase(), isDark(bg) ? "dark" : "light"];
      if (layout === "photo") tags.push("photography", "photo");
      if (layout === "host") tags.push("portrait", "personal brand");
      if (layout === "minimal") tags.push("simple", "clean");
      out.push({
        id: `${def.slug}-${layout}`,
        name: spec.name,
        description: spec.description,
        category: def.category,
        tags,
        layout,
        seed: { bg, ink, brand, accent },
        fonts: spec.fonts,
        // Alternate which side the asymmetric image sits on, so two
        // neighbouring categories never share a mirror image.
        look: { ...BASE_LOOK[layout], ...spec.look, flip: spec.look?.flip ?? (layout === "asymmetric" && categoryIndex % 2 === 1) },
        kicker: def.kicker,
      });
    });
  });
  return out;
}

export const WEBINAR_TEMPLATES: WebinarTemplate[] = buildTemplates();

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
