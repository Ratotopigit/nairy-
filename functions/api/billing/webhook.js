/**
 * POST /api/billing/webhook   (called by Stripe, never by the browser)
 *
 * 1. Verifies the Stripe-Signature header against the RAW body. Parsing and
 *    re-serialising first would change the bytes and no signature would match.
 * 2. Turns the event into one small "billing update" for one account. It never
 *    trusts the event's snapshot: it fetches the subscription / payment from
 *    Stripe and records how things stand NOW. Events can arrive late, twice or
 *    out of order; this way a replay or a stale event cannot undo a newer one.
 * 3. Hands the update to the n8n "billing-event" workflow (shared-secret
 *    header), which holds the Firestore service account and writes billing/{uid}.
 *
 * Any failure returns a non-2xx, so Stripe retries (with backoff, for days).
 *
 * Required environment: STRIPE_WEBHOOK_SECRET (whsec_...), STRIPE_SECRET_KEY
 * and N8N_BILLING_SECRET (encrypted variables on Cloudflare Pages); the
 * STRIPE_PRICE_* ids and NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL come from wrangler.toml.
 */
import { json, stripeGet } from "./_shared.js";

/** How old a signed event may be before it is treated as a replay. */
const TOLERANCE_SECONDS = 300;

const encoder = new TextEncoder();

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compares two strings without returning early, so timing reveals nothing. */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Stripe's scheme: HMAC-SHA256 of `${t}.${rawBody}`, hex, in one of the v1= entries. */
export async function verifyStripeSignature(rawBody, header, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  let timestamp = null;
  const signatures = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2).map((s) => s?.trim());
    if (key === "t" && /^\d+$/.test(value ?? "")) timestamp = Number(value);
    if (key === "v1" && value) signatures.push(value);
  }
  if (timestamp === null || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${rawBody}`)));
  return signatures.some((sig) => safeEqual(sig, expected));
}

const UID = /^[A-Za-z0-9_-]{1,128}$/;
const idOf = (value) => (typeof value === "string" ? value : value && typeof value.id === "string" ? value.id : "");

/**
 * Stripe moved current_period_end from the subscription onto its items in API
 * version 2025-03-31. Read both, so this works whatever the account is pinned to.
 */
function periodEndIso(sub) {
  let seconds = typeof sub.current_period_end === "number" ? sub.current_period_end : 0;
  for (const item of sub.items?.data ?? []) {
    if (typeof item.current_period_end === "number") seconds = Math.max(seconds, item.current_period_end);
  }
  return seconds ? new Date(seconds * 1000).toISOString() : "";
}

/**
 * The plan comes from the price actually on the subscription, so a switch made
 * in the Customer Portal is picked up. The checkout metadata only says what was
 * bought first; it is the fallback, then the billing interval.
 */
function subscriptionPlan(sub, env) {
  const price = sub.items?.data?.[0]?.price;
  if (price?.id && price.id === env.STRIPE_PRICE_MONTHLY) return "monthly";
  if (price?.id && price.id === env.STRIPE_PRICE_ANNUAL) return "annual";
  const fromMeta = sub.metadata?.plan;
  if (fromMeta === "monthly" || fromMeta === "annual") return fromMeta;
  return price?.recurring?.interval === "year" ? "annual" : "monthly";
}

async function subscriptionUpdate(subscriptionId, env) {
  const sub = await stripeGet(`subscriptions/${encodeURIComponent(subscriptionId)}`, env);
  const uid = sub.metadata?.uid;
  if (!UID.test(uid ?? "")) return null; // not started from our checkout: nothing to attribute it to
  return {
    kind: "subscription",
    uid,
    plan: subscriptionPlan(sub, env),
    status: String(sub.status || ""),
    current_period_end: periodEndIso(sub),
    cancel_at_period_end: sub.cancel_at_period_end === true,
    stripe_customer_id: idOf(sub.customer),
    stripe_subscription_id: sub.id,
  };
}

/** Lifetime is a one-time payment: active while it has succeeded and is not fully refunded. */
async function lifetimeUpdate(paymentIntentId, env, fallbackCustomer = "") {
  const pi = await stripeGet(`payment_intents/${encodeURIComponent(paymentIntentId)}?expand[]=latest_charge`, env);
  const uid = pi.metadata?.uid;
  if (pi.metadata?.plan !== "lifetime" || !UID.test(uid ?? "")) return null;
  const refunded = pi.latest_charge && typeof pi.latest_charge === "object" && pi.latest_charge.refunded === true;
  return {
    kind: "lifetime",
    uid,
    active: pi.status === "succeeded" && !refunded,
    lifetime_ref: pi.id,
    stripe_customer_id: idOf(pi.customer) || fallbackCustomer,
  };
}

/** The subscription an invoice belongs to (moved under `parent` in API 2025-03-31). */
function invoiceSubscription(invoice) {
  return idOf(invoice.subscription) || idOf(invoice.parent?.subscription_details?.subscription);
}

/** Returns the billing update for this event, or null when the event changes nothing we track. */
export async function toBillingUpdate(event, env) {
  const obj = event?.data?.object ?? {};
  switch (event?.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (obj.mode === "subscription" && idOf(obj.subscription)) return subscriptionUpdate(idOf(obj.subscription), env);
      if (obj.mode !== "payment") return null;
      if (idOf(obj.payment_intent)) return lifetimeUpdate(idOf(obj.payment_intent), env, idOf(obj.customer));
      // A 100%-off promo code: Stripe takes no payment, so there is no PaymentIntent.
      const uid = obj.client_reference_id || obj.metadata?.uid;
      if (obj.payment_status === "no_payment_required" && obj.metadata?.plan === "lifetime" && UID.test(uid ?? "")) {
        return { kind: "lifetime", uid, active: true, lifetime_ref: obj.id, stripe_customer_id: idOf(obj.customer) };
      }
      return null;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return subscriptionUpdate(obj.id, env);
    case "invoice.paid":
    case "invoice.payment_failed": {
      const subscriptionId = invoiceSubscription(obj);
      return subscriptionId ? subscriptionUpdate(subscriptionId, env) : null;
    }
    case "charge.refunded":
      return idOf(obj.payment_intent) ? lifetimeUpdate(idOf(obj.payment_intent), env) : null;
    default:
      return null;
  }
}

export async function onRequestPost({ request, env }) {
  const n8nBase = typeof env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL === "string" ? env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL.replace(/\/+$/, "") : "";
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY || !env.N8N_BILLING_SECRET || !n8nBase) {
    console.error("billing/webhook: not configured (need STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, N8N_BILLING_SECRET)");
    return json({ error: "Not configured." }, 503);
  }

  // The exact bytes Stripe signed. Nothing may parse the body before this.
  const raw = await request.text();
  if (!(await verifyStripeSignature(raw, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET))) {
    return json({ error: "Invalid signature." }, 400);
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid payload." }, 400);
  }

  let update;
  try {
    update = await toBillingUpdate(event, env);
  } catch (err) {
    console.error("billing/webhook: Stripe lookup failed for", event.type, event.id, err?.message);
    return json({ error: "Lookup failed." }, 502);
  }
  if (!update) return json({ received: true });

  let res;
  try {
    res = await fetch(`${n8nBase}/billing-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Billing-Secret": env.N8N_BILLING_SECRET },
      body: JSON.stringify({ event_id: String(event.id || ""), event_type: String(event.type || ""), update }),
    });
  } catch (err) {
    console.error("billing/webhook: n8n unreachable", err?.message);
    return json({ error: "Could not record." }, 502);
  }
  if (!res.ok) {
    console.error("billing/webhook: n8n answered", res.status, "for", event.type, event.id);
    return json({ error: "Could not record." }, 502);
  }
  return json({ received: true });
}

export function onRequest() {
  return json({ error: "Method not allowed." }, 405);
}
