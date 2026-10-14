/**
 * Images for registration pages: upload, find, suggest.
 *
 * Every picture a page shows is a real file in the host's own Firebase Storage
 * (`<uid>/webinars/<id>/…`); the webinar document keeps only its download URL
 * (image_url, portrait_url, logo_url). Pictures are not links to someone else's
 * site and are not packed into the Firestore document.
 *   - every image is resized and re-encoded in the browser first (a phone photo
 *     is often 6 MB; the page needs well under 1 MB), which also drops the
 *     photo's hidden EXIF data (camera, GPS location) before it reaches a
 *     public page;
 *   - a stock photo picked from search is downloaded once through n8n and
 *     stored the same way, because Pixabay's terms don't allow permanent
 *     hot-linking of their image URLs, and a copy never rots.
 *
 * Stock search goes through the existing n8n "deck-art" webhook (the same
 * Pixabay search the slide editor uses), which holds the Pixabay key so it
 * never reaches the browser. It returns one best match per query, so a gallery
 * is built from a few related queries run side by side.
 */
import { auth } from "@/lib/firebase/config";
import { readN8nJson } from "@/lib/n8n-response";
import { n8nWebhookUrl } from "@/lib/n8n-url";
import { ImageError, uploadBlob, userPath } from "@/lib/storage-upload";
import { CATEGORY_PHOTO_TERMS, type TemplateCategory } from "@/lib/webinar-templates";

export { ImageError };

export type ImageKind = "hero" | "portrait" | "logo";

/**
 * `budget` is the encoded size in bytes the picture is squeezed under. Storage
 * has no per-document limit like Firestore's 1 MiB, so these are sized for how
 * the page shows each picture (a full-bleed hero on a large screen needs the
 * most), and storage.rules caps any one file at 5 MB.
 */
export const IMAGE_RULES: Record<ImageKind, { maxSide: number; budget: number; label: string; allowAlpha: boolean }> = {
  hero: { maxSide: 2000, budget: 900_000, label: "photo", allowAlpha: false },
  portrait: { maxSide: 1200, budget: 400_000, label: "portrait", allowAlpha: false },
  logo: { maxSide: 800, budget: 250_000, label: "logo", allowAlpha: true },
};

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const RASTER = /^image\/(png|jpe?g|webp|gif|avif|heic|heif)$/i;

/**
 * Decodes, scales down (never up) and re-encodes. JPEG/WebP for photos; PNG
 * for logos that have transparency. Throws ImageError with a plain message.
 */
export async function prepareImage(file: File, kind: ImageKind): Promise<{ blob: Blob; ext: string; type: string }> {
  if (!RASTER.test(file.type)) {
    throw new ImageError(
      file.type === "image/svg+xml"
        ? "SVG files aren't supported. Please export your logo as a PNG."
        : "Please choose a JPG, PNG or WebP image.",
    );
  }
  if (file.size > MAX_INPUT_BYTES) throw new ImageError("That image is over 12 MB. Please choose a smaller one.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError("That image couldn't be read. Try saving it as a JPG or PNG first.");
  }

  const { maxSide, budget, allowAlpha } = IMAGE_RULES[kind];
  const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  // Try progressively smaller sizes and lower quality until it fits the budget.
  let side = Math.min(maxSide, Math.max(bitmap.width, bitmap.height));
  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new ImageError("Your browser couldn't process that image.");
      // Photos get a white backing so transparent areas don't turn black in JPEG.
      if (!allowAlpha) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, width, height);

      const candidates: { blob: Blob | null; ext: string }[] = [];
      for (const quality of [0.82, 0.7, 0.58, 0.46]) {
        // WebP keeps transparency for logos and is smaller than PNG or JPEG.
        const webp = await toBlob(canvas, "image/webp", quality);
        if (webp && webp.type === "image/webp") candidates.push({ blob: webp, ext: "webp" });
        else if (!allowAlpha) candidates.push({ blob: await toBlob(canvas, "image/jpeg", quality), ext: "jpg" });
        else break;
        const last = candidates[candidates.length - 1].blob;
        if (last && last.size <= budget) return { blob: last, ext: candidates[candidates.length - 1].ext, type: last.type };
      }
      if (allowAlpha && !candidates.length) {
        const png = await toBlob(canvas, "image/png");
        if (png && png.size <= budget) return { blob: png, ext: "png", type: "image/png" };
      }
      side = Math.round(side * 0.8);
      if (side < 160) break;
    }
  } finally {
    bitmap.close();
  }
  throw new ImageError("That image is too detailed to store. Please try a simpler or smaller one.");
}

