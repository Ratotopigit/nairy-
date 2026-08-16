export type SlideType =
  | "title"
  | "split"
  | "bullets"
  | "visual"
  | "metrics"
  | "services"
  | "timeline"
  | "process"
  | "chart"
  | "closing";

export const SLIDE_TYPES: { id: SlideType; label: string }[] = [
  { id: "title", label: "Title" },
  { id: "split", label: "Split" },
  { id: "bullets", label: "Bullets" },
  { id: "visual", label: "Visual" },
  { id: "metrics", label: "Metrics" },
  { id: "services", label: "Services" },
  { id: "timeline", label: "Timeline" },
  { id: "process", label: "Process" },
  { id: "chart", label: "Chart" },
  { id: "closing", label: "Closing" },
];

export type LayoutVariant = "A" | "B" | "C" | "D";

export type Slide = {
  id: string;
  name: string;
  type: SlideType;
  layout: LayoutVariant;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  metrics: { value: string; label: string }[];
  chart: number[];
  useImage: boolean;
  image?: string | null;
};

export type Palette = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  ink: string;
  muted: string;
};

export const PALETTES: Palette[] = [
  {
    id: "clay",
    name: "Terracotta",
    primary: "#A84E2B",
    secondary: "#E7B49A",
    accent: "#5D2C1C",
    background: "#FBF6F0",
    ink: "#251B17",
    muted: "#76665E",
  },
  {
    id: "ochre",
    name: "Saffron",
    primary: "#9A650B",
    secondary: "#E5C778",
    accent: "#4E3A0B",
    background: "#FBF8ED",
    ink: "#211D13",
    muted: "#746C58",
  },
  {
    id: "slate",
    name: "Atlantic",
    primary: "#234B67",
    secondary: "#A7C2D3",
    accent: "#C56C3D",
    background: "#F4F8FA",
    ink: "#14232D",
    muted: "#61727C",
  },
  {
    id: "forest",
    name: "Evergreen",
    primary: "#1F503D",
    secondary: "#9DBFAE",
    accent: "#D17A46",
    background: "#F3F8F4",
    ink: "#14251D",
    muted: "#637269",
  },
  {
    id: "ink",
    name: "Monochrome",
    primary: "#202625",
    secondary: "#B8B3A9",
    accent: "#9E5132",
    background: "#F7F5EF",
    ink: "#151817",
    muted: "#656A67",
  },
];

export type FontSetId =
  | "anthropic"
  | "grotesk"
  | "corporate"
  | "minimal"
  | "display"
  | "luxury"
  | "editorial"
  | "genz"
  | "technical";

export type FontSet = {
  id: FontSetId;
  name: string;
  note: string;
  headingFont: string;
  bodyFont: string;
  headingWeight: number;
  tracking: string;
};

export const FONT_SETS: FontSet[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    note: "Newsreader / Inter Tight",
    headingFont: '"Newsreader", Georgia, serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 400,
    tracking: "-0.015em",
  },
  {
    id: "grotesk",
    name: "Grotesk",
    note: "Space Grotesk / Inter Tight",
    headingFont: '"Space Grotesk", system-ui, sans-serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 600,
    tracking: "-0.03em",
  },
  {
    id: "corporate",
    name: "Corporate",
    note: "Plus Jakarta Sans / Inter Tight",
    headingFont: '"Plus Jakarta Sans", system-ui, sans-serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 700,
    tracking: "-0.015em",
  },
  {
    id: "minimal",
    name: "Minimal",
    note: "Inter Tight, quiet weights",
    headingFont: '"Inter Tight", system-ui, sans-serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 500,
    tracking: "-0.01em",
  },
  {
    id: "display",
    name: "Display",
    note: "Bricolage Grotesque / Inter Tight",
    headingFont: '"Bricolage Grotesque", system-ui, sans-serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 800,
    tracking: "-0.04em",
  },
  {
    id: "luxury",
    name: "Luxury",
    note: "Cormorant Garamond / Inter Tight",
    headingFont: '"Cormorant Garamond", Georgia, serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 500,
    tracking: "0.01em",
  },
  {
    id: "editorial",
    name: "Editorial",
    note: "Instrument Serif / Inter Tight",
    headingFont: '"Instrument Serif", Georgia, serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 400,
    tracking: "-0.02em",
  },
  {
    id: "genz",
    name: "Creator",
    note: "Bricolage Grotesque / Space Grotesk",
    headingFont: '"Bricolage Grotesque", system-ui, sans-serif',
    bodyFont: '"Space Grotesk", system-ui, sans-serif',
    headingWeight: 650,
    tracking: "-0.03em",
  },
  {
    id: "technical",
    name: "Technical",
    note: "JetBrains Mono / Inter Tight",
    headingFont: '"JetBrains Mono", ui-monospace, monospace',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 500,
    tracking: "-0.02em",
  },
];



