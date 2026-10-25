// Shared fakes for the billing tests: a fetch that answers Stripe, Google and
// n8n from a route table, and a test environment with sk_test-style values.

export const ENV = {
  STRIPE_SECRET_KEY: "sk_test_fake",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  N8N_BILLING_SECRET: "n8n-secret",
  NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL: "https://n8n.example/webhook",
  NEXT_PUBLIC_FIREBASE_API_KEY: "fb-key",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "proj",
  STRIPE_PRICE_MONTHLY: "price_monthly",
  STRIPE_PRICE_ANNUAL: "price_annual",
  STRIPE_PRICE_TWO_YEAR: "price_two_year",
  STRIPE_PRICE_INTRO: "price_intro",
  APP_URL: "https://app.example",
  PRODUCTION_FIREBASE_PROJECT_ID: "prod-project",
};

export const PRICES = {
  price_monthly: { id: "price_monthly", active: true, type: "recurring", unit_amount: 19900, currency: "usd", recurring: { interval: "month", interval_count: 1 } },
  price_annual: { id: "price_annual", active: true, type: "recurring", unit_amount: 118800, currency: "usd", recurring: { interval: "year", interval_count: 1 } },
  price_two_year: { id: "price_two_year", active: true, type: "recurring", unit_amount: 189600, currency: "usd", recurring: { interval: "year", interval_count: 2 } },
  price_intro: { id: "price_intro", active: true, type: "one_time", unit_amount: 100, currency: "usd" },
};

/**
 * Replaces global fetch. `routes` maps "METHOD path-prefix" to a function
 * (url, init) => body | { httpStatus, body }. Every call is recorded in `calls`.
 */
export function mockFetch(routes) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const method = init.method || "GET";
    calls.push({ method, url: String(url), body: init.body, headers: init.headers });
    for (const [key, handler] of Object.entries(routes)) {
      const [m, prefix] = key.split(" ");
      if (m === method && String(url).startsWith(prefix)) {
        const out = await handler(String(url), init);
        const status = out?.httpStatus ?? 200;
        const body = out?.httpStatus ? out.body : out;
        return new Response(JSON.stringify(body ?? {}), { status });
      }
    }
    throw new Error(`unexpected fetch ${method} ${url}`);
  };
  return calls;
}

/** A Stripe-Signature header for `raw`, as Stripe would send it. */
export async function sign(raw, secret = ENV.STRIPE_WEBHOOK_SECRET, t = Math.floor(Date.now() / 1000)) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${raw}`));
  return `t=${t},v1=${[...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

const DAY = 86_400;
export const now = () => Math.floor(Date.now() / 1000);

/** A subscription as Stripe returns it (API 2025-03-31+: period end on the item). */
export function subscription({ id = "sub_1", status = "trialing", price = PRICES.price_monthly, periodEndDays = 7, uid = "user1", cancelAt = null } = {}) {
  return {
    id,
    status,
    customer: "cus_1",
    metadata: { uid, plan: { price_annual: "annual", price_two_year: "two_year" }[price.id] ?? "monthly", intro: "1" },
    cancel_at_period_end: false,
    cancel_at: cancelAt,
    items: { data: [{ price, current_period_end: now() + periodEndDays * DAY }] },
  };
}

/** A real RSA key pair and service-account JSON, so the JWT the webhook signs can be checked. */
export async function serviceAccount() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const der = Buffer.from(await crypto.subtle.exportKey("pkcs8", pair.privateKey)).toString("base64");
  const pem = `-----BEGIN PRIVATE KEY-----\n${der.match(/.{1,64}/g).join("\n")}\n-----END PRIVATE KEY-----\n`;
  return { json: JSON.stringify({ project_id: "proj", client_email: "billing@proj.iam.gserviceaccount.com", private_key: pem }), publicKey: pair.publicKey };
}

/**
 * In-memory Firestore REST: GET a document, :commit with updateMask and the
 * exists / updateTime preconditions. `beforeCommit` can simulate a write that
 * lands in between.
 */
export function fakeFirestore() {
  const docs = new Map();
  let clock = 0;
  const put = (name, fields) => docs.set(name, { name, fields, updateTime: `2026-01-01T00:00:00.${String(++clock).padStart(6, "0")}Z` });
  const store = {
    docs,
    commits: 0,
    beforeCommit: null,
    put,
    /** billing/{uid} as plain values. */
    get(uid) {
      const d = [...docs.values()].find((x) => x.name.endsWith(`/billing/${uid}`));
      if (!d) return null;
      return Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, v.stringValue ?? v.booleanValue]));
    },
    routes: {
      "GET https://firestore.googleapis.com/v1/projects/": (url) => {
        const name = decodeURIComponent(url.slice("https://firestore.googleapis.com/v1/".length));
        return docs.get(name) ?? { httpStatus: 404, body: { error: { status: "NOT_FOUND" } } };
      },
      "POST https://firestore.googleapis.com/v1/projects/": async (_url, init) => {
        if (store.beforeCommit) {
          const hook = store.beforeCommit;
          store.beforeCommit = null;
          await hook();
        }
        const [w] = JSON.parse(init.body).writes;
        const existing = docs.get(w.update.name);
        const pre = w.currentDocument;
        if ((pre.exists === false && existing) || (pre.updateTime && existing?.updateTime !== pre.updateTime) || (pre.updateTime && !existing)) {
          return { httpStatus: 400, body: { error: { status: "FAILED_PRECONDITION", message: "precondition failed" } } };
        }
        const fields = { ...(existing?.fields ?? {}) };
        for (const path of w.updateMask.fieldPaths) fields[path] = w.update.fields[path];
        put(w.update.name, fields);
        store.commits++;
        return { writeResults: [{}] };
      },
    },
  };
  return store;
}
