// Free users must not reach the AI model in the three AI workflows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WORKFLOW_FILES } from "../../n8n/paid-check.mjs";

const DAY = 86_400_000;
const iso = (ms) => new Date(Date.now() + ms).toISOString();
const ACCOUNTS = {
  "no billing record (free)": [{ error: { message: "NOT_FOUND" } }, false],
  "read failed": [{ error: { message: "UNAVAILABLE" } }, false],
  "never paid (plan none)": [{ plan: "none", status: "" }, false],
  "in the $1 week": [{ plan: "two_year", status: "trialing", access_until: iso(5 * DAY) }, true],
  "active monthly": [{ plan: "monthly", status: "active", access_until: iso(20 * DAY) }, true],
  "failed renewal, inside grace": [{ plan: "annual", status: "past_due", access_until: iso(DAY) }, true],
  "failed renewal, grace over": [{ plan: "annual", status: "past_due", access_until: iso(-DAY), current_period_end: iso(360 * DAY) }, false],
  cancelled: [{ plan: "monthly", status: "canceled", access_until: "" }, false],
  "record written by n8n, active": [{ plan: "monthly", status: "active", current_period_end: iso(10 * DAY) }, true],
  lifetime: [{ plan: "lifetime", status: "lifetime" }, true],
};

for (const file of WORKFLOW_FILES) {
  const w = JSON.parse(readFileSync(new URL(`../../n8n/${file}`, import.meta.url), "utf8"));
  const node = (name) => w.nodes.find((n) => n.name === name);
  const next = (name, out = 0) => w.connections[name]?.main?.[out]?.map((c) => c.node);

  test(`${w.name}: signed-in users go through the paid check before any AI work`, () => {
    assert.deepEqual(next("Verify User and Normalize"), ["Load Billing"]);
    assert.deepEqual(next("Load Billing"), ["Check Paid Access"]);
    assert.deepEqual(next("Check Paid Access"), ["Has Paid Access?"]);
    assert.deepEqual(next("Has Paid Access?", 0), ["Load Account Memory"]);
    assert.deepEqual(next("Has Paid Access?", 1), ["Respond Payment Required"]);
    assert.equal(node("Respond Payment Required").parameters.options.responseCode, 402);
    assert.equal(node("Load Billing").parameters.collection, "billing");
    assert.equal(node("Load Billing").parameters.documentId, "={{ $json.user_id }}");
    // The only way to the model is through "Has Paid Access?" true.
    const into = (target) => Object.entries(w.connections).filter(([, c]) => c.main?.some((out) => out?.some((x) => x.node === target))).map(([k]) => k);
    assert.deepEqual(into("Load Account Memory"), ["Has Paid Access?"]);
  });

  test(`${w.name}: free and lapsed accounts are refused, paying ones pass`, () => {
    const code = node("Check Paid Access").parameters.jsCode;
    for (const [label, [billing, expected]] of Object.entries(ACCOUNTS)) {
      const user = { user_id: "u1", session_id: "s1" };
      const $ = (name) => ({ first: () => ({ json: name === "Verify User and Normalize" ? user : {} }) });
      const $input = { first: () => ({ json: billing }) };
      const [{ json }] = new Function("$", "$input", code)($, $input);
      assert.equal(json.paid_access, expected, label);
      assert.equal(json.user_id, "u1", "downstream nodes still get the user");
    }
  });
}
