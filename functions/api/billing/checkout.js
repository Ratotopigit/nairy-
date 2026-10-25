/**
 * POST /api/billing/checkout
 *   body: { "plan": "monthly" | "annual" | "two_year", "accept_terms": true }
 * Authorization: Bearer <Firebase ID token>
 *
 * Creates a Stripe Checkout Session for the signed-in user and returns its
 * hosted-page URL: { "url": "https://checkout.stripe.com/...", "intro": bool }.
 *
 * Introductory offer: a first-time customer pays the one-time
 * STRIPE_PRICE_INTRO ($1) today and gets a 7-day trial on the plan's regular
 * recurring price, which Stripe then charges on its own interval (month, year, 2 years).
 * Anyone who has subscribed or paid before pays the regular price today.
 *
 * The browser is not trusted: the uid comes from the verified token, the prices
 * come from this function's environment (and are checked against Stripe), and
 * the return URLs come from APP_URL (never from the request, which would make
 * Checkout an open redirect).
 *
 * Required environment: STRIPE_SECRET_KEY (encrypted variable on Cloudflare
 * Pages); STRIPE_PRICE_MONTHLY / _ANNUAL / _TWO_YEAR / _INTRO, APP_URL and the
 * NEXT_PUBLIC_FIREBASE_* values come from wrangler.toml.
 */
import { PLANS, bearerToken, hasPaidAccess, json, readBillingFields, stripeGet, stripePost, verifyIdToken } from "./_shared.js";

export const INTRO_DAYS = 7;

/** "$22.00" from Stripe's minor units. */
function money(unitAmount, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(unitAmount / 100);
}

/** "every month", "every year", "every 3 months". */
function every(recurring) {
  const n = recurring.interval_count || 1;
  return n === 1 ? `every ${recurring.interval}` : `every ${n} ${recurring.interval}s`;
}

