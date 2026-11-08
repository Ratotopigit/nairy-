import { createBlock, fillWatchBlocks, starterBlocks, type Block, type BlockType, type LeafBlock, type PageId } from "@/lib/page-blocks";
import type { Webinar } from "@/lib/webinars";

const b = (type: BlockType, patch: Record<string, unknown> = {}) => ({ ...createBlock(type), ...patch }) as Block;
const cols = (...columns: Block[][]) => b("columns", { columns: columns as LeafBlock[][] });
const left = { style: { bg: "", color: "", align: "left", pad: 16 } };

/**
 * Puts the webinar's own words into a layout: headline from the title, the
 * first text from the subtitle, lists from the bullets, sign-up buttons from
 * the CTA label. Thank-you and replay pages keep their own headings.
 */
export function fillFromWebinar(blocks: Block[], w: Webinar, page: PageId): Block[] {
  if (page === "watch") return fillWatchBlocks(blocks, w);
  let heading = page === "registration" && Boolean(w.title.trim());
  let text = page === "registration" && Boolean(w.subtitle.trim());
  const bullets = w.bullets.map((x) => x.trim()).filter(Boolean);
  const cta = w.cta_label.trim();
  const leaf = (x: Block): Block => {
    if (x.type === "heading" && heading) {
      heading = false;
      return { ...x, text: w.title };
    }
    if (x.type === "text" && text) {
      text = false;
      return { ...x, text: w.subtitle };
    }
    if (x.type === "list" && bullets.length) return { ...x, items: bullets };
    if (x.type === "button" && x.action === "form" && cta) return { ...x, label: cta };
    if (x.type === "form" && cta) return { ...x, button: cta };
    return x;
  };
  return blocks.map((x) => (x.type === "columns" ? { ...x, columns: x.columns.map((c) => c.map((y) => leaf(y) as LeafBlock)) } : leaf(x)));
}

export type PageTemplate = { name: string; hint: string; make: () => Block[] };

const TEMPLATES: Record<PageId, PageTemplate[]> = {
  registration: [
    { name: "Simple", hint: "Headline, countdown, sign-up form and presenter.", make: () => starterBlocks("registration") },
    {
      name: "With presenter",
      hint: "What they'll learn beside who's teaching it.",
      make: () => [b("heading"), b("text"), cols([b("list", left)], [b("presenter")]), b("timer", { label: "Next session in" }), b("form")],
    },
    {
      name: "Video first",
      hint: "A short video up top, then the pitch and the form.",
      make: () => [b("video"), b("heading"), b("text"), b("list"), b("timer", { label: "Next session in" }), b("form")],
    },
    {
      name: "Two columns",
      hint: "Pitch on the left, picture on the right.",
      make: () => [cols([b("heading", left), b("text", left), b("list", left), b("button", left)], [b("image")]), b("timer", { label: "Next session in" }), b("form"), b("presenter")],
    },
  ],
  thanks: [
    { name: "Simple", hint: "Thanks, the join link, calendar, countdown and sharing.", make: () => starterBlocks("thanks") },
    {
      name: "With presenter",
      hint: "Adds who they'll meet on the day.",
      make: () => [b("heading", { text: "You're in!" }), b("text", { text: "Here's everything you need for the day." }), b("session-link"), b("calendar"), b("presenter"), b("share")],
    },
    {
      name: "Video first",
      hint: "A welcome video, then the link and calendar.",
      make: () => [b("heading", { text: "Thanks for registering!" }), b("video"), b("session-link"), b("calendar"), b("timer", { label: "Webinar starts in" }), b("share")],
    },
  ],
  watch: [
    { name: "Standard", hint: "Headline, the session or video, your offer and a short note.", make: () => starterBlocks("watch") },
    {
      name: "Video with offer",
      hint: "The session first, then who's presenting and a big offer button.",
      make: () => [
        b("watch-player"),
        b("heading", { text: "Your webinar headline", level: 2 }),
        b("presenter"),
        b("button", { label: "Get the special offer", action: "link", style: { bg: "", color: "", align: "center", pad: 32 } }),
      ],
    },
  ],
  replay: [
    { name: "Simple", hint: "Headline, the recording, an offer and the expiry countdown.", make: () => starterBlocks("replay") },
    {
      name: "With presenter",
      hint: "Recording, then who presented and the offer.",
      make: () => [b("heading", { text: "Watch the replay" }), b("video", { source: "replay" }), b("presenter"), b("button", { label: "Get the special offer", action: "link" }), b("timer", { target: "replay-expiry", label: "Replay expires in" })],
    },
    {
      name: "Video first",
      hint: "The recording is the first thing they see.",
      make: () => [b("video", { source: "replay" }), b("heading", { text: "Thanks for watching" }), b("button", { label: "Get the special offer", action: "link" }), b("timer", { target: "replay-expiry", label: "Replay expires in" })],
    },
  ],
};

export function templatesFor(page: PageId): PageTemplate[] {
  return TEMPLATES[page];
}
