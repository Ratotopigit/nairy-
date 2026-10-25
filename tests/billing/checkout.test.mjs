import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost, termsText } from "../../functions/api/billing/checkout.js";
import { ENV, PRICES, mockFetch } from "./helpers.mjs";

/** Runs one checkout with a fake Google, Firestore and Stripe. Returns the response and the params sent to Stripe. */
async function checkout({ plan = "monthly", accept = true, billing = null, emailCustomers = [], customerSubs = {}, env = ENV } = {}) {
  let sent = null;
  mockFetch({
    "POST https://identitytoolkit.googleapis.com/": () => ({ users: [{ localId: "user1", email: "a@example.com" }] }),
    "GET https://firestore.googleapis.com/": () => (billing ? { fields: billing } : { httpStatus: 404, body: {} }),
    "GET https://api.stripe.com/v1/prices/": (url) => PRICES[url.split("/prices/")[1]] ?? { httpStatus: 404, body: {} },
    "GET https://api.stripe.com/v1/customers?": () => ({ data: emailCustomers.map((id) => ({ id })) }),
    "GET https://api.stripe.com/v1/subscriptions?": (url) => ({ data: customerSubs[new URL(url).searchParams.get("customer")] ?? [] }),
    "POST https://api.stripe.com/v1/checkout/sessions": (_url, init) => {
      sent = Object.fromEntries(new URLSearchParams(init.body));
      return { url: "https://checkout.stripe.com/c/test" };
    },
  });
  const request = new Request("https://app.example/api/billing/checkout", {
    method: "POST",
    headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
    body: JSON.stringify({ plan, accept_terms: accept }),
  });
  const res = await onRequestPost({ request, env });
  return { status: res.status, body: await res.json(), sent };
}

test("first-time monthly: $1 one-time item now, 7-day trial, then the monthly price", async () => {
  const { status, body, sent } = await checkout({ plan: "monthly" });
  assert.equal(status, 200);
  assert.equal(body.intro, true);
  assert.equal(sent.mode, "subscription");
  assert.equal(sent["line_items[0][price]"], "price_monthly");
  assert.equal(sent["line_items[1][price]"], "price_intro");
  assert.equal(sent["subscription_data[trial_period_days]"], "7");
  assert.equal(sent.payment_method_collection, "always");
  assert.equal(sent["subscription_data[metadata][uid]"], "user1");
  assert.equal(sent["subscription_data[metadata][intro]"], "1");
  assert.equal(sent.customer_email, "a@example.com");
  assert.match(sent["custom_text[submit][message]"], /\$1\.00 today for your first 7 days.*\$199\.00 every month/);
});

test("first-time annual: same $1 intro, then the annual price every year", async () => {
  const { sent } = await checkout({ plan: "annual" });
  assert.equal(sent["line_items[0][price]"], "price_annual");
  assert.equal(sent["line_items[1][price]"], "price_intro");
  assert.equal(sent["subscription_data[trial_period_days]"], "7");
  assert.match(sent["custom_text[submit][message]"], /\$1,188\.00 every year/);
});

test("returning customer (own billing record): regular price today, no intro, same Stripe customer", async () => {
  const billing = { stripe_customer_id: { stringValue: "cus_old" }, stripe_subscription_id: { stringValue: "sub_old" }, status: { stringValue: "canceled" } };
  const { body, sent } = await checkout({ plan: "monthly", billing });
  assert.equal(body.intro, false);
  assert.equal(sent["line_items[1][price]"], undefined);
  assert.equal(sent["subscription_data[trial_period_days]"], undefined);
  assert.equal(sent.customer, "cus_old");
  assert.equal(sent.customer_email, undefined);
  assert.match(sent["custom_text[submit][message]"], /\$199\.00 today and \$199\.00 every month/);
});

test("same email already subscribed under another account: no intro, other customer never attached", async () => {
  const { body, sent } = await checkout({ emailCustomers: ["cus_other"], customerSubs: { cus_other: [{ id: "sub_x", status: "canceled" }] } });
  assert.equal(body.intro, false);
  assert.equal(sent["line_items[1][price]"], undefined);
  assert.equal(sent.customer, undefined);
});

test("a customer with that email but no subscription ever is still first-time", async () => {
  const { body } = await checkout({ emailCustomers: ["cus_abandoned"] });
  assert.equal(body.intro, true);
});

test("first-time two-year: same $1 intro, then the two-year price every 2 years", async () => {
  const { body, sent } = await checkout({ plan: "two_year" });
  assert.equal(body.intro, true);
  assert.equal(sent.mode, "subscription");
  assert.equal(sent["line_items[0][price]"], "price_two_year");
  assert.equal(sent["line_items[1][price]"], "price_intro");
  assert.equal(sent["subscription_data[trial_period_days]"], "7");
  assert.match(sent["custom_text[submit][message]"], /\$1,896\.00 every 2 years/);
});

test("lifetime is no longer on sale", async () => {
  const { status, sent } = await checkout({ plan: "lifetime" });
  assert.equal(status, 400);
  assert.equal(sent, null);
});

test("without the terms tick nothing is created", async () => {
  const { status, sent } = await checkout({ accept: false });
  assert.equal(status, 400);
  assert.equal(sent, null);
});

test("an intro price that is recurring is refused instead of billing $1 forever", async () => {
  const saved = PRICES.price_intro;
  PRICES.price_intro = { ...saved, type: "recurring", recurring: { interval: "month" } };
  try {
    const { status, sent } = await checkout();
    assert.equal(status, 503);
    assert.equal(sent, null);
  } finally {
    PRICES.price_intro = saved;
  }
});

test("subscriptions refuse to start when STRIPE_PRICE_INTRO is missing", async () => {
  const { STRIPE_PRICE_INTRO, ...env } = ENV;
  const { status } = await checkout({ env });
  assert.equal(status, 503);
});

test("someone already paying cannot start a second checkout", async () => {
  const end = new Date(Date.now() + 86_400_000).toISOString();
  const billing = { plan: { stringValue: "monthly" }, status: { stringValue: "trialing" }, current_period_end: { stringValue: end } };
  const { status } = await checkout({ billing });
  assert.equal(status, 409);
});

test("terms name the first charge date seven days out", () => {
  const text = termsText({ price: PRICES.price_monthly, introPrice: PRICES.price_intro, now: Date.UTC(2026, 9, 25) });
  assert.match(text, /before November 1, 2026/);
});
