/**
 * Shared helpers for the billing Pages Functions (functions/api/billing/*).
 *
 * Everything here runs on Cloudflare's edge, never in the browser. Secrets
 * (STRIPE_SECRET_KEY, ...) come only from the function's environment. This
 * file exports no onRequest handler, so Pages does not turn it into a route.
 */
import { hasAccess } from "./_entitlement.js";

/**
 * The plans on sale, all subscriptions. Price ids come from the environment;
 * the browser only names a plan. Lifetime is no longer sold, but accounts that
 * bought it keep it (hasPaidAccess, the webhook and n8n still handle it).
 */
export const PLANS = {
  monthly: { priceVar: "STRIPE_PRICE_MONTHLY" },
  annual: { priceVar: "STRIPE_PRICE_ANNUAL" },
  two_year: { priceVar: "STRIPE_PRICE_TWO_YEAR" },
};

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * Verifies the caller's Firebase ID token with Google's accounts:lookup (the
 * same check the n8n workflows use) and returns who they are. The uid always
 * comes from here, never from the request body.
 * Returns { uid, email } or null.
 */
export async function verifyIdToken(request, env) {
  const header = request.headers.get("Authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!match || !apiKey) return null;

  let res;
  try {
    res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: match[1] }),
      },
    );
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const user = data && Array.isArray(data.users) ? data.users[0] : null;
  if (!user || typeof user.localId !== "string" || !user.localId) return null;
  if (user.disabled) return null;
  return { uid: user.localId, email: typeof user.email === "string" ? user.email : "" };
}

/** Plain values from Firestore REST fields (strings, booleans, timestamps as ISO, integers as numbers). */
export function restPlain(fields = {}) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = v.stringValue ?? v.booleanValue ?? v.timestampValue ?? (v.integerValue !== undefined ? Number(v.integerValue) : undefined);
  }
  return out;
}

/** The caller's raw ID token (verifyIdToken has already checked it). */
export function bearerToken(request) {
  return (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
}

/**
 * Reads billing/{uid} through the Firestore REST API with the user's OWN ID
 * token, so the security rules decide (owner read) and no service account is
 * needed here. Returns the document's REST `fields`, or null when there is no
 * document or the read does not work.
 */
export async function readBillingFields(idToken, uid, env) {
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/billing/${encodeURIComponent(uid)}`,
      { headers: { Authorization: `Bearer ${idToken}` } },
    );
    if (!res.ok) return null;
    return (await res.json())?.fields || {};
  } catch {
    return null;
  }
}

/**
 * Does this account already have paid access? Same rule as everywhere else
 * (_entitlement.js). Fails open (returns false) when the read does not work, e.g.
 * the rules are not deployed yet: a duplicate purchase can be refunded, a
 * blocked sale cannot be recovered.
 */
export async function hasPaidAccess(idToken, uid, env) {
  const fields = await readBillingFields(idToken, uid, env);
  return fields ? hasAccess(restPlain(fields)) : false;
}

/** GET from the Stripe REST API. Throws on any non-2xx, so callers fail loudly. */
export async function stripeGet(path, env) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${body?.error?.message || "request failed"}`);
  return body;
}

/** POST a form-encoded body to the Stripe REST API. Returns { ok, status, body }. */
export async function stripePost(path, params, env) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}