export type StyleId =
  | "modern"
  | "corporate"
  | "minimal"
  | "editorial"
  | "bold"
  | "luxury"
  | "technical"
  | "genz";

export const STYLES: { id: StyleId; label: string }[] = [
  { id: "modern", label: "Modern" },
  { id: "corporate", label: "Corporate" },
  { id: "minimal", label: "Minimal" },
  { id: "editorial", label: "Editorial" },
  { id: "bold", label: "Bold" },
  { id: "luxury", label: "Luxury" },
  { id: "technical", label: "Technical" },
  { id: "genz", label: "Creator" },
];

/** Each theme presets its own typography — picking a theme swaps the typeface. */
export const STYLE_FONT: Record<StyleId, FontSetId> = {
  modern: "anthropic",
  corporate: "corporate",
  minimal: "minimal",
  editorial: "editorial",
  bold: "display",
  luxury: "luxury",
  technical: "technical",
  genz: "genz",
};

/** Each theme also has a default slide layout, applied when the theme changes. */
export const STYLE_LAYOUT: Record<StyleId, LayoutVariant> = {
  modern: "A",
  corporate: "A",
  minimal: "D",
  editorial: "B",
  bold: "C",
  luxury: "B",
  technical: "D",
  genz: "C",
};


/** Infer a style from what the user says about their business. */
export function inferStyle(text: string): StyleId | null {
  const t = text.toLowerCase();
  const rules: [StyleId, RegExp][] = [
    ["luxury", /\b(luxury|premium|jewel|couture|hotel|resort|fine dining|boutique|watch|estate)\b/],
    ["bold", /\b(bold|sport|fitness|gaming|energy|youth|gen ?z|streetwear|creator|viral)\b/],
    ["corporate", /\b(bank|finance|insurance|legal|consult|enterprise|b2b|compliance|audit|corporate)\b/],
    ["editorial", /\b(editorial|magazine|publish|story|brand studio|culture|architecture|design studio)\b/],
    ["minimal", /\b(minimal|clean|simple|calm|wellness|skincare|zen|studio)\b/],
    ["modern", /\b(saas|startup|tech|ai|platform|app|product|software|modern)\b/],
  ];
  for (const [id, re] of rules) if (re.test(t)) return id;
  return null;
}


export type StyleSpec = {
  headingFont: string;
  bodyFont: string;
  headingWeight: number;
  headingScale: number;
  tracking: string;
  uppercaseEyebrow: boolean;
  rule: boolean;
  pad: number;
};

