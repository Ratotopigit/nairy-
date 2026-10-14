/**
 * Slide pictures live in the user's own Firebase Storage (`<uid>/decks/<id>/`).
 *
 * A slide used to keep whatever it was given: a Pixabay link from the deck
 * workflow (which can rot and which Pixabay's terms don't allow keeping as a
 * permanent hot-link) or a base64 copy of an uploaded file (which swelled the
 * deck document towards Firestore's 1 MiB limit and the browser's local
 * storage quota). Now the picture is copied into Storage once and the slide
 * holds its short download URL.
 */
import type { ImageKind } from "@/lib/deck";
import { fetchArtAsDataUrl } from "@/lib/deck-art";
import { auth } from "@/lib/firebase/config";
import { imageToBlob } from "@/lib/image";
import { ImageError, isStorageUrl, uploadBlob, userPath } from "@/lib/storage-upload";

/** True for a slide picture that is a link to another site or an inline copy. */
export function needsStoring(src: string | null | undefined): src is string {
  if (!src || isStorageUrl(src)) return false;
  return src.startsWith("data:image/") || /^https?:/i.test(src);
}

function randomName(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Copies one slide picture into Storage and returns its download URL.
 * `src` is a link (fetched through the deck-art webhook, because the stock CDN
 * sends no CORS headers) or a data URL. Throws ImageError.
 */
export async function storeSlideImage(
  projectId: string,
  src: string,
  options: { kind?: ImageKind | null; keepAlpha?: boolean } = {},
): Promise<string> {
  if (!auth.currentUser) throw new ImageError("You need to be signed in to add images.");
  const dataUrl = src.startsWith("data:") ? src : await fetchArtAsDataUrl(src).catch(() => null);
  if (!dataUrl) throw new ImageError("That image couldn't be downloaded.");

  const keepAlpha = options.keepAlpha ?? options.kind === "cutout";
  let blob: Blob;
  try {
    blob = await imageToBlob(dataUrl, { keepAlpha });
  } catch {
    throw new ImageError("That image couldn't be read. Try a JPG or PNG.");
  }
  const ext = blob.type === "image/png" ? "png" : "jpg";
  return uploadBlob(userPath("decks", projectId || "unsaved", `${randomName()}.${ext}`), blob, blob.type);
}

/** Uploads a file the user picked for a slide. PNGs keep their transparency. */
export async function uploadSlideFile(projectId: string, file: File): Promise<string> {
  if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) throw new ImageError("Please choose a JPG, PNG or WebP image.");
  if (file.size > 12 * 1024 * 1024) throw new ImageError("That image is over 12 MB. Please choose a smaller one.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ImageError("The image couldn't be read."));
    reader.readAsDataURL(file);
  });
  return storeSlideImage(projectId, dataUrl, { keepAlpha: file.type === "image/png" });
}
