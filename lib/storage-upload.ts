/**
 * Uploading to and cleaning up Firebase Storage.
 *
 * Every file lives under the signed-in user's own uid (see storage.rules). The
 * download URL that comes back carries a secret token, so it is what gets saved
 * on the webinar or slide that uses the picture: visitors load the image
 * through it without needing any rule, and an unpublished page's pictures stay
 * unguessable.
 *
 * Uploads used to hang with no message when Storage wasn't ready. The SDK keeps
 * retrying for ten minutes by default, so a watchdog stops an upload that has
 * made no progress for STALL_MS and every failure is turned into a sentence the
 * person can act on.
 */
import { deleteObject, getDownloadURL, listAll, ref, uploadBytesResumable } from "firebase/storage";
import { auth, storage } from "@/lib/firebase/config";

/** An error whose message is safe to show to the person using the app. */
export class ImageError extends Error {}

const STALL_MS = 30_000;

function explain(error: unknown): string {
  switch ((error as { code?: string } | null)?.code) {
    case "storage/unauthenticated":
      return "Your sign-in session expired. Please sign in again.";
    case "storage/unauthorized":
      return "Storage refused the upload. Its rules may not be published yet.";
    case "storage/quota-exceeded":
      return "Your storage is full.";
    case "storage/bucket-not-found":
    case "storage/project-not-found":
      return "Firebase Storage isn't set up for this project yet.";
    case "storage/canceled":
      return "The upload stalled and was stopped. Check your connection and try again.";
    case "storage/retry-limit-exceeded":
      return "The upload kept failing. Check your connection and try again.";
    default:
      return "The image couldn't be uploaded. Please try again.";
  }
}

/** `<uid>/<folder>/<file>`: the only shape the storage rules allow. */
export function userPath(...parts: string[]): string {
  const user = auth.currentUser;
  if (!user) throw new ImageError("You need to be signed in to add images.");
  return [user.uid, ...parts].join("/");
}

/** Uploads a file and returns its download URL. Throws ImageError. */
export async function uploadBlob(path: string, blob: Blob, contentType: string): Promise<string> {
  const fileRef = ref(storage, path);
  try {
    await new Promise<void>((resolve, reject) => {
      // File names are unique per upload, so a year of caching is safe.
      const task = uploadBytesResumable(fileRef, blob, { contentType, cacheControl: "public,max-age=31536000" });
      let lastProgress = Date.now();
      const watchdog = window.setInterval(() => {
        if (Date.now() - lastProgress > STALL_MS) task.cancel();
      }, 3000);
      task.on(
        "state_changed",
        () => {
          lastProgress = Date.now();
        },
        (error) => {
          window.clearInterval(watchdog);
          reject(error);
        },
        () => {
          window.clearInterval(watchdog);
          resolve();
        },
      );
    });
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error("storage upload failed:", path, error);
    throw new ImageError(explain(error));
  }
}

/** True for a Firebase Storage download URL (one of ours, or any bucket's). */
export function isStorageUrl(url: string): boolean {
  return /^https:\/\/(firebasestorage\.googleapis\.com|[^/]+\.firebasestorage\.app|storage\.googleapis\.com)\//i.test(url);
}

/** Deletes a file by its download URL. Best effort: never throws. */
export async function deleteByUrl(url: string): Promise<void> {
  if (!isStorageUrl(url)) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (error) {
    console.warn("storage delete skipped:", error);
  }
}

/** Deletes every file under a folder, including subfolders. Best effort. */
export async function deleteFolder(path: string): Promise<void> {
  try {
    const listing = await listAll(ref(storage, path));
    await Promise.all([
      ...listing.items.map((item) => deleteObject(item).catch(() => {})),
      ...listing.prefixes.map((prefix) => deleteFolder(prefix.fullPath)),
    ]);
  } catch (error) {
    console.warn("storage folder cleanup skipped:", path, error);
  }
}