export const STYLE_SPECS: Record<StyleId, StyleSpec> = {
  modern: {
    headingFont: '"Inter Tight", system-ui, sans-serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 600,
    headingScale: 1,
    tracking: "-0.02em",
    uppercaseEyebrow: true,
    rule: false,
    pad: 7,
  },
  corporate: {
    headingFont: '"Inter Tight", system-ui, sans-serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 600,
    headingScale: 0.86,
    tracking: "-0.005em",
    uppercaseEyebrow: true,
    rule: true,
    pad: 6,
  },
  minimal: {
    headingFont: '"Inter Tight", system-ui, sans-serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 500,
    headingScale: 0.82,
    tracking: "-0.01em",
    uppercaseEyebrow: false,
    rule: false,
    pad: 9,
  },
  editorial: {
    headingFont: '"Instrument Serif", Georgia, serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 400,
    headingScale: 1.24,
    tracking: "-0.02em",
    uppercaseEyebrow: false,
    rule: true,
    pad: 7,
  },
  bold: {
    headingFont: '"Inter Tight", system-ui, sans-serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 700,
    headingScale: 1.32,
    tracking: "-0.035em",
    uppercaseEyebrow: true,
    rule: false,
    pad: 6,
  },
  luxury: {
    headingFont: '"Instrument Serif", Georgia, serif',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 400,
    headingScale: 1.05,
    tracking: "0.01em",
    uppercaseEyebrow: true,
    rule: true,
    pad: 10,
  },
  technical: {
    headingFont: '"JetBrains Mono", ui-monospace, monospace',
    bodyFont: '"Inter Tight", system-ui, sans-serif',
    headingWeight: 500,
    headingScale: 0.84,
    tracking: "-0.02em",
    uppercaseEyebrow: true,
    rule: true,
    pad: 7,
  },
  genz: {
    headingFont: '"Bricolage Grotesque", system-ui, sans-serif',
    bodyFont: '"Space Grotesk", system-ui, sans-serif',
    headingWeight: 700,
    headingScale: 1.28,
    tracking: "-0.03em",
    uppercaseEyebrow: false,
    rule: false,
    pad: 6,
  },
};

export const RATIOS = [
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "4:3", label: "4:3", value: 4 / 3 },
  { id: "portrait", label: "Portrait", value: 3 / 4 },
  { id: "square", label: "Square", value: 1 },
] as const;
export type RatioId = (typeof RATIOS)[number]["id"];

export const PURPOSES = ["Company Profile", "Sales", "Pitch", "Proposal", "Report"] as const;
export type Purpose = (typeof PURPOSES)[number];

export const MOTIONS = ["None", "Professional", "Dynamic"] as const;
export type Motion = (typeof MOTIONS)[number];

let counter = 0;
const uid = () => `s${Date.now().toString(36)}${(counter++).toString(36)}`;

type Draft = Partial<Slide> & { name: string; type: SlideType };

function make(d: Draft): Slide {
  return {
    id: uid(),
    layout: "A",
    eyebrow: "",
    title: "",
    body: "",
    bullets: [],
    metrics: [],
    chart: [42, 58, 51, 74, 96],
    useImage: false,
    ...d,
  };
}

