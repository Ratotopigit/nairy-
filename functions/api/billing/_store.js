/**
 * Records billing updates in Firestore billing/{uid} directly from the
 * webhook, with a Firebase service account (FIREBASE_SERVICE_ACCOUNT, the
 * service account's JSON key as an encrypted Cloudflare Pages variable).
 *
 * This replaces the n8n "17 - Billing Event" workflow: mergeBilling() is its
 * "Merge Billing State" node, line for line, and the write uses the same
 * fields. Unlike n8n, the write carries a precondition on the document's
 * updateTime, so two events for one account arriving at once cannot overwrite
 * each other; the loser re-reads and merges again.
 *
 * Exports no onRequest handler, so Pages does not turn it into a route.
 */
import { restPlain } from "./_shared.js";

const FIELDS = [
  "uid", "plan", "status", "current_period_end", "cancel_at_period_end",
  "stripe_customer_id", "stripe_subscription_id", "lifetime_ref", "last_event_id", "updated_at", "access_until",
];
const PLAN_IDS = ["monthly", "annual", "two_year", "lifetime"];
const PAID = ["active", "trialing", "past_due"];

/**
 * Applies one billing update to the current record. The update already
 * reflects Stripe's CURRENT state, so it is normally recorded as sent. Two
 * guards stop an unrelated event from overwriting a newer truth:
 *  - a subscription event never touches an account with Lifetime access;
 *  - an old, no-longer-paying subscription never replaces a different one
 *    that is still paid.
 * A lifetime revoke only applies to the purchase that granted it.
 * Beyond n8n's version, it also records access_until (see _entitlement.js).
 * Returns { write, reason, doc }.
 */
export function mergeBilling(cur, u, eventId, now = Date.now()) {
  const str = (v) => (typeof v === "string" ? v : "");
  const ms = (v) => { const t = Date.parse(str(v)); return Number.isFinite(t) ? t : 0; };
  const paying = (status, end) => PAID.includes(status) && ms(end) > now;

  const doc = {
    uid: u.uid,
    plan: PLAN_IDS.includes(cur.plan) ? cur.plan : "none",
    status: str(cur.status),
    current_period_end: str(cur.current_period_end),
    cancel_at_period_end: cur.cancel_at_period_end === true,
    stripe_customer_id: str(cur.stripe_customer_id),
    stripe_subscription_id: str(cur.stripe_subscription_id),
    lifetime_ref: str(cur.lifetime_ref),
    access_until: str(cur.access_until),
  };

  let write = false;
  let reason = "";
  if (u.kind === "lifetime") {
    if (u.active) {
      Object.assign(doc, {
        plan: "lifetime", status: "lifetime", current_period_end: "", cancel_at_period_end: false, access_until: "",
        lifetime_ref: u.lifetime_ref, stripe_customer_id: u.stripe_customer_id || doc.stripe_customer_id,
      });
      write = true; reason = "lifetime granted";
    } else if (doc.plan === "lifetime" && doc.lifetime_ref === u.lifetime_ref) {
      Object.assign(doc, { plan: "none", status: "refunded", access_until: "" });
      write = true; reason = "lifetime revoked (refunded)";
    } else {
      reason = "inactive lifetime payment that is not the recorded one: ignored";
    }
  } else if (doc.plan === "lifetime") {
    reason = "account has lifetime access: subscription event ignored";
  } else if (doc.stripe_subscription_id && doc.stripe_subscription_id !== u.stripe_subscription_id
    && paying(doc.status, doc.current_period_end) && !paying(u.status, u.current_period_end)) {
    reason = "a different subscription is still paid: ignored";
  } else {
    Object.assign(doc, {
      plan: u.plan, status: u.status, current_period_end: u.current_period_end,
      cancel_at_period_end: u.cancel_at_period_end, stripe_subscription_id: u.stripe_subscription_id,
      stripe_customer_id: u.stripe_customer_id || doc.stripe_customer_id,
      access_until: typeof u.access_until === "string" ? u.access_until : "",
    });
    write = true; reason = "subscription recorded";
  }

  doc.last_event_id = eventId;
  doc.updated_at = new Date(now).toISOString();
  return { write, reason, doc };
}

const encoder = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

let cachedToken = null; // { key, token, exp } for this isolate

/** OAuth access token for the service account (JWT bearer grant), cached until shortly before it expires. */
export async function serviceAccountToken(env, nowSeconds = Math.floor(Date.now() / 1000)) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  // The key must belong to the project this deployment writes to.
  if (sa.project_id && sa.project_id !== env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    throw new Error(`service account is for ${sa.project_id}, not ${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
  }
  if (cachedToken && cachedToken.key === sa.client_email && cachedToken.exp - 60 > nowSeconds) return cachedToken.token;

  const pem = String(sa.private_key).replace(/-----[^-]+-----|\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const header = b64url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = b64url(encoder.encode(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  })));
  const signature = b64url(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(`${header}.${claims}`)));

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claims}.${signature}` }).toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || typeof body.access_token !== "string") throw new Error(`Google token ${res.status}: ${body.error || "failed"}`);
  cachedToken = { key: sa.client_email, token: body.access_token, exp: nowSeconds + (Number(body.expires_in) || 3600) };
  return body.access_token;
}

function encode(doc) {
  const fields = {};
  for (const k of FIELDS) fields[k] = typeof doc[k] === "boolean" ? { booleanValue: doc[k] } : { stringValue: String(doc[k] ?? "") };
  return fields;
}

/**
 * Loads billing/{uid}, merges the update and writes it, retrying when another
 * write landed in between. Throws on any failure, so the webhook answers Stripe
 * with an error and Stripe retries the event later.
 */
export async function recordBillingUpdate(update, eventId, env) {
  const project = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const name = `projects/${project}/databases/(default)/documents/billing/${update.uid}`;
  // Local verification only: the Firestore emulator accepts the "owner" token. Never set in production.
  const emulator = /^(127\.0\.0\.1|localhost):\d+$/.test(env.FIRESTORE_EMULATOR_HOST || "") ? env.FIRESTORE_EMULATOR_HOST : "";
  const base = emulator ? `http://${emulator}/v1/` : "https://firestore.googleapis.com/v1/";
  const token = emulator ? "owner" : await serviceAccountToken(env);
  const auth = { Authorization: `Bearer ${token}` };

  for (let attempt = 0; attempt < 3; attempt++) {
    const read = await fetch(base + name, { headers: auth });
    if (!read.ok && read.status !== 404) throw new Error(`Could not read billing/${update.uid}: ${read.status}`);
    const existing = read.ok ? await read.json() : null;

    const result = mergeBilling(restPlain(existing?.fields), update, eventId);
    if (!result.write) return result;

    const res = await fetch(`${base}projects/${project}/databases/(default)/documents:commit`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [{
          update: { name, fields: encode(result.doc) },
          updateMask: { fieldPaths: FIELDS },
          currentDocument: existing ? { updateTime: existing.updateTime } : { exists: false },
        }],
      }),
    });
    if (res.ok) return result;
    // Precondition failed: someone wrote in between. Read again and re-merge.
    if (res.status !== 409 && res.status !== 400) throw new Error(`Could not write billing/${update.uid}: ${res.status}`);
    const err = await res.json().catch(() => ({}));
    if (res.status === 400 && err?.error?.status !== "FAILED_PRECONDITION") throw new Error(`Could not write billing/${update.uid}: ${err?.error?.message || 400}`);
  }
  throw new Error(`billing/${update.uid} kept changing; giving up so Stripe retries`);
}
