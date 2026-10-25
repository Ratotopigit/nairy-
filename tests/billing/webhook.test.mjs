import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost } from "../../functions/api/billing/webhook.js";
import { mergeBilling } from "../../functions/api/billing/_store.js";
import { ENV, PRICES, fakeFirestore, mockFetch, now, serviceAccount, sign, subscription } from "./helpers.mjs";

let SA;
let DIRECT_ENV;
before(async () => {
  SA = await serviceAccount();
  DIRECT_ENV = { ...ENV, FIREBASE_SERVICE_ACCOUNT: SA.json };
});

const b64urlDecode = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

/**
 * Delivers one signed event to the webhook, which writes Firestore directly.
 * `current` is what Stripe says the subscription looks like NOW (the webhook
 * re-reads it). Returns the HTTP status, the fake store and every outbound call.
 */
async function deliver(event, current, { store = fakeFirestore(), signature, env = DIRECT_ENV } = {}) {
  let n8nCalls = 0;
  const calls = mockFetch({
    "GET https://api.stripe.com/v1/subscriptions/": () => current,
    "POST https://oauth2.googleapis.com/token": async (_url, init) => {
      // The JWT must be signed by the service account's key and ask for Firestore.
      const [h, c, s] = new URLSearchParams(init.body).get("assertion").split(".");
      const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", SA.publicKey, b64urlDecode(s), new TextEncoder().encode(`${h}.${c}`));
      const claims = JSON.parse(b64urlDecode(c));
      if (!ok || claims.scope !== "https://www.googleapis.com/auth/datastore") return { httpStatus: 400, body: { error: "invalid_grant" } };
      return { access_token: "ya29.test", expires_in: 3600 };
    },
    ...store.routes,
    "POST https://n8n.example/webhook/billing-event": () => {
      n8nCalls++;
      return { ok: true };
    },
  });
  const raw = JSON.stringify(event);
  const request = new Request("https://app.example/api/billing/webhook", {
    method: "POST",
    headers: { "Stripe-Signature": signature ?? (await sign(raw)) },
    body: raw,
  });
  const res = await onRequestPost({ request, env });
  return { status: res.status, store, calls, n8nCalls };
}

const days = (iso) => Math.round((Date.parse(iso) / 1000 - now()) / 86_400);
const evt = (id, type, object) => ({ id, type, data: { object } });

test("introductory payment: checkout completes and the account is trialing for 7 days", async () => {
  const { status, store, n8nCalls } = await deliver(
    evt("evt_checkout", "checkout.session.completed", { mode: "subscription", subscription: "sub_1" }),
    subscription({ status: "trialing", periodEndDays: 7 }),
  );
  assert.equal(status, 200);
  assert.equal(n8nCalls, 0, "n8n is not called when the service account is set");
  const doc = store.get("user1");
  assert.equal(doc.plan, "monthly");
  assert.equal(doc.status, "trialing");
  assert.equal(doc.cancel_at_period_end, false);
  assert.equal(doc.stripe_customer_id, "cus_1");
  assert.equal(doc.stripe_subscription_id, "sub_1");
  assert.equal(doc.last_event_id, "evt_checkout");
  assert.equal(days(doc.current_period_end), 7);
});

for (const [plan, price, periodDays, label] of [
  ["monthly", PRICES.price_monthly, 30, "$199 every month"],
  ["annual", PRICES.price_annual, 365, "$1,188 every year"],
  ["two_year", PRICES.price_two_year, 730, "$1,896 every 2 years"],
]) {
  test(`after the 7-day trial the ${plan} renewal (${label}) makes the account active`, async () => {
    const store = fakeFirestore();
    await deliver(evt("evt_start", "customer.subscription.created", { id: "sub_1" }), subscription({ price, periodEndDays: 7 }), { store });
    assert.equal(store.get("user1").status, "trialing");

    // API 2025-03-31+: the invoice names its subscription under parent.
    const { status } = await deliver(
      evt("evt_renew", "invoice.paid", { parent: { subscription_details: { subscription: "sub_1" } } }),
      subscription({ status: "active", price, periodEndDays: periodDays }),
      { store },
    );
    assert.equal(status, 200);
    const doc = store.get("user1");
    assert.equal(doc.plan, plan);
    assert.equal(doc.status, "active");
    assert.equal(days(doc.current_period_end), periodDays);
  });
}

test("failed payment: the account is recorded past_due", async () => {
  const { store } = await deliver(evt("evt_fail", "invoice.payment_failed", { subscription: "sub_1" }), subscription({ status: "past_due", periodEndDays: 30 }));
  assert.equal(store.get("user1").status, "past_due");
});

