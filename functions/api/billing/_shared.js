/**
 * Shared helpers for the billing Pages Functions (functions/api/billing/*).
 *
 * Everything here runs on Cloudflare's edge, never in the browser. Secrets
 * (STRIPE_SECRET_KEY, ...) come only from the function's environment. This
 * file exports no onRequest handler, so Pages does not turn it into a route.
 */

/** The three plans. Prices are looked up server-side; the browser only names a plan. */
export const PLANS = {
  monthly: { priceVar: "STRIPE_PRICE_MONTHLY", mode: "subscription" },
  annual: { priceVar: "STRIPE_PRICE_ANNUAL", mode: "subscription" },
  lifetime: { priceVar: "STRIPE_PRICE_LIFETIME", mode: "payment" },
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

/** Milliseconds from a Firestore REST value (timestamp, ISO string or integer), else null. */
function restMillis(value) {
  if (!value) return null;
  if (value.integerValue !== undefined) {
    // Unix seconds (Stripe's own format) or milliseconds.
    const n = Number(value.integerValue);
    if (!Number.isFinite(n)) return null;
    return n < 1e11 ? n * 1000 : n;
  }
  const ms = Date.parse(value.timestampValue ?? value.stringValue ?? "");
  return Number.isFinite(ms) ? ms : null;
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
 * Does this account already have paid access? Mirrors isPaid() in
 * lib/billing.ts. Fails open (returns false) when the read does not work, e.g.
 * the rules are not deployed yet: a duplicate purchase can be refunded, a
 * blocked sale cannot be recovered.
 */
export async function hasPaidAccess(idToken, uid, env) {
  const fields = await readBillingFields(idToken, uid, env);
  if (!fields) return false;
  const plan = fields.plan?.stringValue;
  const status = fields.status?.stringValue;
  if (plan === "lifetime") return true;
  const end = restMillis(fields.current_period_end);
  return ["active", "trialing", "past_due"].includes(status) && end !== null && end > Date.now();
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
