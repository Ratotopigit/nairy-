import type { ImageKind, Slide } from "@/lib/deck";

/**
 * Resolved slide art, kept OUTSIDE the `slides` array.
 *
 * Two systems write `content_sessions/{project_id}`: this app, and the n8n
 * Webinar Content workflow. The browser strips `image` before sending slides
 * to n8n (so the agent never echoes pixels back) and re-attaches it in memory
 * afterwards — but n8n persists the image-less slides it received. Whichever
 * write lands last won, so decks routinely came back the next day with every
 * picture gone.
 *
 * Rather than coordinate two writers, this removes the contention: n8n's
 * Firestore node writes a fixed column list
 *   project_id,owner_id,blueprint_session_id,status,title,brief,slides,
 *   messages,theme,updated_at
 * and `slide_art` is not in it, so n8n cannot touch this field. Art is saved
 * here and merged back on load, which stays correct even if `slides` is
 * overwritten.
 */
export type SlideArtEntry = {
  image: string;
  imageKind?: ImageKind | null;
};

export type SlideArtMap = Record<string, SlideArtEntry>;

/** Collects the resolved art from a deck, keyed by slide id. */
export function buildSlideArt(slides: Slide[]): SlideArtMap {
  const art: SlideArtMap = {};
  for (const slide of slides) {
    if (!slide?.id || !slide.image) continue;
    art[slide.id] = {
      image: slide.image,
      // Firestore rejects undefined, and an absent kind must not read as
      // "cutout" — that would crop a backdrop photo.
      imageKind: slide.imageKind ?? null,
    };
  }
  return art;
}

/**
 * Re-attaches saved art to slides that lost it. A slide that already carries
 * an image keeps it: a freshly generated picture is newer than the stored one.
 */
export function mergeSlideArt(slides: Slide[], art: unknown): Slide[] {
  if (!art || typeof art !== "object") return slides;
  const map = art as SlideArtMap;
  return slides.map((slide) => {
    if (slide.image) return slide;
    const saved = map[slide.id];
    if (!saved?.image) return slide;
    return {
      ...slide,
      image: saved.image,
      imageKind: slide.imageKind ?? saved.imageKind ?? null,
      useImage: true,
    };
  });
}