test("cancellation: scheduled in the portal, then ended", async () => {
  const store = fakeFirestore();
  await deliver(evt("evt_cancel_at", "customer.subscription.updated", { id: "sub_1" }), subscription({ cancelAt: now() + 7 * 86_400 }), { store });
  assert.equal(store.get("user1").cancel_at_period_end, true);
  await deliver(evt("evt_deleted", "customer.subscription.deleted", { id: "sub_1" }), subscription({ status: "canceled", periodEndDays: 0 }), { store });
  assert.equal(store.get("user1").status, "canceled");
});

test("duplicate event: delivered twice, the stored record is the same", async () => {
  const store = fakeFirestore();
  const event = evt("evt_dup", "invoice.paid", { subscription: "sub_1" });
  const sub = subscription({ status: "active", periodEndDays: 30 });
  await deliver(event, sub, { store });
  const { updated_at: _a, ...once } = store.get("user1");
  await deliver(event, sub, { store });
  const { updated_at: _b, ...twice } = store.get("user1");
  assert.deepEqual(twice, once);
});

test("late, out-of-order event cannot revive a cancelled subscription", async () => {
  const store = fakeFirestore();
  await deliver(evt("evt_deleted", "customer.subscription.deleted", { id: "sub_1" }), subscription({ status: "canceled", periodEndDays: 0 }), { store });
  // A stale "created" event whose snapshot said trialing; Stripe now says canceled.
  await deliver(evt("evt_old", "customer.subscription.created", { id: "sub_1", status: "trialing" }), subscription({ status: "canceled", periodEndDays: 0 }), { store });
  assert.equal(store.get("user1").status, "canceled");
});

test("two events for one account at once: the write that loses the race re-reads and merges", async () => {
  const store = fakeFirestore();
  // While this event is being written, another one lands first.
  store.beforeCommit = () => {
    store.put("projects/proj/databases/(default)/documents/billing/user1", {
      uid: { stringValue: "user1" }, plan: { stringValue: "monthly" }, status: { stringValue: "trialing" },
      stripe_subscription_id: { stringValue: "sub_1" }, note: { stringValue: "kept" },
    });
  };
  const { status } = await deliver(evt("evt_paid", "invoice.paid", { subscription: "sub_1" }), subscription({ status: "active", periodEndDays: 30 }), { store });
  assert.equal(status, 200);
  assert.equal(store.get("user1").status, "active");
  assert.equal(store.get("user1").note, "kept", "fields we don't own are left alone");
  assert.equal(store.commits, 1);
});

test("a subscription event never touches a lifetime account", async () => {
  const store = fakeFirestore();
  store.put("projects/proj/databases/(default)/documents/billing/user1", {
    uid: { stringValue: "user1" }, plan: { stringValue: "lifetime" }, status: { stringValue: "lifetime" }, lifetime_ref: { stringValue: "pi_1" },
  });
  await deliver(evt("evt_sub", "customer.subscription.updated", { id: "sub_1" }), subscription(), { store });
  assert.equal(store.get("user1").plan, "lifetime");
  assert.equal(store.commits, 0);
});

test("Firestore unavailable: Stripe gets an error and retries", async () => {
  const store = fakeFirestore();
  store.routes["GET https://firestore.googleapis.com/v1/projects/"] = () => ({ httpStatus: 503, body: {} });
  const { status } = await deliver(evt("evt_x", "invoice.paid", { subscription: "sub_1" }), subscription(), { store });
  assert.equal(status, 502);
});

test("bad signature is rejected and nothing is recorded", async () => {
  const { status, store } = await deliver(evt("evt_x", "invoice.paid", { subscription: "sub_1" }), subscription(), {
    signature: `t=${now()},v1=${"0".repeat(64)}`,
  });
  assert.equal(status, 400);
  assert.equal(store.commits, 0);
});

test("events we don't track are acknowledged without a write", async () => {
  const { status, store } = await deliver(evt("evt_other", "customer.created", {}), null);
  assert.equal(status, 200);
  assert.equal(store.commits, 0);
});

const LIVE_N8N_ENV = { ...ENV, STRIPE_SECRET_KEY: "sk_live_fake", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "prod-project" };
const liveEvt = (id, type, object) => ({ ...evt(id, type, object), livemode: true });

test("live, without the service account: the event goes to n8n instead, never to both", async () => {
  const { status, n8nCalls, store } = await deliver(liveEvt("evt_legacy", "invoice.paid", { subscription: "sub_1" }), subscription(), { env: LIVE_N8N_ENV });
  assert.equal(status, 200);
  assert.equal(n8nCalls, 1);
  assert.equal(store.commits, 0);
});

test("staging (test key) without its own service account never falls back to n8n", async () => {
  const { status, n8nCalls, store } = await deliver(evt("evt_t1", "invoice.paid", { subscription: "sub_1" }), subscription(), { env: ENV });
  assert.equal(status, 503);
  assert.equal(n8nCalls, 0);
  assert.equal(store.commits, 0);
});

