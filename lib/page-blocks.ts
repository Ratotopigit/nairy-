/**
 * Drag-and-drop page builder: the block model shared by the builder, the
 * public renderer and lib/webinars.ts.
 *
 * A webinar's `pages.<page>` is an ordered list of blocks. An EMPTY list means
 * "use the chosen template" (lib/webinar-templates.ts), so every existing
 * webinar keeps rendering exactly as before until its host opens the builder.
 *
 * Everything stored is untrusted (the owner can write the document directly
 * and it is public once published), so `coerceBlocks` rebuilds every block
 * from scratch: known types only, bounded strings, https URLs only. Renderers
 * may rely on that, but must still never inject block text as HTML; the
 * `html` block is rendered only inside a sandboxed iframe without
 * allow-same-origin (the public page shares an origin with the signed-in app).
 *
 * Plain data and pure functions, no React or Firebase, so tests can load it.
 */

export type PageId = "registration" | "thanks" | "replay" | "watch";

export const PAGE_IDS: PageId[] = ["registration", "thanks", "replay", "watch"];

export type Align = "left" | "center" | "right";

/** Optional look for any block. Colours are "#rrggbb"; "" = the theme's own. */
export type BlockStyle = {
  bg: string;
  color: string;
  align: Align;
  /** Vertical padding in px, 0-160. */
  pad: number;
};

type Base<T extends string> = { id: string; type: T; style: BlockStyle };

export type HeadingBlock = Base<"heading"> & { text: string; level: 1 | 2 | 3 };
export type TextBlock = Base<"text"> & { text: string };
export type ImageBlock = Base<"image"> & { url: string; alt: string; /** % of the content width, 20-100. */ width: number };
/** source "webinar" = the webinar's video_url, "replay" = replay_url, "custom" = url. */
export type VideoBlock = Base<"video"> & { source: "webinar" | "replay" | "custom"; url: string };
/** action "form" scrolls to the sign-up form, "payment" opens payment_url, "link" opens href. */
export type ButtonBlock = Base<"button"> & { label: string; action: "form" | "payment" | "link"; href: string };
/** The registration form (registration page only). Paid webinars show the checkout button instead. */
export type FormBlock = Base<"form"> & { button: string };
/** target "session" = the next session, "replay-expiry" = when the replay closes, "custom" = date. */
export type TimerBlock = Base<"timer"> & { target: "session" | "replay-expiry" | "custom"; date: string; label: string };
/** Empty fields fall back to the webinar's presenter fields. */
export type PresenterBlock = Base<"presenter"> & { name: string; title: string; bio: string; photo: string };
export type ListBlock = Base<"list"> & { items: string[]; marker: "tick" | "number" | "dot" };
export type SpacerBlock = Base<"spacer"> & { height: number };
export type DividerBlock = Base<"divider">;
/** Rendered ONLY in a sandboxed iframe (scripts allowed, same origin never). */
export type HtmlBlock = Base<"html"> & { code: string; height: number };
/** Thank-you page: the attendee's join or watch link. */
export type SessionLinkBlock = Base<"session-link"> & { label: string };
/** Thank-you page: share this webinar. */
export type ShareBlock = Base<"share"> & { label: string };
/** Thank-you page: add-to-calendar links for the session. */
export type CalendarBlock = Base<"calendar"> & { label: string };
/** Watch room: the live countdown and join button, or the recorded video, or "ended". Settings live in watch_room. */
export type WatchPlayerBlock = Base<"watch-player">;
/** Side-by-side columns, one level deep (no columns inside columns). */
export type ColumnsBlock = Base<"columns"> & { columns: LeafBlock[][] };

export type LeafBlock =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | VideoBlock
  | ButtonBlock
  | FormBlock
  | TimerBlock
  | PresenterBlock
  | ListBlock
  | SpacerBlock
  | DividerBlock
  | HtmlBlock
  | SessionLinkBlock
  | ShareBlock
  | CalendarBlock
  | WatchPlayerBlock;

export type Block = LeafBlock | ColumnsBlock;
export type BlockType = Block["type"];

export type PageBlocks = Partial<Record<PageId, Block[]>>;

export const BLOCK_LIMITS = {
  blocksPerPage: 60,
  columns: 3,
  blocksPerColumn: 12,
  heading: 200,
  text: 3000,
  label: 80,
  url: 1000,
  alt: 200,
  listItems: 12,
  listItem: 200,
  html: 10000,
  /** html blocks per page, columns included. */
  htmlPerPage: 3,
  name: 120,
  bio: 600,
} as const;

