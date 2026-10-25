// Runs the webhook against the REAL Firestore emulator (Stripe is still faked):
//   npm run test:emulator
// Checks what the in-memory fake can't: Firestore's own commit, updateMask and
// updateTime-precondition behaviour, concurrent deliveries and the cutover
// from records n8n wrote.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../../functions/api/billing/webhook.js";
import { ENV, PRICES, now, sign, subscription } from "./helpers.mjs";

const HOST = process.env.FIRESTORE_EMULATOR_HOST;
const PROJECT = process.env.GCLOUD_PROJECT || "demo-nairy";
const env = { ...ENV, NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT, FIRESTORE_EMULATOR_HOST: HOST, N8N_BILLING_SECRET: "" };
const DOCS = `http://${HOST}/v1/projects/${PROJECT}/databases/(default)/documents`;
const realFetch = globalThis.fetch;
const owner = { Authorization: "Bearer owner", "Content-Type": "application/json" };

/** Only Stripe is faked; everything else (the emulator) is real. */
function stripeSays(current) {
  globalThis.fetch = (url, init) => {
    if (String(url).startsWith("https://api.stripe.com/v1/subscriptions/")) return Promise.resolve(new Response(JSON.stringify(current)));
    if (String(url).startsWith("https://")) throw new Error(`unexpected outbound call ${url}`);
    return realFetch(url, init);
  };
}

async function deliver(event) {
  const raw = JSON.stringify(event);
  const request = new Request("https://app.example/api/billing/webhook", { method: "POST", headers: { "Stripe-Signature": await sign(raw) }, body: raw });
  return (await onRequestPost({ request, env })).status;
}

async function readDoc(uid) {
  const res = await realFetch(`${DOCS}/billing/${uid}`, { headers: owner });
  if (res.status === 404) return null;
  const { fields } = await res.json();
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.stringValue ?? v.booleanValue]));
}

/** Writes a document the way n8n's Firestore node did: strings and booleans. */
async function seed(uid, plain) {
  const fields = Object.fromEntries(Object.entries(plain).map(([k, v]) => [k, typeof v === "boolean" ? { booleanValue: v } : { stringValue: v }]));
  const res = await realFetch(`${DOCS}/billing/${uid}`, { method: "PATCH", headers: owner, body: JSON.stringify({ fields }) });
  assert.ok(res.ok, `seed failed ${res.status}`);
}

const evt = (id, type, object) => ({ id, type, data: { object } });
const days = (iso) => Math.round((Date.parse(iso) / 1000 - now()) / 86_400);

test("emulator is running", () => assert.ok(HOST, "run through `npm run test:emulator`"));

test("$1 trial, then the monthly renewal, recorded in real Firestore", async () => {
  stripeSays(subscription({ uid: "e2e_monthly", status: "trialing", periodEndDays: 7 }));
  assert.equal(await deliver(evt("evt_e1", "checkout.session.completed", { mode: "subscription", subscription: "sub_1" })), 200);
  assert.equal((await readDoc("e2e_monthly")).status, "trialing");

  stripeSays(subscription({ uid: "e2e_monthly", status: "active", periodEndDays: 30 }));
  assert.equal(await deliver(evt("evt_e2", "invoice.paid", { subscription: "sub_1" })), 200);
  const doc = await readDoc("e2e_monthly");
  assert.equal(doc.status, "active");
  assert.equal(doc.plan, "monthly");
  assert.equal(days(doc.current_period_end), 30);
});

test("two-year plan is recorded", async () => {
  stripeSays(subscription({ uid: "e2e_2y", status: "active", price: PRICES.price_two_year, periodEndDays: 730 }));
  assert.equal(await deliver(evt("evt_e3", "invoice.paid", { subscription: "sub_2" })), 200);
  assert.equal((await readDoc("e2e_2y")).plan, "two_year");
});

test("cutover: an event n8n already recorded, redelivered to the direct path, changes nothing", async () => {
  const sub = subscription({ uid: "e2e_cutover", status: "active", periodEndDays: 30 });
  const asN8nWrote = {
    uid: "e2e_cutover", plan: "monthly", status: "active",
    current_period_end: new Date(sub.items.data[0].current_period_end * 1000).toISOString(),
    cancel_at_period_end: false, stripe_customer_id: "cus_1", stripe_subscription_id: "sub_1",
    lifetime_ref: "", last_event_id: "evt_seen", updated_at: "2026-10-20T00:00:00.000Z",
  };
  await seed("e2e_cutover", asN8nWrote);
  stripeSays(sub);
  assert.equal(await deliver(evt("evt_seen", "invoice.paid", { subscription: "sub_1" })), 200);
  const { updated_at: _a, ...after } = await readDoc("e2e_cutover");
  const { updated_at: _b, ...before } = asN8nWrote;
  assert.deepEqual(after, before);
});

test("production records as n8n's Firestore node typed them (timestamps, numbers) are read and updated", async () => {
  // n8n's node turns ISO dates into timestampValue and numeric-looking strings into integerValue.
  const fields = {
    uid: { stringValue: "e2e_typed" }, plan: { stringValue: "monthly" }, status: { stringValue: "trialing" },
    current_period_end: { timestampValue: new Date(Date.now() + 3 * 86_400_000).toISOString() },
    updated_at: { timestampValue: "2026-10-13T17:44:00.000Z" },
    cancel_at_period_end: { booleanValue: false }, lifetime_ref: { integerValue: "0" },
    stripe_customer_id: { stringValue: "cus_1" }, stripe_subscription_id: { stringValue: "sub_1" },
  };
  const put = await realFetch(`${DOCS}/billing/e2e_typed`, { method: "PATCH", headers: owner, body: JSON.stringify({ fields }) });
  assert.ok(put.ok);
  stripeSays(subscription({ uid: "e2e_typed", status: "active", periodEndDays: 30 }));
  assert.equal(await deliver(evt("evt_typed", "invoice.paid", { subscription: "sub_1" })), 200);
  const doc = await readDoc("e2e_typed");
  assert.equal(doc.status, "active");
  assert.equal(days(doc.current_period_end), 30);
  assert.equal(doc.stripe_customer_id, "cus_1");
});

test("three deliveries for one account at the same moment: all succeed, none lost, other fields kept", async () => {
  await seed("e2e_race", { uid: "e2e_race", plan: "monthly", status: "trialing", note: "kept" });
  stripeSays(subscription({ uid: "e2e_race", status: "active", periodEndDays: 30 }));
  const statuses = await Promise.all([
    deliver(evt("evt_r1", "invoice.paid", { subscription: "sub_1" })),
    deliver(evt("evt_r2", "customer.subscription.updated", { id: "sub_1" })),
    deliver(evt("evt_r3", "invoice.paid", { subscription: "sub_1" })),
  ]);
  assert.deepEqual(statuses, [200, 200, 200]);
  const doc = await readDoc("e2e_race");
  assert.equal(doc.status, "active");
  assert.equal(doc.note, "kept");
  assert.ok(["evt_r1", "evt_r2", "evt_r3"].includes(doc.last_event_id));
});

test("other accounts' records are never touched", async () => {
  await seed("e2e_bystander", { uid: "e2e_bystander", plan: "annual", status: "active" });
  stripeSays(subscription({ uid: "e2e_other", status: "past_due", periodEndDays: 30 }));
  assert.equal(await deliver(evt("evt_e9", "invoice.payment_failed", { subscription: "sub_9" })), 200);
  assert.equal((await readDoc("e2e_other")).status, "past_due");
  assert.deepEqual(await readDoc("e2e_bystander"), { uid: "e2e_bystander", plan: "annual", status: "active" });
});
