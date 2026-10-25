#!/usr/bin/env node
/**
 * Smoke test of the billing functions inside Cloudflare's runtime (workerd):
 *   npm run build && npx wrangler pages dev out --port 8788   (with a local .dev.vars)
 *   node scripts/workers-smoke.mjs [http://127.0.0.1:8788]
 * .dev.vars needs STRIPE_WEBHOOK_SECRET=whsec_local_only, an sk_test_ placeholder key,
 * a throwaway FIREBASE_SERVICE_ACCOUNT and a NON-production NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * (test mode refuses the production project). Sends no payment
 * and reaches no real account: Stripe answers the fake key with 401.
 */
import { createHmac } from "node:crypto";

const BASE = (process.argv[2] || "http://127.0.0.1:8788").replace(/\/+$/, "");
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_local_only";
let failed = 0;

async function expect(name, res, status) {
  const ok = res.status === status;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: ${res.status}${ok ? "" : ` (wanted ${status}) ${await res.text()}`}`);
}

function signed(event) {
  const raw = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", SECRET).update(`${t}.${raw}`).digest("hex");
  return { method: "POST", headers: { "Stripe-Signature": `t=${t},v1=${v1}` }, body: raw };
}

await expect("checkout without sign-in", await fetch(`${BASE}/api/billing/checkout`, { method: "POST", body: "{}" }), 401);
await expect("portal without sign-in", await fetch(`${BASE}/api/billing/portal`, { method: "POST" }), 401);
await expect("webhook GET", await fetch(`${BASE}/api/billing/webhook`), 405);
await expect("webhook, forged signature", await fetch(`${BASE}/api/billing/webhook`, { method: "POST", headers: { "Stripe-Signature": "t=1,v1=00" }, body: "{}" }), 400);
await expect("webhook, signed untracked event (HMAC verified in workerd)", await fetch(`${BASE}/api/billing/webhook`, signed({ id: "evt_smoke", type: "customer.created", data: { object: {} } })), 200);
// Reaches Stripe with the fake key, gets 401, and must answer 502 so Stripe would retry.
await expect("webhook, Stripe lookup fails -> retryable error", await fetch(`${BASE}/api/billing/webhook`, signed({ id: "evt_smoke2", type: "invoice.paid", data: { object: { subscription: "sub_smoke" } } })), 502);
await expect("billing page is served", await fetch(`${BASE}/provider/billing/`), 200);

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