test("staging (test key) pointed at the production project is refused", async () => {
  const env = { ...DIRECT_ENV, NEXT_PUBLIC_FIREBASE_PROJECT_ID: "prod-project" };
  const { status, store } = await deliver(evt("evt_t2", "invoice.paid", { subscription: "sub_1" }), subscription(), { env });
  assert.equal(status, 503);
  assert.equal(store.commits, 0);
});

test("staging (test key) without PRODUCTION_FIREBASE_PROJECT_ID is refused, so the guard can't be skipped", async () => {
  const { PRODUCTION_FIREBASE_PROJECT_ID, ...env } = DIRECT_ENV;
  const { status, store } = await deliver(evt("evt_t3", "invoice.paid", { subscription: "sub_1" }), subscription(), { env });
  assert.equal(status, 503);
  assert.equal(store.commits, 0);
});

test("a test-mode event reaching a live deployment changes nothing", async () => {
  const env = { ...DIRECT_ENV, STRIPE_SECRET_KEY: "sk_live_fake", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "proj" };
  const { status, store, calls } = await deliver(evt("evt_t4", "invoice.paid", { subscription: "sub_1" }), subscription(), { env });
  assert.equal(status, 200);
  assert.equal(store.commits, 0);
  assert.equal(calls.length, 0, "not even a Stripe lookup");
});

test("a live event reaching staging changes nothing", async () => {
  const { status, store } = await deliver(liveEvt("evt_t5", "invoice.paid", { subscription: "sub_1" }), subscription());
  assert.equal(status, 200);
  assert.equal(store.commits, 0);
});

test("a service-account key from another project is refused before any write", async () => {
  const other = JSON.stringify({ ...JSON.parse(SA.json), project_id: "prod-project" });
  const { status, store } = await deliver(evt("evt_t6", "invoice.paid", { subscription: "sub_1" }), subscription(), { env: { ...DIRECT_ENV, FIREBASE_SERVICE_ACCOUNT: other } });
  assert.equal(status, 502);
  assert.equal(store.commits, 0);
});

// mergeBilling is a port of the n8n "Merge Billing State" node: same input, same record.
const workflow = JSON.parse(readFileSync(new URL("../../n8n/billing-event-workflow.json", import.meta.url), "utf8"));
const n8nMerge = workflow.nodes.find((n) => n.name === "Merge Billing State").parameters.jsCode;
function runN8n(update, eventId, cur) {
  const $ = () => ({ first: () => ({ json: { update, event_id: eventId } }) });
  const $input = { first: () => ({ json: cur }) };
  return new Function("$", "$input", n8nMerge)($, $input)[0].json;
}

test("mergeBilling matches the n8n workflow on every guard", () => {
  const iso = (d) => new Date(Date.now() + d * 86_400_000).toISOString();
  const sub = (o) => ({ kind: "subscription", uid: "u", plan: "monthly", status: "active", current_period_end: iso(30), cancel_at_period_end: false, stripe_subscription_id: "sub_new", stripe_customer_id: "cus_1", ...o });
  const cases = [
    [sub(), {}],
    [sub({ plan: "two_year" }), {}],
    [sub(), { plan: "lifetime", status: "lifetime", lifetime_ref: "pi_1" }],
    [sub({ status: "canceled", current_period_end: iso(-1) }), { plan: "annual", status: "active", current_period_end: iso(100), stripe_subscription_id: "sub_old" }],
    [sub({ stripe_customer_id: "" }), { stripe_customer_id: "cus_keep", plan: "monthly" }],
    [{ kind: "lifetime", uid: "u", active: true, lifetime_ref: "pi_2", stripe_customer_id: "cus_2" }, {}],
    [{ kind: "lifetime", uid: "u", active: false, lifetime_ref: "pi_1", stripe_customer_id: "" }, { plan: "lifetime", lifetime_ref: "pi_1" }],
    [{ kind: "lifetime", uid: "u", active: false, lifetime_ref: "pi_9", stripe_customer_id: "" }, { plan: "lifetime", lifetime_ref: "pi_1" }],
  ];
  for (const [update, cur] of cases) {
    const { write, reason, ...n8nDoc } = runN8n(update, "evt_1", cur);
    const ours = mergeBilling(cur, update, "evt_1");
    assert.equal(ours.write ? 1 : 0, write, reason);
    assert.equal(ours.reason, reason);
    // access_until is the one field n8n never had (grace policy); everything else must match.
    const { updated_at: _x, access_until: _z, ...a } = ours.doc;
    const { updated_at: _y, ...b } = n8nDoc;
    assert.deepEqual(a, b, reason);
  }
});
