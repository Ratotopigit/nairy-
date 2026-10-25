// Failed renewals get a short, fixed grace period instead of the next (unpaid) period.
import { test } from "node:test";
import assert from "node:assert/strict";
import { GRACE_DAYS, accessUntil, hasAccess } from "../../functions/api/billing/_entitlement.js";

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 1);

test("a failed renewal grants only the grace period, not the unpaid year", () => {
  const start = now - DAY; // the unpaid period started yesterday
  const until = Date.parse(accessUntil("past_due", start, start + 365 * DAY));
  assert.equal(until, start + GRACE_DAYS * DAY);
  assert.equal(hasAccess({ plan: "annual", status: "past_due", access_until: new Date(until).toISOString() }, now), true);
  assert.equal(hasAccess({ plan: "annual", status: "past_due", access_until: new Date(until).toISOString() }, start + (GRACE_DAYS + 1) * DAY), false);
});

test("paid periods (trial week, active, cancelled at period end) keep access to their end", () => {
  const end = now + 30 * DAY;
  for (const status of ["trialing", "active"]) {
    assert.equal(Date.parse(accessUntil(status, now, end)), end);
  }
  assert.equal(hasAccess({ plan: "monthly", status: "active", access_until: new Date(end).toISOString() }, now), true);
  assert.equal(hasAccess({ plan: "monthly", status: "active", access_until: new Date(end).toISOString() }, end + 1), false);
});

test("ended or unpaid subscriptions get nothing", () => {
  for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) {
    assert.equal(accessUntil(status, now - DAY, now + 30 * DAY), "");
    assert.equal(hasAccess({ plan: "monthly", status, access_until: "", current_period_end: new Date(now + 30 * DAY).toISOString() }, now), false);
  }
});

test("records n8n wrote (no access_until): active keeps its period, past_due gets no free period", () => {
  const end = new Date(now + 300 * DAY).toISOString();
  assert.equal(hasAccess({ plan: "monthly", status: "active", current_period_end: end }, now), true);
  assert.equal(hasAccess({ plan: "monthly", status: "past_due", current_period_end: end }, now), false);
  assert.equal(hasAccess({ plan: "lifetime", status: "lifetime" }, now), true);
  assert.equal(hasAccess({ plan: "none", status: "" }, now), false);
});