/** "November 1, 2026" (UTC, so it matches the date Stripe bills on). */
function longDate(ms) {
  return new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/**
 * First-time customer = nothing in this account's billing record and no Stripe
 * customer with the same email has ever had a subscription. The email is only
 * used to say no: a customer found by email is never attached to this session,
 * because the email of a Firebase account need not be verified.
 * shortcut: one person with a second email gets the offer again; add a card-fingerprint check if that shows up.
 */
export async function introEligible(fields, email, env) {
  const str = (name) => fields?.[name]?.stringValue || "";
  if (str("stripe_customer_id") || str("stripe_subscription_id") || str("lifetime_ref")) return false;
  if (!email) return true;
  const customers = await stripeGet(`customers?email=${encodeURIComponent(email)}&limit=10`, env);
  for (const customer of customers.data ?? []) {
    const subs = await stripeGet(`subscriptions?customer=${encodeURIComponent(customer.id)}&status=all&limit=1`, env);
    if ((subs.data ?? []).length > 0) return false;
  }
  return true;
}

/** Builds the Checkout Session parameters. Exported for the tests. */
export function sessionParams({ user, plan, priceId, appUrl, customer, terms, intro }) {
  const params = {
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    client_reference_id: user.uid,
    "metadata[uid]": user.uid,
    "metadata[plan]": plan,
    allow_promotion_codes: "true",
    // Shown next to Stripe's Pay button, so the exact charges are seen before paying.
    "custom_text[submit][message]": terms,
    success_url: `${appUrl}/provider/billing?status=success`,
    cancel_url: `${appUrl}/provider/billing?status=cancelled`,
  };
  // An earlier purchase's customer, from this account's own record: one customer per account.
  if (customer) params.customer = customer;
  else if (user.email) params.customer_email = user.email;

  // Copied onto the subscription so its later events (renewals, cancellation)
  // can be tied back to the account without a lookup.
  params["subscription_data[metadata][uid]"] = user.uid;
  params["subscription_data[metadata][plan]"] = plan;
  params["subscription_data[metadata][intro]"] = intro ? "1" : "0";
  params["subscription_data[metadata][terms_accepted_at]"] = new Date().toISOString();
  // A reusable card is required even when nothing recurring is due today.
  params.payment_method_collection = "always";
  if (intro) {
    // One-time line item: invoiced now with the trial's $0 invoice, never again.
    params["line_items[1][price]"] = intro.priceId;
    params["line_items[1][quantity]"] = "1";
    params["subscription_data[trial_period_days]"] = String(INTRO_DAYS);
    params["subscription_data[trial_settings][end_behavior][missing_payment_method]"] = "cancel";
  }
  return params;
}

/** The sentence on Stripe's page, from the real Stripe prices. */
export function termsText({ price, introPrice, now = Date.now() }) {
  const regular = money(price.unit_amount, price.currency);
  const cancel = "Cancel anytime in Manage billing; access continues until the end of the paid period. All payments are non-refundable.";
  if (!introPrice) return `You pay ${regular} today and ${regular} ${every(price.recurring)} after that until you cancel. ${cancel}`;
  const firstCharge = longDate(now + INTRO_DAYS * 86_400_000);
  return (
    `You pay ${money(introPrice.unit_amount, introPrice.currency)} today for your first ${INTRO_DAYS} days. ` +
    `Unless you cancel before ${firstCharge}, you'll then be charged ${regular} ${every(price.recurring)} until you cancel. ${cancel}`
  );
}

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
  if (payload.accept_terms !== true) return json({ error: "Please agree to the payment terms first." }, 400);

  const { priceVar } = PLANS[plan];
  const priceId = env[priceVar];
  const appUrl = typeof env.APP_URL === "string" ? env.APP_URL.replace(/\/+$/, "") : "";
  if (!env.STRIPE_SECRET_KEY || !priceId || !env.STRIPE_PRICE_INTRO || !/^https?:\/\//.test(appUrl)) {
    console.error(`billing/checkout: not configured (need STRIPE_SECRET_KEY, ${priceVar}, STRIPE_PRICE_INTRO, APP_URL)`);
    return json({ error: "Payments aren't available right now." }, 503);
  }

  const idToken = bearerToken(request);
  if (await hasPaidAccess(idToken, user.uid, env)) {
    return json({ error: "You already have a paid plan." }, 409);
  }
  const fields = await readBillingFields(idToken, user.uid, env);
  const known = fields?.stripe_customer_id?.stringValue || "";
  const customer = /^cus_[A-Za-z0-9]+$/.test(known) ? known : "";

  let price;
  let intro = null;
  try {
    price = await stripeGet(`prices/${encodeURIComponent(priceId)}`, env);
    if (await introEligible(fields, user.email, env)) {
      intro = await stripeGet(`prices/${encodeURIComponent(env.STRIPE_PRICE_INTRO)}`, env);
    }
  } catch (err) {
    console.error("billing/checkout: Stripe lookup failed", err?.message);
    return json({ error: "Couldn't reach the payment provider. Try again." }, 502);
  }
  // A misconfigured price must never reach a customer: a recurring "intro" would bill $1 forever.
  const recurringOk = price.type === "recurring" && price.recurring?.interval;
  const introOk = !intro || (intro.type === "one_time" && intro.active && intro.currency === price.currency);
  if (!price.active || !recurringOk || !introOk) {
    console.error("billing/checkout: price misconfigured", priceId, price.type, intro?.id, intro?.type);
    return json({ error: "Payments aren't available right now." }, 503);
  }

  const terms = termsText({ price, introPrice: intro });
  const params = sessionParams({ user, plan, priceId, appUrl, customer, terms, intro: intro && { priceId: intro.id } });

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
  return json({ url: session.body.url, intro: Boolean(intro) });
}

/** Anything but POST is not part of this endpoint. */
export function onRequest() {
  return json({ error: "Method not allowed." }, 405);
}
