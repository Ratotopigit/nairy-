/**
 * Cloudflare Pages Function: readable webinar links.
 *
 *   https://webinarstackai.com/<host>/<title>-<webinarId>
 *
 * The site is a static export, so only built paths exist. Two-segment paths
 * reach this function; it serves the real file when there is one (e.g.
 * /provider/webinars) and otherwise, only if the last part ends in a
 * webinar id, serves the public registration page (/w). That page reads the
 * id from the address bar and loads the webinar; a wrong or missing id shows
 * "not available". Nothing here touches the database.
 */
const WEBINAR_PATH = /^\/[a-z0-9-]{1,40}\/(?:[a-z0-9-]*-)?[A-Za-z0-9]{16,40}\/?$/;

export async function onRequest({ request, env }) {
  const asset = await env.ASSETS.fetch(request);
  if (asset.status !== 404) return asset;

  const url = new URL(request.url);
  if (!WEBINAR_PATH.test(url.pathname)) return asset;

  let page = await env.ASSETS.fetch(new Request(new URL("/w", url), request));
  // Pages may answer /w with a redirect to its canonical form; follow it once.
  if (page.status >= 300 && page.status < 400 && page.headers.get("Location")) {
    page = await env.ASSETS.fetch(new Request(new URL(page.headers.get("Location"), url), request));
  }
  if (!page.ok) return asset;

  const headers = new Headers(page.headers);
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  return new Response(page.body, { status: 200, headers });
}