/** What the builder's block list offers, per page, in display order. */
export const BLOCK_CATALOG: { type: BlockType; label: string; pages: PageId[] }[] = [
  { type: "columns", label: "Columns", pages: ["registration", "thanks", "replay", "watch"] },
  { type: "heading", label: "Heading", pages: ["registration", "thanks", "replay", "watch"] },
  { type: "text", label: "Text", pages: ["registration", "thanks", "replay", "watch"] },
  { type: "image", label: "Image", pages: ["registration", "thanks", "replay", "watch"] },
  { type: "form", label: "Form", pages: ["registration"] },
  { type: "timer", label: "Timer", pages: ["registration", "thanks", "replay", "watch"] },
  { type: "video", label: "Video", pages: ["registration", "thanks", "replay", "watch"] },
  { type: "button", label: "Button", pages: ["registration", "thanks", "replay", "watch"] },
  { type: "presenter", label: "Presenter", pages: ["registration", "thanks", "replay", "watch"] },
  { type: "list", label: "List", pages: ["registration", "thanks", "replay", "watch"] },
  { type: "session-link", label: "Session link", pages: ["thanks"] },
  { type: "share", label: "Share links", pages: ["thanks"] },
  { type: "calendar", label: "Calendar links", pages: ["thanks"] },
  { type: "watch-player", label: "Watch area", pages: ["watch"] },
  { type: "spacer", label: "Spacer", pages: ["registration", "thanks", "replay", "watch"] },
  { type: "divider", label: "Divider", pages: ["registration", "thanks", "replay", "watch"] },
  { type: "html", label: "HTML", pages: ["registration", "thanks", "replay", "watch"] },
];

const DEFAULT_STYLE: BlockStyle = { bg: "", color: "", align: "center", pad: 16 };

export function newBlockId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** A fresh block of a type with sensible starting content. */
export function createBlock(type: BlockType, page?: PageId): Block {
  const base = { id: newBlockId(), style: { ...DEFAULT_STYLE } };
  switch (type) {
    case "heading":
      return { ...base, type, text: "Your headline", level: 1 };
    case "text":
      return { ...base, type, text: "Write something here." };
    case "image":
      return { ...base, type, url: "", alt: "", width: 100 };
    case "video":
      return { ...base, type, source: "webinar", url: "" };
    case "button":
      // Only the registration page has a form to scroll to.
      return page && page !== "registration" ? { ...base, type, label: "Learn more", action: "link", href: "" } : { ...base, type, label: "Register now", action: "form", href: "" };
    case "form":
      return { ...base, type, button: "Register now" };
    case "timer":
      return { ...base, type, target: "session", date: "", label: "Starts in" };
    case "presenter":
      return { ...base, type, name: "", title: "", bio: "", photo: "" };
    case "list":
      return { ...base, type, items: ["First point", "Second point", "Third point"], marker: "tick" };
    case "spacer":
      return { ...base, type, height: 40 };
    case "divider":
      return { ...base, type };
    case "html":
      return { ...base, type, code: "", height: 200 };
    case "session-link":
      return { ...base, type, label: "Your webinar link" };
    case "share":
      return { ...base, type, label: "Share" };
    case "calendar":
      return { ...base, type, label: "Add to calendar" };
    case "watch-player":
      return { ...base, type };
    case "columns":
      return { ...base, type, columns: [[createBlock("text") as LeafBlock], [createBlock("image") as LeafBlock]] };
  }
}

/** Starting layouts for each page ("Browse templates" in the builder). */
export function starterBlocks(page: PageId): Block[] {
  const b = <T extends BlockType>(type: T, patch: Record<string, unknown> = {}) => ({ ...createBlock(type), ...patch }) as Block;
  if (page === "thanks") {
    return [
      b("heading", { text: "Thanks for registering!" }),
      b("text", { text: "We'll email you everything you need. Save the link below so you can join on the day." }),
      b("session-link"),
      b("calendar"),
      b("timer", { label: "Webinar starts in" }),
      b("share"),
    ];
  }
  if (page === "watch") {
    // The heading takes the watch room headline and the button the offer (builder/templates.ts fillFromWebinar).
    return [
      b("heading", { text: "Your webinar headline" }),
      b("watch-player"),
      b("button", { label: "Get the special offer", action: "link" }),
      b("text", { text: "" }),
    ];
  }
  if (page === "replay") {
    return [
      b("heading", { text: "Watch the replay" }),
      b("text", { text: "In case you missed it, here's the full recording." }),
      b("video", { source: "replay" }),
      b("button", { label: "Get the special offer", action: "link" }),
      b("timer", { target: "replay-expiry", label: "Replay expires in" }),
    ];
  }
  return [
    b("heading", { text: "Your webinar headline" }),
    b("text", { text: "One sentence on what people walk away with." }),
    b("timer", { label: "Next session in" }),
    b("form"),
    b("presenter"),
  ];
}