/**
 * Uploads an already-prepared image to `<uid>/<folder>/` and returns its
 * download URL. `folder` is `webinars/<id>` here; slide images use `decks/<id>`.
 */
export async function storeImage(folder: string, kind: ImageKind, prepared: { blob: Blob; ext: string; type: string }): Promise<string> {
  return uploadBlob(userPath(folder, `${kind}-${Date.now()}.${prepared.ext}`), prepared.blob, prepared.type);
}

export async function uploadWebinarImage(webinarId: string, file: File, kind: ImageKind): Promise<string> {
  return storeImage(`webinars/${webinarId}`, kind, await prepareImage(file, kind));
}

const FIELD_FOR_KIND = { hero: "image_url", portrait: "portrait_url", logo: "logo_url" } as const;

/**
 * Webinars saved before images moved to Storage hold their pictures as data
 * URLs inside the Firestore document. Uploads each one and returns the new
 * download URLs, keyed by webinar field, for the editor to save. A picture that
 * fails to move is left as it was, so nothing is ever lost.
 */
export async function moveInlineImagesToStorage(
  webinarId: string,
  urls: { image_url: string; portrait_url: string; logo_url: string },
): Promise<Partial<typeof urls>> {
  const moved: Partial<typeof urls> = {};
  for (const kind of ["hero", "portrait", "logo"] as const) {
    const field = FIELD_FOR_KIND[kind];
    const current = urls[field];
    if (!current.startsWith("data:image/")) continue;
    try {
      const blob = await (await fetch(current)).blob();
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "webp";
      moved[field] = await storeImage(`webinars/${webinarId}`, kind, { blob, ext, type: blob.type });
    } catch (error) {
      console.warn(`could not move ${field} to storage:`, error);
    }
  }
  return moved;
}

// ── Finding photos ────────────────────────────────────────────────────────

export type StockPhoto = {
  id: number;
  /** Small image for the grid. */
  preview: string;
  /** The large image that gets copied onto the webinar. */
  url: string;
  width: number;
  height: number;
  tags: string;
  /** Photographer, shown with the result. */
  user: string;
  /** Pixabay page for the photo (required link back). */
  page: string;
};

async function post<T>(body: Record<string, unknown>, timeoutMs = 30_000): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ImageError("You need to be signed in to search for photos.");
  const token = await user.getIdToken().catch(() => null);
  if (!token) throw new ImageError("Your sign-in session expired. Please sign in again.");
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(n8nWebhookUrl("deck-art"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    const raw = await readN8nJson<T | T[]>(res, "Photo search");
    return (Array.isArray(raw) ? raw[0] : raw) as T;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new ImageError("The photo search took too long. Please try again.");
    throw e;
  } finally {
    window.clearTimeout(timer);
  }
}

type DeckArtHit = { id: number; url: string; preview: string; width: number; height: number; tags: string; page: string };

/** Related phrasings of one search, so one subject yields several different photos. */
const VARIANTS = ["", " people", " modern", " natural light", " close up", " workspace"];

