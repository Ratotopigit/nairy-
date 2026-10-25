/**
 * POST /api/billing/eligibility
 * Authorization: Bearer <Firebase ID token>
 *
 * Read-only: does the signed-in user qualify for the $1 / 7-day introductory
 * offer? Answers { "intro": true | false } with the exact rule checkout uses
 * (introEligible in checkout.js), so the Billing page can label its buttons
 * accurately. Creates and changes nothing.
 */
import { introEligible } from "./checkout.js";
import { json, readBillingFields, bearerToken, verifyIdToken } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  const user = await verifyIdToken(request, env);
  if (!user) return json({ error: "Sign in again and retry." }, 401);
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Payments aren't available right now." }, 503);
  try {
    const fields = await readBillingFields(bearerToken(request), user.uid, env);
    return json({ intro: await introEligible(fields, user.email, env) });
  } catch (err) {
    console.error("billing/eligibility: Stripe lookup failed", err?.message);
    return json({ error: "Couldn't check the trial offer. Try again." }, 502);
  }
}

export function onRequest() {
  return json({ error: "Method not allowed." }, 405);
}
