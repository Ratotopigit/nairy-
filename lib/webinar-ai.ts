/**
 * AI-written registration page copy, from the host's Brand & Files and
 * business details, through the existing Content Maker webhook (no workflow
 * of its own).
 *
 * The workflow clips its `reply` to 400 characters, so one reply cannot hold a
 * whole page. The copy is asked for in four small parts, in parallel, each a
 * short JSON object in the reply. Slides are never asked for: a deck with
 * slides would show up as the host's latest presentation.
 */
import { askAssistant } from "./assistant";
import { emptyWebinar, type Webinar } from "./webinars";
import { loadStudioContext } from "./workspace-context";
import {
  coerceWebinarCopy,
  copyPatch as purePatch,
  extractJson,
  sampleFields,
  type CopyTarget,
  type WebinarCopy,
} from "./webinar-copy";

export type { WebinarCopy } from "./webinar-copy";

const RULES = [
  "You are writing text for a webinar registration page, not slides.",
  "Use the host's real business, audience and offer from the account memory and brand assets. Write in their voice.",
  "Never invent numbers, results, testimonials, client names, awards or claims. If something isn't in the context, leave it out.",
  "Do not create or change slides: return an empty slides array and generate false.",
  "Answer ONLY with one JSON object in the reply field: no other words, no code fences. The whole reply must be under 350 characters.",
].join("\n");

// Each part's JSON stays under the workflow's 400-character reply limit.
const PARTS = [
  '{"title": headline, max 80 characters, "subtitle": the transformation an attendee walks away with, one sentence, max 150 characters}',
  '{"bullets": exactly 3 concrete things attendees will learn or be able to do, each max 70 characters, "cta_label": register button text, max 24 characters}',
  '{"presenter_title": the host\'s role and business, max 50 characters, "host_bio": short third-person bio from the context that uses the host\'s name and never he, she, his or her (their gender is unknown), max 220 characters}',
  '{"social_proof": ONE line of real, verifiable proof that appears word-for-word in the context (max 90 characters), otherwise "", "thank_you_message": warm confirmation shown after sign-up, max 160 characters}',
];

function sample() {
  return emptyWebinar("");
}

/** Pure: only the fields to change. With onlyEmpty, only empty or starter-text fields. */
export function copyPatch(w: CopyTarget, copy: WebinarCopy, opts: { onlyEmpty: boolean }): Partial<WebinarCopy> {
  return purePatch(w, copy, { ...opts, sample: sample() });
}

/** True while any page-copy field is empty or still starter text. */
export function hasSampleCopy(w: CopyTarget): boolean {
  return sampleFields(w, sample()).length > 0;
}

export async function writeWebinarCopy(webinar: Webinar, uid: string): Promise<WebinarCopy> {
  // assetContext already carries the account memory, scrubbed of billing state.
  const studio = await loadStudioContext(uid).catch(() => null);
  const about = [
    `Webinar name: ${webinar.name}`,
    webinar.title && webinar.title !== webinar.name ? `Current headline: ${webinar.title}` : "",
    webinar.brand_name ? `Brand: ${webinar.brand_name}${webinar.brand_tagline ? ` (${webinar.brand_tagline})` : ""}` : "",
    webinar.presenter_name ? `Presenter: ${webinar.presenter_name}` : "",
    `Access: ${webinar.access_type === "paid" ? `paid${webinar.ticket_price ? ` (${webinar.ticket_price})` : ""}` : "free"}`,
    `Delivery: ${webinar.delivery_type === "automated" ? "on demand, watch any time" : "live session"}`,
  ]
    .filter(Boolean)
    .join("\n");

  const settled = await Promise.allSettled(
    PARTS.map(async (shape) => {
      const res = await askAssistant({
        mode: "assistant",
        projectId: "",
        blueprintSessionId: null,
        message: `${RULES}\n\nWEBINAR\n${about}\n\nReply with exactly this JSON shape:\n${shape}`,
        description: `Registration page copy for the webinar "${webinar.name}".`,
        purpose: "Sales",
        slideCount: "1",
        style: "",
        fontSet: "",
        palette: "",
        ratio: "",
        slides: [],
        selectedSlideId: null,
        messages: [],
        assetContext: studio?.assetContext ?? "",
      });
      if (!res.reply) throw new Error("The AI didn't send page copy back. Please try again.");
      return extractJson(res.reply);
    }),
  );

  const parts = settled.filter((s): s is PromiseFulfilledResult<Record<string, unknown>> => s.status === "fulfilled");
  if (!parts.length) {
    const first = settled.find((s): s is PromiseRejectedResult => s.status === "rejected");
    throw first?.reason instanceof Error ? first.reason : new Error("The AI couldn't write your page. Please try again.");
  }
  const copy = coerceWebinarCopy(Object.assign({}, ...parts.map((p) => p.value)));
  if (!copy.title && !copy.subtitle && !copy.bullets.length && !copy.host_bio) {
    throw new Error("The AI sent back an empty page. Please try again.");
  }
  return copy;
}
