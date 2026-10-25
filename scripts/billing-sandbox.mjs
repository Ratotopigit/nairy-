#!/usr/bin/env node
/**
 * End-to-end billing check against the Stripe SANDBOX, writing only to the
 * local Firestore emulator. One command:
 *
 *   npm run verify:billing          (asks for the sandbox sk_test_ key, or reads STRIPE_SECRET_KEY)
 *
 * What it does, all locally except the Stripe sandbox:
 *  1. Creates the four sandbox prices once ($1 one-time, $199/month, $1,188/year,
 *     $1,896 every 2 years); a rerun finds them by lookup_key, never duplicates.
 *  2. Starts the Firestore emulator (demo-nairy) and the site's functions in
 *     Cloudflare's runtime (wrangler pages dev), with no Firebase credentials at
 *     all, so nothing can reach the production project.
 *  3. With Stripe test clocks, per plan: $1 charged at once, the plan's price 7
 *     days later, renewal one interval after; plus a failed renewal and a
 *     cancellation during the trial.
 *  4. Opens a real sandbox Checkout built by the site's own code and waits for
 *     you to pay it in the browser (test card, 3D Secure), or press Enter to skip.
 *  5. Replays every resulting sandbox event, signed, into the local webhook,
 *     then checks billing/{uid} in the emulator for each case.
 * Test clocks (and their customers) are deleted at the end. Refuses live keys.
 */
import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createHmac, randomBytes } from "node:crypto";
import { createInterface } from "node:readline";
import { sessionParams, termsText } from "../functions/api/billing/checkout.js";

const ROOT = new URL("..", import.meta.url);
const PORT = 8797;
const SITE = `http://127.0.0.1:${PORT}`;
const EMULATOR = "127.0.0.1:8181"; // tests/billing/firebase.emulator.json
const PROJECT = "demo-nairy";
const WHSEC = `whsec_local_${randomBytes(12).toString("hex")}`;

function ask(question, hidden = false) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = (s) => rl.output.write(s.startsWith(question) ? s : "");
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(a.trim()); }));
}

const KEY = process.env.STRIPE_SECRET_KEY || (await ask("Stripe SANDBOX secret key (sk_test_...): ", true));
if (!/^(sk|rk)_test_/.test(KEY)) {
  console.error("Refusing to run: the key must be a Stripe sandbox/test key (sk_test_... or rk_test_...).");
  process.exit(2);
}

