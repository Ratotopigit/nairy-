/**
 * Client for the `deck-art` n8n webhook.
 *
 * The deck agent decides *what* art a slide wants (a query and a kind); this
 * module resolves that intent to real pixels. Two calls, matching the two modes
 * the workflow exposes:
 *
 *   search — query -> the best Pixabay match, as a URL we store on the slide.
 *   fetch  — that URL -> a base64 data URL, so an exported .pptx carries the
 *            bytes rather than a link that rots or fails offline.
 *
 * Both go through n8n rather than the browser because the Pixabay key has to
 * stay server-side, and because cdn.pixabay.com sends no CORS headers — a
 * direct fetch would taint the canvas and give pptxgenjs nothing to embed.
 */
import type { ImageKind, Slide } from "./deck";
import { fitForSlide } from "./image";
import { readN8nJson } from "./n8n-response";
import { auth } from "./firebase/config";
import { n8nWebhookUrl } from "@/lib/n8n-url";

const ART_TIMEOUT_MS = 30_000;

export type ResolvedArt = {
  id: number;
  url: string;
  preview: string;
  width: number;
  height: number;
  tags: string;
  page: string;
};

type SearchResponse = { found?: boolean; art?: ResolvedArt | null };
type FetchResponse = { found?: boolean; data_url?: string; mime_type?: string; error?: string };

async function postDeckArt<T>(body: Record<string, unknown>): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You need to be signed in to add images to a deck.");
  }

  const token = await currentUser.getIdToken().catch(() => null);
  if (!token) {
    throw new Error("Your sign-in session expired. Please sign in again.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ART_TIMEOUT_MS);

  try {
    const res = await fetch(n8nWebhookUrl("deck-art"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    const raw = await readN8nJson<T | T[]>(res, "Deck Art workflow");
    return (Array.isArray(raw) ? raw[0] : raw) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Resolves a search term to one image URL. Returns null when nothing suitable
 * exists — for a cutout that is common and expected, since the workflow only
 * keeps transparent PNGs. An empty slide beats a bad stock photo.
 */
export async function searchDeckArt(query: string, kind: ImageKind): Promise<ResolvedArt | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const data = await postDeckArt<SearchResponse>({ mode: "search", query: trimmed, kind });
  return data?.found && data.art ? data.art : null;
}

/** Turns one stored Pixabay URL into a base64 data URL. */
export async function fetchArtAsDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  const data = await postDeckArt<FetchResponse>({ mode: "fetch", url });
  return data?.found && data.data_url ? data.data_url : null;
}

/**
 * Inlines every remote slide image ahead of a pptx export.
 *
 * pptxgenjs can take a remote `path:`, but that leaves a link in the file and
 * fails on CORS in the browser, so slides come out blank. Embedding base64 is
 * the only way the downloaded deck is self-contained.
 *
 * A slide whose fetch fails keeps its remote URL: the export still succeeds and
 * simply drops that one image, which beats failing the whole download.
 */
export async function resolveArtForExport(slides: Slide[]): Promise<Slide[]> {
  const remote = new Set<string>();
  for (const slide of slides) {
    const src = slide.image;
    if (src && /^https?:/i.test(src)) remote.add(src);
  }
  if (!remote.size) return slides;

  // A URL can sit on several slides; resolve each one once. Kind is taken from
  // the first slide using it, which is what decides PNG-with-alpha vs JPEG.
  const kindFor = new Map<string, ImageKind>();
  for (const slide of slides) {
    const src = slide.image;
    if (src && remote.has(src) && !kindFor.has(src)) {
      kindFor.set(src, slide.imageKind ?? "photo");
    }
  }

  const urls = [...remote];
  const settled = await Promise.all(
    urls.map(async (url) => {
      const dataUrl = await fetchArtAsDataUrl(url).catch(() => null);
      if (!dataUrl) return null;
      return fitForSlide(dataUrl, { cutout: kindFor.get(url) === "cutout" });
    }),
  );

  const inlined = new Map<string, string>();
  urls.forEach((url, i) => {
    const dataUrl = settled[i];
    if (dataUrl) inlined.set(url, dataUrl);
  });
  if (!inlined.size) return slides;

  return slides.map((slide) => {
    const src = slide.image;
    const dataUrl = src ? inlined.get(src) : undefined;
    return dataUrl ? { ...slide, image: dataUrl } : slide;
  });
}