/**
 * Watch room: the first heading becomes the room's headline (or the title), the
 * first empty text the subtitle, and every link button with no link the offer.
 * Without an offer those buttons go, and so does an empty text, so the standard
 * room shows only what the host has set. Used by the standard room and the builder.
 */
export function fillWatchBlocks(
  blocks: Block[],
  w: { title: string; subtitle: string; watch_room: Pick<WatchRoom, "headline" | "offer_label" | "offer_url"> },
): Block[] {
  const room = w.watch_room;
  const offer = room.offer_label.trim() ? safeHttpsUrl(room.offer_url) : "";
  let heading = true;
  let text = true;
  return blocks.flatMap((x): Block[] => {
    if (x.type === "heading" && heading) {
      heading = false;
      return [{ ...x, text: room.headline.trim() || w.title }];
    }
    if (x.type === "text" && text && !x.text.trim()) {
      text = false;
      return w.subtitle.trim() ? [{ ...x, text: w.subtitle }] : [];
    }
    if (x.type === "button" && x.action === "link" && !x.href) return offer ? [{ ...x, href: offer, label: room.offer_label }] : [];
    return [x];
  });
}

// ── Coercion of untrusted stored data ──────────────────────────────────────

const HEX = /^#[0-9a-fA-F]{6}$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown, min: number, max: number, dflt: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : dflt;
const pick = <T extends string>(v: unknown, allowed: readonly T[], dflt: T): T =>
  allowed.includes(v as T) ? (v as T) : dflt;

/** https only, else "". Normalised through URL so odd spellings can't slip through. */
export function safeHttpsUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const u = new URL(value.trim());
    // Dropped, not cut: a truncated link would point somewhere else.
    return u.protocol === "https:" && u.hostname && u.href.length <= BLOCK_LIMITS.url ? u.href : "";
  } catch {
    return "";
  }
}

function coerceStyle(v: unknown): BlockStyle {
  const s = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    bg: typeof s.bg === "string" && HEX.test(s.bg) ? s.bg : "",
    color: typeof s.color === "string" && HEX.test(s.color) ? s.color : "",
    align: pick(s.align, ["left", "center", "right"] as const, "center"),
    pad: num(s.pad, 0, 160, 16),
  };
}

function coerceLeaf(v: Record<string, unknown>): LeafBlock | null {
  const base = {
    id: str(v.id, 40).replace(/[^A-Za-z0-9_-]/g, "") || newBlockId(),
    style: coerceStyle(v.style),
  };
  switch (v.type) {
    case "heading":
      return { ...base, type: "heading", text: str(v.text, BLOCK_LIMITS.heading), level: pick(v.level as never, [1, 2, 3] as never[], 1 as never) };
    case "text":
      return { ...base, type: "text", text: str(v.text, BLOCK_LIMITS.text) };
    case "image":
      return { ...base, type: "image", url: safeHttpsUrl(v.url), alt: str(v.alt, BLOCK_LIMITS.alt), width: num(v.width, 20, 100, 100) };
    case "video":
      return { ...base, type: "video", source: pick(v.source, ["webinar", "replay", "custom"] as const, "webinar"), url: safeHttpsUrl(v.url) };
    case "button":
      return { ...base, type: "button", label: str(v.label, BLOCK_LIMITS.label), action: pick(v.action, ["form", "payment", "link"] as const, "form"), href: safeHttpsUrl(v.href) };
    case "form":
      return { ...base, type: "form", button: str(v.button, BLOCK_LIMITS.label) };
    case "timer":
      return {
        ...base,
        type: "timer",
        target: pick(v.target, ["session", "replay-expiry", "custom"] as const, "session"),
        date: typeof v.date === "string" && !Number.isNaN(Date.parse(v.date)) ? new Date(v.date).toISOString() : "",
        label: str(v.label, BLOCK_LIMITS.label),
      };
    case "presenter":
      return { ...base, type: "presenter", name: str(v.name, BLOCK_LIMITS.name), title: str(v.title, BLOCK_LIMITS.name), bio: str(v.bio, BLOCK_LIMITS.bio), photo: safeHttpsUrl(v.photo) };
    case "list":
      return {
        ...base,
        type: "list",
        items: Array.isArray(v.items) ? v.items.slice(0, BLOCK_LIMITS.listItems).map((i) => str(i, BLOCK_LIMITS.listItem)) : [],
        marker: pick(v.marker, ["tick", "number", "dot"] as const, "tick"),
      };
    case "spacer":
      return { ...base, type: "spacer", height: num(v.height, 4, 400, 40) };
    case "divider":
      return { ...base, type: "divider" };
    case "html":
      return { ...base, type: "html", code: str(v.code, BLOCK_LIMITS.html), height: num(v.height, 40, 2000, 200) };
    case "session-link":
      return { ...base, type: "session-link", label: str(v.label, BLOCK_LIMITS.label) };
    case "share":
      return { ...base, type: "share", label: str(v.label, BLOCK_LIMITS.label) };
    case "calendar":
      return { ...base, type: "calendar", label: str(v.label, BLOCK_LIMITS.label) };
    case "watch-player":
      return { ...base, type: "watch-player" };
    default:
      return null;
  }
}