// ---------- Stripe (sandbox only) ----------
async function stripe(method, path, params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params ? new URLSearchParams(params).toString() : undefined,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${method} ${path}: ${body?.error?.message || res.status}`);
  if (body.livemode) throw new Error("Stripe answered in live mode; stopping.");
  return body;
}
const get = (path) => stripe("GET", path);
const post = (path, params) => stripe("POST", path, params);

const PLANS = {
  intro: { lookup: "ws_intro_1usd", name: "Webinar Stack: first 7 days", amount: 100 },
  monthly: { lookup: "ws_monthly_199", name: "Webinar Stack Monthly", amount: 19900, interval: "month", count: 1, days: [28, 31] },
  annual: { lookup: "ws_annual_1188", name: "Webinar Stack Annual", amount: 118800, interval: "year", count: 1, days: [365, 366] },
  two_year: { lookup: "ws_two_year_1896", name: "Webinar Stack Two-Year", amount: 189600, interval: "year", count: 2, days: [730, 731] },
};
const HANDLED = new Set([
  "checkout.session.completed", "checkout.session.async_payment_succeeded", "customer.subscription.created",
  "customer.subscription.updated", "customer.subscription.deleted", "invoice.paid", "invoice.payment_failed", "charge.refunded",
]);

async function sandboxPrices() {
  const found = (await get(`prices?${Object.values(PLANS).map((p) => `lookup_keys[]=${p.lookup}`).join("&")}&limit=10`)).data;
  const ids = {};
  for (const [plan, p] of Object.entries(PLANS)) {
    let price = found.find((x) => x.lookup_key === p.lookup);
    if (!price) {
      const params = { currency: "usd", unit_amount: String(p.amount), lookup_key: p.lookup, "product_data[name]": p.name };
      if (p.interval) Object.assign(params, { "recurring[interval]": p.interval, "recurring[interval_count]": String(p.count) });
      price = await post("prices", params);
      console.log(`created sandbox price ${plan} ${price.id}`);
    }
    ids[plan] = price.id;
  }
  return ids;
}

// ---------- local emulator + Cloudflare runtime ----------
const children = [];
function start(cmd, label) {
  const child = spawn(cmd, { cwd: ROOT, shell: true, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", () => {});
  child.stderr.on("data", () => {});
  children.push({ child, label });
  return child;
}
function stopAll() {
  for (const { child } of children) {
    try {
      if (process.platform === "win32") execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
      else process.kill(-child.pid);
    } catch {}
  }
}
async function waitFor(url, label, tries = 90) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {}
    await sleep(2000);
  }
  throw new Error(`${label} did not start (${url})`);
}

const DEV_VARS = new URL(".dev.vars", ROOT);
const DEV_VARS_BACKUP = new URL(".dev.vars.before-verify", ROOT);
function writeDevVars(ids) {
  if (existsSync(DEV_VARS)) renameSync(DEV_VARS, DEV_VARS_BACKUP);
  // Overrides wrangler.toml [vars] for this local run only. No FIREBASE_SERVICE_ACCOUNT
  // and no n8n secret: the only Firestore it can reach is the local emulator.
  writeFileSync(DEV_VARS, [
    `STRIPE_SECRET_KEY=${KEY}`,
    `STRIPE_WEBHOOK_SECRET=${WHSEC}`,
    `FIRESTORE_EMULATOR_HOST=${EMULATOR}`,
    `NEXT_PUBLIC_FIREBASE_PROJECT_ID=${PROJECT}`,
    "NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL=",
    `STRIPE_PRICE_INTRO=${ids.intro}`,
    `STRIPE_PRICE_MONTHLY=${ids.monthly}`,
    `STRIPE_PRICE_ANNUAL=${ids.annual}`,
    `STRIPE_PRICE_TWO_YEAR=${ids.two_year}`,
    `APP_URL=${SITE}`,
  ].join("\n") + "\n");
}
function restoreDevVars() {
  rmSync(DEV_VARS, { force: true });
  if (existsSync(DEV_VARS_BACKUP)) renameSync(DEV_VARS_BACKUP, DEV_VARS);
}

async function emulatorDoc(uid) {
  const res = await fetch(`http://${EMULATOR}/v1/projects/${PROJECT}/databases/(default)/documents/billing/${uid}`, { headers: { Authorization: "Bearer owner" } });
  if (!res.ok) return null;
  const { fields } = await res.json();
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.stringValue ?? v.booleanValue ?? v.timestampValue]));
}

// ---------- checks ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const periodEnd = (sub) => Math.max(sub.current_period_end || 0, ...(sub.items?.data ?? []).map((i) => i.current_period_end || 0));
const results = [];
function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

async function advance(clock, to) {
  await post(`test_helpers/test_clocks/${clock}/advance`, { frozen_time: String(to) });
  for (let i = 0; i < 120; i++) {
    const c = await get(`test_helpers/test_clocks/${clock}`);
    if (c.status === "ready") return;
    if (c.status === "internal_failure") throw new Error("test clock failed");
    await sleep(2000);
  }
  throw new Error("test clock did not finish advancing");
}

