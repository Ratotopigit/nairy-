#!/usr/bin/env node
/**
 * READ-ONLY check of the live Stripe account before the billing release.
 * Makes GET requests only; there is no code path here that writes, resends or charges.
 *
 *   node scripts/check-live-stripe.mjs        (asks for the key; a restricted read-only key is enough)
 *
 * Restricted key permissions (Developers > API keys > Create restricted key), all READ:
 * Prices, Products, Webhook Endpoints, Events, Customer portal.
 *
 * Checks:
 *  - the four price ids in wrangler.toml [vars] are live, active, USD and exactly
 *    $1 one-time / $199 every month / $1,188 every year / $1,896 every 2 years;
 *  - the live webhook endpoint for https://webinarstackai.com/api/billing/webhook is
 *    enabled and subscribed to every event the site handles;
 *  - recent live billing events were all delivered (none pending), which shows the production
 *    STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY work with that endpoint today;
 *  - the default Customer portal lets customers cancel at period end, update their card and see invoices.
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = (s) => rl.output.write(s.startsWith(question) ? s : "");
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); process.stdout.write("\n"); resolve(a.trim()); }));
}

const KEY = process.env.STRIPE_LIVE_READ_KEY || (await ask("Live Stripe key, read-only restricted (rk_live_...) or secret (sk_live_...): "));
if (!/^(rk|sk)_live_/.test(KEY)) {
  console.error("This checks the LIVE account: use an rk_live_ (preferred) or sk_live_ key.");
  process.exit(2);
}

async function get(path) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${KEY}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GET ${path.split("?")[0]}: ${body?.error?.message || res.status}`);
  return body;
}

const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
const vars = toml.slice(toml.indexOf("[vars]"), (toml.indexOf("\n[", toml.indexOf("[vars]") + 1) + 1 || toml.length + 1) - 1);
const v = (name) => new RegExp(`^${name} = "([^"]+)"`, "m").exec(vars)?.[1];
const APP_URL = v("APP_URL");

let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};
const tryCheck = async (name, fn) => {
  try {
    await fn();
  } catch (err) {
    check(name, false, err.message);
  }
};

const EXPECT = {
  STRIPE_PRICE_INTRO: { amount: 100, type: "one_time", label: "$1 one-time" },
  STRIPE_PRICE_MONTHLY: { amount: 19900, type: "recurring", interval: "month", count: 1, label: "$199 every month" },
  STRIPE_PRICE_ANNUAL: { amount: 118800, type: "recurring", interval: "year", count: 1, label: "$1,188 every year" },
  STRIPE_PRICE_TWO_YEAR: { amount: 189600, type: "recurring", interval: "year", count: 2, label: "$1,896 every 2 years" },
};
for (const [name, e] of Object.entries(EXPECT)) {
  await tryCheck(`${name} = ${e.label}`, async () => {
    const id = v(name);
    if (!id) throw new Error("missing from wrangler.toml [vars]");
    const p = await get(`prices/${encodeURIComponent(id)}?expand[]=product`);
    const ok = p.livemode === true && p.active && p.currency === "usd" && p.unit_amount === e.amount && p.type === e.type &&
      (e.type === "one_time" || (p.recurring?.interval === e.interval && (p.recurring?.interval_count || 1) === e.count)) &&
      p.product?.active !== false;
    const got = `${p.livemode ? "live" : "TEST"}, ${p.active ? "active" : "INACTIVE"}, ${p.unit_amount / 100} ${p.currency}, ${p.type}${p.recurring ? ` every ${p.recurring.interval_count || 1} ${p.recurring.interval}` : ""}, product "${p.product?.name}"`;
    check(`${name} = ${e.label}`, ok, got);
  });
}

const HANDLED = [
  "checkout.session.completed", "checkout.session.async_payment_succeeded", "customer.subscription.created",
  "customer.subscription.updated", "customer.subscription.deleted", "invoice.paid", "invoice.payment_failed", "charge.refunded",
];
const hookUrl = `${APP_URL.replace(/\/+$/, "")}/api/billing/webhook`;
await tryCheck("live webhook endpoint", async () => {
  const hooks = (await get("webhook_endpoints?limit=100")).data.filter((w) => w.url === hookUrl);
  const enabled = hooks.filter((w) => w.status === "enabled");
  check(`one enabled live endpoint for ${hookUrl}`, enabled.length === 1, `${hooks.length} found, ${enabled.length} enabled`);
  const events = enabled[0]?.enabled_events ?? [];
  const missing = events.includes("*") ? [] : HANDLED.filter((e) => !events.includes(e));
  check("endpoint subscribed to every handled event", enabled.length > 0 && missing.length === 0, missing.length ? `missing ${missing.join(", ")}` : "all 8");
});

await tryCheck("recent live billing events delivered", async () => {
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;
  const events = [];
  let after = "";
  for (let page = 0; page < 5; page++) {
    const r = await get(`events?created[gte]=${since}&limit=100${after ? `&starting_after=${after}` : ""}`);
    events.push(...r.data);
    if (!r.has_more) break;
    after = r.data[r.data.length - 1].id;
  }
  const billing = events.filter((e) => HANDLED.includes(e.type));
  const pending = billing.filter((e) => e.pending_webhooks > 0);
  check("recent live billing events delivered (production secrets work)", pending.length === 0,
    billing.length ? `${billing.length} events in 30 days, ${pending.length} pending` : "no billing events in 30 days: not provable, see the dashboard's last delivery");
});

await tryCheck("Customer portal", async () => {
  const cfg = (await get("billing_portal/configurations?is_default=true&active=true&limit=1")).data[0];
  const f = cfg?.features ?? {};
  check("Customer portal: cancel at period end", f.subscription_cancel?.enabled === true && f.subscription_cancel?.mode === "at_period_end", f.subscription_cancel ? `${f.subscription_cancel.enabled ? "on" : "off"}, ${f.subscription_cancel.mode}` : "no default configuration");
  check("Customer portal: update card", f.payment_method_update?.enabled === true);
  check("Customer portal: invoice history", f.invoice_history?.enabled === true);
});

console.log(failed ? `\n${failed} check(s) failed: NO-GO until fixed.` : "\nLive Stripe configuration matches the release.");
process.exit(failed ? 1 : 0);
