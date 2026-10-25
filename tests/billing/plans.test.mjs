// The promo site links to /signup?plan=<id> or /login?plan=<id>; the pick must
// survive sign-in and reach checkout. lib/plans.ts is plain TypeScript, which
// Node runs directly.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { PLAN_CATALOG, clearPendingPlan, introTerms, pendingPlan, rememberPlanFromUrl } from "../../lib/plans.ts";

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
};
const visit = (url) => (globalThis.window = { location: new URL(url) });
beforeEach(() => storage.clear());

for (const plan of ["monthly", "annual", "two_year"]) {
  test(`promo link ?plan=${plan} is remembered until checkout`, () => {
    visit(`https://webinarstackai.com/signup?plan=${plan}`);
    rememberPlanFromUrl();
    // A later page without the parameter keeps it.
    visit("https://webinarstackai.com/onboarding");
    rememberPlanFromUrl();
    assert.equal(pendingPlan(), plan);
    clearPendingPlan();
    assert.equal(pendingPlan(), null);
  });
}

test("unknown or retired plans in the link are ignored", () => {
  for (const bad of ["lifetime", "free", "monthly%22%3E", ""]) {
    visit(`https://webinarstackai.com/login?plan=${bad}`);
    rememberPlanFromUrl();
    assert.equal(pendingPlan(), null, bad);
  }
});

test("a tampered stored value is not trusted", () => {
  storage.set("billing:pending-plan", "<script>");
  assert.equal(pendingPlan(), null);
});

test("blocked storage does not break sign-in", () => {
  const saved = globalThis.localStorage;
  globalThis.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  try {
    visit("https://webinarstackai.com/signup?plan=annual");
    assert.doesNotThrow(() => rememberPlanFromUrl());
    assert.equal(pendingPlan(), null);
  } finally {
    globalThis.localStorage = saved;
  }
});

test("every plan card states the $1 week and its renewal price", () => {
  const terms = Object.fromEntries(PLAN_CATALOG.map((p) => [p.id, introTerms(p)]));
  assert.equal(terms.monthly, "$1 for your first 7 days, then $199 every month until you cancel.");
  assert.equal(terms.annual, "$1 for your first 7 days, then $1,188 every year until you cancel.");
  assert.equal(terms.two_year, "$1 for your first 7 days, then $1,896 every 2 years until you cancel.");
});