export async function searchPhotos(query: string, _orientation: "horizontal" | "vertical" | "all" = "horizontal"): Promise<StockPhoto[]> {
  const q = query.trim().slice(0, 80);
  if (!q) return [];
  const settled = await Promise.allSettled(
    VARIANTS.map((v) => post<{ found?: boolean; art?: DeckArtHit | null }>({ mode: "search", query: `${q}${v}`.slice(0, 100), kind: "photo" })),
  );
  if (settled.every((r) => r.status === "rejected")) throw (settled[0] as PromiseRejectedResult).reason;
  const seen = new Set<number>();
  const photos: StockPhoto[] = [];
  for (const r of settled) {
    const art = r.status === "fulfilled" && r.value?.found ? r.value.art : null;
    if (!art || !art.url || seen.has(art.id)) continue;
    seen.add(art.id);
    photos.push({ id: art.id, preview: art.preview || art.url, url: art.url, width: art.width, height: art.height, tags: art.tags ?? "", user: "", page: art.page ?? "" });
  }
  return photos;
}

/**
 * Copies a chosen stock photo into the host's own storage and returns its
 * download URL. The bytes travel through n8n (the CDN sends no CORS headers)
 * and are resized like any upload.
 */
export async function importPhoto(webinarId: string, photo: StockPhoto, kind: ImageKind = "hero"): Promise<string> {
  const data = await post<{ found?: boolean; data_url?: string }>({ mode: "fetch", url: photo.url }, 60_000);
  if (!data?.found || !data.data_url) throw new ImageError("That photo couldn't be downloaded. Please pick another.");
  const blob = await (await fetch(data.data_url)).blob();
  const file = new File([blob], `photo-${photo.id}.jpg`, { type: blob.type || "image/jpeg" });
  return uploadWebinarImage(webinarId, file, kind);
}

// ── "Suggest a relevant image": turn the page's words into search queries ──

const STOPWORDS = new Set(
  (
    "a an the and or but if then than that this these those to of in on at by for with from into onto over under about as is are was were be been being " +
    "it its you your yours we our ours they their them he she his her i me my not no yes do does did done can could will would should shall may might must " +
    "how what when where why who whom which whose more most less least very just also so such own same other another any all each every both few many much " +
    "free live online webinar session class workshop masterclass training learn learning guide complete ultimate best top new step steps way ways make made " +
    "get getting without using use used need needs want wants build building grow growing help helping start starting"
  ).split(/\s+/),
);

/** The few words in a title or subtitle most likely to name its subject. */
export function keywordsFrom(text: string, limit = 3): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const raw of text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/)) {
    if (raw.length < 4 || STOPWORDS.has(raw) || /^\d+$/.test(raw) || seen.has(raw)) continue;
    seen.add(raw);
    words.push(raw);
  }
  // Longer words are usually the more specific nouns ("retirement", "portfolio").
  return words.sort((a, b) => b.length - a.length).slice(0, limit);
}

/**
 * Up to three searches: the category's own photo vocabulary, the page's
 * subject words, and the two combined. Merged and de-duplicated by the caller.
 */
export function suggestionQueries(input: { title: string; subtitle: string; category: TemplateCategory }): string[] {
  const subject = keywordsFrom(`${input.title} ${input.subtitle}`, 3);
  const base = CATEGORY_PHOTO_TERMS[input.category];
  const queries = [base];
  if (subject.length) queries.unshift(subject.slice(0, 2).join(" "));
  if (subject.length) queries.push(`${subject[0]} ${base.split(" ")[0]}`);
  return [...new Set(queries.map((q) => q.trim()).filter(Boolean))].slice(0, 3);
}

/** Runs the suggestion queries and returns a de-duplicated, interleaved list. */
export async function suggestPhotos(input: { title: string; subtitle: string; category: TemplateCategory }): Promise<{ photos: StockPhoto[]; queries: string[] }> {
  const queries = suggestionQueries(input);
  const settled = await Promise.allSettled(queries.map((q) => searchPhotos(q, "horizontal")));
  const lists = settled.map((r) => (r.status === "fulfilled" ? r.value : []));
  if (settled.every((r) => r.status === "rejected")) {
    throw (settled[0] as PromiseRejectedResult).reason;
  }
  const seen = new Set<number>();
  const photos: StockPhoto[] = [];
  for (let i = 0; photos.length < 18 && lists.some((l) => i < l.length); i += 1) {
    for (const list of lists) {
      const p = list[i];
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        photos.push(p);
      }
    }
  }
  return { photos, queries };
}