/** A subscription shaped like the one Checkout creates: plan price + one-time $1 + 7-day trial. */
async function startIntro(ids, plan, label, clocks) {
  const t = Math.floor(Date.now() / 1000);
  const clock = (await post("test_helpers/test_clocks", { frozen_time: String(t), name: `verify ${label}` })).id;
  clocks.push(clock);
  const uid = `sandbox_${label}_${t}`;
  const customer = (await post("customers", { test_clock: clock, email: `${uid}@example.com`, payment_method: "pm_card_visa" })).id;
  const pm = (await get(`customers/${customer}/payment_methods?limit=1`)).data[0].id;
  const sub = await post("subscriptions", {
    customer, default_payment_method: pm,
    "items[0][price]": ids[plan], "add_invoice_items[0][price]": ids.intro,
    trial_period_days: "7", "trial_settings[end_behavior][missing_payment_method]": "cancel",
    "metadata[uid]": uid, "metadata[plan]": plan, "metadata[intro]": "1", "expand[0]": "latest_invoice",
  });
  return { clock, customer, uid, sub };
}

async function replay(since) {
  let events = [];
  let after = "";
  for (;;) {
    const page = await get(`events?created[gte]=${since}&limit=100${after ? `&starting_after=${after}` : ""}`);
    events = events.concat(page.data);
    if (!page.has_more) break;
    after = page.data[page.data.length - 1].id;
  }
  const mine = events.filter((e) => HANDLED.has(e.type)).reverse(); // oldest first, as Stripe sends them
  let failed = 0;
  for (const e of mine) {
    const raw = JSON.stringify(e);
    const t = Math.floor(Date.now() / 1000);
    const sig = createHmac("sha256", WHSEC).update(`${t}.${raw}`).digest("hex");
    const res = await fetch(`${SITE}/api/billing/webhook`, { method: "POST", headers: { "Stripe-Signature": `t=${t},v1=${sig}` }, body: raw });
    if (!res.ok) failed++;
  }
  check(`local webhook accepted every sandbox event`, failed === 0, `${mine.length} events, ${failed} failed`);
}