function coerceBlock(v: unknown): Block | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.type === "columns") {
    const cols = Array.isArray(o.columns) ? o.columns.slice(0, BLOCK_LIMITS.columns) : [];
    // Stored as [{ blocks }] (Firestore has no nested arrays); older or in-memory data is [[...]].
    const columns = cols.map((c) =>
      (Array.isArray(c) ? c : Array.isArray(c?.blocks) ? (c.blocks as unknown[]) : [])
        .slice(0, BLOCK_LIMITS.blocksPerColumn)
        .map((x) => (x && typeof x === "object" ? coerceLeaf(x as Record<string, unknown>) : null))
        .filter((x): x is LeafBlock => x !== null),
    );
    if (columns.length < 1) return null;
    return {
      id: str(o.id, 40).replace(/[^A-Za-z0-9_-]/g, "") || newBlockId(),
      type: "columns",
      style: coerceStyle(o.style),
      columns,
    };
  }
  return coerceLeaf(o);
}

export function coerceBlocks(v: unknown): Block[] {
  if (!Array.isArray(v)) return [];
  let html = 0;
  const keep = (b: Block) => b.type !== "html" || ++html <= BLOCK_LIMITS.htmlPerPage;
  return v
    .slice(0, BLOCK_LIMITS.blocksPerPage)
    .map(coerceBlock)
    .filter((b): b is Block => b !== null && keep(b))
    .map((b) => (b.type === "columns" ? { ...b, columns: b.columns.map((col) => col.filter(keep)) } : b));
}

/** Every block on the page, including the ones inside columns, in reading order. */
export function allLeaves(blocks: Block[]): LeafBlock[] {
  return blocks.flatMap((b) => (b.type === "columns" ? b.columns.flat() : [b]));
}

/**
 * The form `pages` is written to Firestore in: columns become [{ blocks }]
 * because Firestore rejects nested arrays. coerceBlocks reads both forms.
 */
export function toStoredPages(pages: PageBlocks): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [id, blocks] of Object.entries(pages)) {
    out[id] = (blocks ?? []).map((b) => (b.type === "columns" ? { ...b, columns: b.columns.map((blocks) => ({ blocks })) } : b));
  }
  return out;
}

/** Firestore documents max out at 1 MiB; the pages get well under that, leaving room for the rest. */
export const STORED_PAGES_MAX_BYTES = 600_000;

export function storedPagesBytes(pages: PageBlocks): number {
  return new TextEncoder().encode(JSON.stringify(toStoredPages(pages))).length;
}

export function coercePages(v: unknown): PageBlocks {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const out: PageBlocks = {};
  for (const id of PAGE_IDS) {
    const blocks = coerceBlocks(o[id]);
    if (blocks.length) out[id] = blocks;
  }
  return out;
}

// ── Watch room ─────────────────────────────────────────────────────────────

/** Settings for the page attendees watch on. Chat, polls and handouts are not built yet. */
export type WatchRoom = {
  headline: string;
  /** Shown before the session starts. */
  waiting_text: string;
  offer_label: string;
  offer_url: string;
  /** Minutes into the session before the offer button appears; 0 = from the start. */
  offer_after_min: number;
  /** "" = theme colours. */
  bg: string;
  accent: string;
};

export function coerceWatchRoom(v: unknown): WatchRoom {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    headline: str(o.headline, BLOCK_LIMITS.heading),
    waiting_text: str(o.waiting_text, 300) || "The webinar has not started yet.",
    offer_label: str(o.offer_label, BLOCK_LIMITS.label),
    offer_url: safeHttpsUrl(o.offer_url),
    offer_after_min: num(o.offer_after_min, 0, 600, 0),
    bg: typeof o.bg === "string" && HEX.test(o.bg) ? o.bg : "",
    accent: typeof o.accent === "string" && HEX.test(o.accent) ? o.accent : "",
  };
}

/** How long the replay stays watchable after the session ends; 0 = forever. */
export const REPLAY_EXPIRY_OPTIONS = [0, 1, 2, 3, 7, 14, 30] as const;
