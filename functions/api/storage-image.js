/**
 * GET /api/storage-image?u=<Firebase Storage download URL>
 *
 * Hands a picture from this project's own Storage back to the browser from the
 * same origin. A browser may show a Storage picture in an <img>, but it may not
 * READ its bytes with fetch(): Storage download links send no CORS headers
 * unless the bucket has been configured for it. Reading the bytes is exactly
 * what a .pptx export needs (the file has to carry the pictures, not links), so
 * without this every exported slide lost its photo.
 *
 * This is not an open proxy. It only fetches:
 *   - https://firebasestorage.googleapis.com/v0/b/<OUR bucket>/o/...
 *   - with the secret `token` that the download URL carries, so a caller can
 *     only fetch a file whose private link they already hold;
 * and only returns a small png/jpeg/webp/gif.
 */
const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPE = /^image\/(png|jpeg|webp|gif)$/i;

function refuse(status, message) {
  return new Response(message, { status, headers: { "Cache-Control": "no-store" } });
}

export async function onRequestGet({ request, env }) {
  const raw = new URL(request.url).searchParams.get("u") || "";
  let target;
  try {
    target = new URL(raw);
  } catch {
    return refuse(400, "Bad link");
  }

  const bucket = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (
    !bucket ||
    target.protocol !== "https:" ||
    target.hostname !== "firebasestorage.googleapis.com" ||
    !target.pathname.startsWith(`/v0/b/${bucket}/o/`) ||
    !target.searchParams.get("token")
  ) {
    return refuse(403, "Not a picture from this project's storage");
  }

  let upstream;
  try {
    upstream = await fetch(target.toString(), { cf: { cacheEverything: true, cacheTtl: 3600 } });
  } catch {
    return refuse(502, "Storage could not be reached");
  }
  if (!upstream.ok) return refuse(upstream.status === 404 ? 404 : 502, "Picture not available");

  const type = (upstream.headers.get("Content-Type") || "").split(";")[0].trim();
  if (!IMAGE_TYPE.test(type)) return refuse(415, "Not a picture");
  const length = Number(upstream.headers.get("Content-Length") || 0);
  if (length > MAX_BYTES) return refuse(413, "Picture is too large");

  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
