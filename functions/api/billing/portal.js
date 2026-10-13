/**
 * POST /api/billing/portal
 * Authorization: Bearer <Firebase ID token>
 *
 * Returns a Stripe Customer Portal link ({ "url": ... }) where the signed-in
 * user can cancel, change card and download invoices. The Stripe customer is
 * the one recorded in the user's own billing/{uid} (read with their token, so
 * the rules decide); nothing in the request can point at someone else's.
 *
 * Needs the portal switched on in Stripe (Settings > Billing > Customer portal)
 * and STRIPE_SECRET_KEY + APP_URL in the environment.
 */
import { bearerToken, json, readBillingFields, stripePost, verifyIdToken } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  const user = await verifyIdToken(request, env);
  if (!user) return json({ error: "Sign in again and retry." }, 401);

  const appUrl = typeof env.APP_URL === "string" ? env.APP_URL.replace(/\/+$/, "") : "";
  if (!env.STRIPE_SECRET_KEY || !/^https?:\/\//.test(appUrl)) {
    console.error("billing/portal: not configured (need STRIPE_SECRET_KEY, APP_URL)");
    return json({ error: "Billing management isn't available right now." }, 503);
  }

  const fields = await readBillingFields(bearerToken(request), user.uid, env);
  const customer = fields?.stripe_customer_id?.stringValue;
  if (!customer || !/^cus_[A-Za-z0-9]+$/.test(customer)) {
    return json({ error: "There's no billing account to manage yet." }, 404);
  }

  let session;
  try {
    session = await stripePost("billing_portal/sessions", { customer, return_url: `${appUrl}/provider/billing` }, env);
  } catch (err) {
    console.error("billing/portal: Stripe unreachable", err);
    return json({ error: "Couldn't reach the payment provider. Try again." }, 502);
  }
  if (!session.ok || typeof session.body?.url !== "string") {
    console.error("billing/portal: Stripe refused", session.status, session.body?.error?.type, session.body?.error?.message);
    return json({ error: "Couldn't open billing management. Try again." }, 502);
  }
  return json({ url: session.body.url });
}

export function onRequest() {
  return json({ error: "Method not allowed." }, 405);
}
