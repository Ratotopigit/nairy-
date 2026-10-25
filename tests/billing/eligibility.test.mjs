// The Billing page labels its buttons from this answer, so it must match checkout's rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost } from "../../functions/api/billing/eligibility.js";
import { ENV, mockFetch } from "./helpers.mjs";

async function ask({ signedIn = true, billing = null, emailSubs = [] } = {}) {
  const calls = mockFetch({
    "POST https://identitytoolkit.googleapis.com/": () => (signedIn ? { users: [{ localId: "user1", email: "a@example.com" }] } : { httpStatus: 400, body: {} }),
    "GET https://firestore.googleapis.com/": () => (billing ? { fields: billing } : { httpStatus: 404, body: {} }),
    "GET https://api.stripe.com/v1/customers?": () => ({ data: emailSubs.length ? [{ id: "cus_x" }] : [] }),
    "GET https://api.stripe.com/v1/subscriptions?": () => ({ data: emailSubs }),
  });
  const res = await onRequestPost({ request: new Request("https://app.example/api/billing/eligibility", { method: "POST", headers: { Authorization: "Bearer t" } }), env: ENV });
  return { status: res.status, body: await res.json(), calls };
}

test("a first-time customer is offered the $1 trial", async () => {
  const { status, body } = await ask();
  assert.equal(status, 200);
  assert.equal(body.intro, true);
});

test("a returning customer (own record) gets the full-price button", async () => {
  const { body } = await ask({ billing: { stripe_customer_id: { stringValue: "cus_old" } } });
  assert.equal(body.intro, false);
});

test("an email that already subscribed gets the full-price button", async () => {
  const { body } = await ask({ emailSubs: [{ id: "sub_old" }] });
  assert.equal(body.intro, false);
});

test("signed-out callers learn nothing and nothing is created", async () => {
  const { status, calls } = await ask({ signedIn: false });
  assert.equal(status, 401);
  assert.ok(calls.every((c) => c.method === "GET" || c.url.includes("identitytoolkit")), "read-only");
});