/** Mock generation — deterministic, purpose-aware deck outlines. */
export function generateDeck(opts: {
  purpose: Purpose;
  count: number;
  company: string;
  hasImage: boolean;
}): Slide[] {
  const co = opts.company.trim() || "Northbridge Partners";
  const base: Slide[] = [
    make({
      name: "Title",
      type: "title",
      eyebrow: opts.purpose,
      title: co,
      body: "Prepared for the executive review — Q3 2026",
      useImage: opts.hasImage,
    }),
    make({
      name: "Introduction",
      type: "split",
      eyebrow: "Introduction",
      title: "A practice built for operators",
      body: "We help mid-market teams turn fragmented reporting into a single, defensible view of performance.",
      bullets: ["Founded 2018", "84 clients", "3 regions"],
      useImage: opts.hasImage,
    }),
    make({
      name: "Metrics",
      type: "metrics",
      eyebrow: "Performance",
      title: "Headline metrics",
      body: "ARR $18.4M, up 31% QoQ with net retention at 121%.",
      metrics: [
        { value: "$18.4M", label: "Annual recurring revenue" },
        { value: "121%", label: "Net revenue retention" },
        { value: "31%", label: "Quarter over quarter" },
        { value: "4.2y", label: "Median tenure" },
      ],
      chart: [42, 58, 51, 74, 96],
    }),
    make({
      name: "Segments",
      type: "chart",
      eyebrow: "Segments",
      title: "Where the growth comes from",
      body: "Enterprise expansion contributed 62% of net new revenue this quarter.",
      chart: [36, 62, 44, 81, 68, 93],
    }),
    make({
      name: "Services",
      type: "services",
      eyebrow: "Capabilities",
      title: "What we deliver",
      body: "Four practices, one operating model.",
      bullets: [
        "Advisory — quarterly operating cadence and board reporting.",
        "Analytics — warehouse, semantic layer, governed metrics.",
        "Automation — reconciliation and close acceleration.",
        "Enablement — training for finance and revenue teams.",
      ],
    }),
    make({
      name: "Pipeline",
      type: "process",
      eyebrow: "Method",
      title: "How engagements run",
      body: "A four-stage sequence, delivered in twelve weeks.",
      bullets: ["Diagnose", "Design", "Deploy", "Operate"],
    }),
    make({
      name: "Timeline",
      type: "timeline",
      eyebrow: "Roadmap",
      title: "The next four quarters",
      body: "Sequenced to reduce delivery risk.",
      bullets: [
        "Q3 — Data foundation and metric definitions",
        "Q4 — Reporting rollout across three regions",
        "Q1 — Forecasting and scenario planning",
        "Q2 — Automation of the monthly close",
      ],
    }),
    make({
      name: "Risks",
      type: "bullets",
      eyebrow: "Considerations",
      title: "Risks and mitigations",
      body: "Known constraints, with an owner assigned to each.",
      bullets: [
        "Data quality in legacy billing — parallel run for two cycles.",
        "Change capacity in finance — phased training programme.",
        "Vendor consolidation timing — contract review in Q4.",
        "Regional compliance review — counsel engaged.",
      ],
    }),
    make({
      name: "Team",
      type: "visual",
      eyebrow: "Team",
      title: "Who you will work with",
      body: "A senior team, permanently assigned — no rotation mid-engagement.",
      useImage: opts.hasImage,
    }),
    make({
      name: "Next steps",
      type: "closing",
      eyebrow: "Next steps",
      title: "Let's begin the diagnostic",
      body: "Two weeks, one workshop, a written findings memo.",
    }),
  ];

  const n = Math.min(Math.max(opts.count, 3), base.length);
  const keep = [0, 2, 3, 1, 4, 5, 7, 6, 8, 9].slice(0, n).sort((a, b) => a - b);
  return keep.map((i) => ({ ...(base[i] as Slide), id: uid() }));
}

export const REGEN_MODES = [
  "Same content, new layout",
  "Shorter",
  "More visual",
  "More professional",
  "More minimal",
] as const;
export type RegenMode = (typeof REGEN_MODES)[number];

const LAYOUT_CYCLE: LayoutVariant[] = ["A", "B", "C", "D"];

export function regenerateSlide(slide: Slide, mode: RegenMode): Slide {
  const next = { ...slide };
  const advance = () =>
    LAYOUT_CYCLE[(LAYOUT_CYCLE.indexOf(slide.layout) + 1) % LAYOUT_CYCLE.length] as LayoutVariant;
  switch (mode) {
    case "Same content, new layout":
      next.layout = advance();
      break;
    case "Shorter":
      next.body = next.body.split(/(?<=\.)\s/)[0] || next.body;
      next.bullets = next.bullets.slice(0, 3);
      break;
    case "More visual":
      next.layout = "C";
      next.useImage = true;
      next.body = next.body.split(/(?<=\.)\s/)[0] || next.body;
      break;
    case "More professional":
      next.layout = "A";
      next.eyebrow = next.eyebrow || "Overview";
      break;
    case "More minimal":
      next.layout = "D";
      next.bullets = next.bullets.slice(0, 3);
      next.useImage = false;
      break;
  }
  return next;
}

export const GENERATION_STEPS = [
  "Structuring content",
  "Selecting layouts",
  "Applying brand style",
  "Preparing slides",
];