async function main() {
  const since = Math.floor(Date.now() / 1000) - 5;
  const clocks = [];
  const expect = []; // [uid, plan, status]
  const ids = await sandboxPrices();

  if (!existsSync(new URL("out/index.html", ROOT))) {
    console.log("building the site once (npm run build)...");
    execSync("npm run build", { cwd: ROOT, stdio: "ignore" });
  }
  writeDevVars(ids);
  try {
    let emulatorUp = false;
    try { emulatorUp = (await fetch(`http://${EMULATOR}/`)).ok; } catch {}
    if (!emulatorUp) start(`firebase emulators:start --only firestore --project ${PROJECT} --config tests/billing/firebase.emulator.json`, "emulator");
    start(`npx -y wrangler@4 pages dev out --port ${PORT} --ip 127.0.0.1 --inspector-port 9239`, "wrangler");
    await waitFor(`http://${EMULATOR}/`, "Firestore emulator");
    await waitFor(`${SITE}/login/`, "Cloudflare runtime");
    console.log("local Firestore emulator and Cloudflare runtime are up\n");

    for (const plan of ["monthly", "annual", "two_year"]) {
      const { clock, sub, uid } = await startIntro(ids, plan, plan, clocks);
      const first = sub.latest_invoice;
      check(`${plan}: $1 charged immediately`, first.status === "paid" && first.amount_paid === 100, `${first.amount_paid} cents`);
      check(`${plan}: 7-day trial`, sub.status === "trialing" && Math.round((sub.trial_end - sub.trial_start) / 86400) === 7);
      await advance(clock, sub.trial_end + 2 * 3600);
      const after = await get(`subscriptions/${sub.id}?expand[]=latest_invoice`);
      const span = Math.round((periodEnd(after) - sub.trial_end) / 86400);
      check(`${plan}: ${PLANS[plan].amount / 100} USD charged when the trial ends`, after.status === "active" && after.latest_invoice.amount_paid === PLANS[plan].amount, `${after.latest_invoice.amount_paid} cents, ${after.status}`);
      check(`${plan}: next renewal one interval later`, span >= PLANS[plan].days[0] && span <= PLANS[plan].days[1], `${span} days`);
      expect.push([uid, plan, "active"]);
    }
    {
      const { clock, customer, sub, uid } = await startIntro(ids, "monthly", "failed", clocks);
      const failing = (await post("payment_methods/pm_card_chargeCustomerFail/attach", { customer })).id;
      await post(`subscriptions/${sub.id}`, { default_payment_method: failing });
      await advance(clock, sub.trial_end + 2 * 3600);
      const after = await get(`subscriptions/${sub.id}?expand[]=latest_invoice`);
      check("failed renewal: past_due, invoice unpaid", after.status === "past_due" && after.latest_invoice.status === "open", `${after.status}`);
      expect.push([uid, "monthly", "past_due"]);
    }
    {
      const { clock, customer, sub, uid } = await startIntro(ids, "monthly", "cancel", clocks);
      await post(`subscriptions/${sub.id}`, { cancel_at_period_end: "true" });
      await advance(clock, sub.trial_end + 2 * 3600);
      const after = await get(`subscriptions/${sub.id}`);
      const charged = (await get(`invoices?customer=${customer}&limit=10`)).data.reduce((n, i) => n + i.amount_paid, 0);
      check("cancel during trial: ended, only the $1 ever charged", after.status === "canceled" && charged === 100, `${after.status}, ${charged} cents`);
      expect.push([uid, "monthly", "canceled"]);
    }

    // A real hosted Checkout, built by the site's own code.
    const uid = `sandbox_checkout_${since}`;
    const [price, intro] = await Promise.all([get(`prices/${ids.two_year}`), get(`prices/${ids.intro}`)]);
    const session = await post("checkout/sessions", sessionParams({
      user: { uid, email: `${uid}@example.com` }, plan: "two_year", priceId: ids.two_year, appUrl: SITE, customer: "",
      terms: termsText({ price, introPrice: intro }), intro: { priceId: ids.intro },
    }));
    check("Checkout accepts the site's session: $1 due today, plan after 7 days", session.amount_total === 100, `${session.amount_total} cents due today`);
    console.log(`\nPay this sandbox Checkout in your browser (card 4000 0027 6000 3184 tests 3D Secure; any future date, any CVC):\n  ${session.url}\nWaiting up to 10 minutes. Press Enter to skip.`);
    let skipped = false;
    const rl = createInterface({ input: process.stdin });
    rl.once("line", () => { skipped = true; });
    let done = null;
    for (let i = 0; i < 300 && !skipped && !done; i++) {
      const s = await get(`checkout/sessions/${session.id}?expand[]=subscription.latest_invoice`);
      if (s.status === "complete") done = s;
      else await sleep(2000);
    }
    rl.close();
    if (done) {
      const sub = done.subscription;
      check("Checkout: $1 paid, trialing 7 days", sub.latest_invoice.amount_paid === 100 && sub.status === "trialing" && Math.round((sub.trial_end - sub.trial_start) / 86400) === 7);
      check("Checkout: card saved and authorized for renewals", Boolean(sub.default_payment_method || done.payment_method_collection === "always"), `default_payment_method ${sub.default_payment_method ? "set" : "missing"}`);
      expect.push([uid, "two_year", "trialing"]);
    } else {
      console.log("SKIP  hosted Checkout payment (not completed)");
    }

    await replay(since);
    for (const [u, plan, status] of expect) {
      const doc = await emulatorDoc(u);
      check(`emulator billing/${u.replace(/_\d+$/, "")}: ${plan} ${status}`, doc?.plan === plan && doc?.status === status, doc ? `${doc.plan} ${doc.status}` : "no record");
    }
  } finally {
    for (const clock of clocks) await stripe("DELETE", `test_helpers/test_clocks/${clock}`).catch(() => {});
    stopAll();
    restoreDevVars();
  }
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed. Nothing was written outside the local emulator.`);
  process.exit(failed ? 1 : 0);
}

// Ctrl+C must not leave the sandbox key in .dev.vars or the local servers running.
process.on("SIGINT", () => {
  stopAll();
  restoreDevVars();
  process.exit(130);
});

main().catch((err) => {
  console.error(err.message);
  stopAll();
  restoreDevVars();
  process.exit(1);
});
