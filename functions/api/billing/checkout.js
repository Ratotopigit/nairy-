/**
 * POST /api/billing/checkout   body: { "plan": "monthly" | "annual" | "lifetime" }
 * Authorization: Bearer <Firebase ID token>
 *
 * Creates a Stripe Checkout Session for the signed-in user and returns its
 * hosted-page URL: { "url": "https://checkout.stripe.com/..." }.
 *
 * The browser is not trusted: the uid comes from the verified token, the price
 * comes from this function's environment, and the return URLs come from
 * APP_URL (never from the request, which would make Checkout an open redirect).
 *
 * Required environment (encrypted variables on Cloudflare Pages):
 *   STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL,
 *   STRIPE_PRICE_LIFETIME, APP_URL
 * plus NEXT_PUBLIC_FIREBASE_API_KEY / NEXT_PUBLIC_FIREBASE_PROJECT_ID, which
 * wrangler.toml already provides at runtime.
 */
import { PLANS, bearerToken, hasPaidAccess, json, stripePost, verifyIdToken } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  const user = await verifyIdToken(request, env);
  if (!user) return json({ error: "Sign in again and retry." }, 401);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }
  const plan = typeof payload?.plan === "string" && Object.hasOwn(PLANS, payload.plan) ? payload.plan : null;
  if (!plan) return json({ error: "Unknown plan." }, 400);

  const { priceVar, mode } = PLANS[plan];
  const priceId = env[priceVar];
  const appUrl = typeof env.APP_URL === "string" ? env.APP_URL.replace(/\/+$/, "") : "";
  if (!env.STRIPE_SECRET_KEY || !priceId || !/^https?:\/\//.test(appUrl)) {
    console.error(`billing/checkout: not configured (need STRIPE_SECRET_KEY, ${priceVar}, APP_URL)`);
    return json({ error: "Payments aren't available right now." }, 503);
  }

  if (await hasPaidAccess(bearerToken(request), user.uid, env)) {
    return json({ error: "You already have a paid plan." }, 409);
  }

  const params = {
    mode,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    client_reference_id: user.uid,
    "metadata[uid]": user.uid,
    "metadata[plan]": plan,
    allow_promotion_codes: "true",
    // Shown next to Stripe's Pay button, so the policy is seen before paying.
    "custom_text[submit][message]":
      mode === "subscription"
        ? "All payments are non-refundable. Cancel anytime; access continues until the end of the paid period."
        : "All payments are non-refundable.",
    success_url: `${appUrl}/provider/billing?status=success`,
    cancel_url: `${appUrl}/provider/billing?status=cancelled`,
  };
  if (user.email) params.customer_email = user.email;
  if (mode === "subscription") {
    // Copied onto the subscription so its later events (renewals, cancellation)
    // can be tied back to the account without a lookup.
    params["subscription_data[metadata][uid]"] = user.uid;
    params["subscription_data[metadata][plan]"] = plan;
  } else {
    // One-time payments only create a Customer if asked; the portal and refunds need one.
    params.customer_creation = "always";
    params["payment_intent_data[metadata][uid]"] = user.uid;
    params["payment_intent_data[metadata][plan]"] = plan;
  }

  let session;
  try {
    session = await stripePost("checkout/sessions", params, env);
  } catch (err) {
    console.error("billing/checkout: Stripe unreachable", err);
    return json({ error: "Couldn't reach the payment provider. Try again." }, 502);
  }
  if (!session.ok || typeof session.body?.url !== "string") {
    console.error("billing/checkout: Stripe refused", session.status, session.body?.error?.type, session.body?.error?.message);
    return json({ error: "Couldn't start checkout. Try again." }, 502);
  }
  return json({ url: session.body.url });
}

/** Anything but POST is not part of this endpoint. */
export function onRequest() {
  return json({ error: "Method not allowed." }, 405);
}
