/**
 * Images for registration pages: upload, find, suggest.
 *
 * Everything a page shows lives in the host's OWN Firebase Storage:
 *   - uploads are resized in the browser first (a phone photo is often 6MB;
 *     the page needs ~300KB), which also drops the photo's hidden EXIF data
 *     (camera, GPS location) before it reaches a public page;
 *   - a stock photo picked from search is downloaded once through n8n and
 *     stored the same way, because Pixabay's terms don't allow permanent
 *     hot-linking of their image URLs, and a copy never rots.
 *
 * Stock search goes through the existing n8n "deck-art" webhook (the same
 * Pixabay search the slide editor uses), which holds the Pixabay key so it
 * never reaches the browser. It returns one best match per query, so a gallery
 * is built from a few related queries run side by side.
 */
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "@/lib/firebase/config";
import { readN8nJson } from "@/lib/n8n-response";
import { n8nWebhookUrl } from "@/lib/n8n-url";
import { CATEGORY_PHOTO_TERMS, type TemplateCategory } from "@/lib/webinar-templates";

export type ImageKind = "hero" | "portrait" | "logo";

export const IMAGE_RULES: Record<ImageKind, { maxSide: number; label: string; allowAlpha: boolean }> = {
  hero: { maxSide: 2200, label: "photo", allowAlpha: false },
  portrait: { maxSide: 1400, label: "portrait", allowAlpha: false },
  logo: { maxSide: 720, label: "logo", allowAlpha: true },
};

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const RASTER = /^image\/(png|jpe?g|webp|gif|avif|heic|heif)$/i;

export class ImageError extends Error {}

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

  const { maxSide, allowAlpha } = IMAGE_RULES[kind];
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
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
  bitmap.close();

  const toBlob = (type: string, quality?: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  if (allowAlpha) {
    const png = await toBlob("image/png");
    if (png) return { blob: png, ext: "png", type: "image/png" };
  } else {
    const webp = await toBlob("image/webp", 0.86);
    if (webp && webp.type === "image/webp") return { blob: webp, ext: "webp", type: "image/webp" };
    const jpeg = await toBlob("image/jpeg", 0.88);
    if (jpeg) return { blob: jpeg, ext: "jpg", type: "image/jpeg" };
  }
  throw new ImageError("Your browser couldn't process that image.");
}

/** Stores an already-prepared image under the host's folder and returns its public URL. */
export async function storeImage(webinarId: string, kind: ImageKind, prepared: { blob: Blob; ext: string; type: string }): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new ImageError("You need to be signed in to add images.");
  // Owner-only folder (storage.rules require it); the download URL carries an
  // access token, so visitors can still see the image on the public page.
  const fileRef = ref(storage, `${user.uid}/webinars/${webinarId}/${kind}-${Date.now()}.${prepared.ext}`);
  await uploadBytes(fileRef, prepared.blob, { contentType: prepared.type, cacheControl: "public,max-age=31536000" });
  return getDownloadURL(fileRef);
}

export async function uploadWebinarImage(webinarId: string, file: File, kind: ImageKind): Promise<string> {
  return storeImage(webinarId, kind, await prepareImage(file, kind));
}

// ── Finding photos ────────────────────────────────────────────────────────

export type StockPhoto = {
  id: number;
  /** Small image for the grid. */
  preview: string;
  /** The large image that gets copied into the host's storage. */
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
 * Copies a chosen stock photo into the host's storage and returns its URL.
 * The bytes travel through n8n (the CDN sends no CORS headers), are resized
 * like any upload, and are then stored under the host's own folder.
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
