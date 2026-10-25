#!/usr/bin/env node
/**
 * Checks a Firebase service-account key before it becomes the production
 * FIREBASE_SERVICE_ACCOUNT secret. WRITES NOTHING.
 *
 *   node scripts/check-service-account.mjs path/to/key.json [--read-only]
 *
 * 1. The file is a service-account key for the production project
 *    (PRODUCTION_FIREBASE_PROJECT_ID in wrangler.toml).
 * 2. The webhook's own code (_store.js) gets a Google access token with it.
 * 3. Read permission: reads billing/key-check-probe-not-a-customer, a document that doesn't exist (404 = allowed).
 * 4. Write permission: a commit to that same missing document with an
 *    "exists: true" precondition. Firestore checks permission first (403) and
 *    then refuses the precondition (400 FAILED_PRECONDITION) without writing; a re-read proves it.
 */
import { readFileSync } from "node:fs";
import { serviceAccountToken } from "../functions/api/billing/_store.js";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/check-service-account.mjs path/to/key.json");
  process.exit(2);
}
const toml = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
const project = /^PRODUCTION_FIREBASE_PROJECT_ID = "([^"]+)"/m.exec(toml)?.[1];
let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

let sa;
try {
  sa = JSON.parse(readFileSync(file, "utf8"));
} catch (err) {
  console.error(`Not a readable JSON key: ${err.message}`);
  process.exit(1);
}
check("service-account key file", sa.type === "service_account" && Boolean(sa.client_email && sa.private_key));
check(`belongs to the production project ${project}`, sa.project_id === project, `project_id ${sa.project_id}`);
if (failed) process.exit(1);

const env = { FIREBASE_SERVICE_ACCOUNT: JSON.stringify(sa), NEXT_PUBLIC_FIREBASE_PROJECT_ID: project };
let token;
try {
  token = await serviceAccountToken(env);
  check("Google issues a token to the webhook's code", true, sa.client_email);
} catch (err) {
  check("Google issues a token to the webhook's code", false, err.message);
  process.exit(1);
}

// A plain id that never exists. (Ids like "__x__" are reserved by Firestore and answer 400.)
const PROBE = "billing/key-check-probe-not-a-customer";
const docs = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
const auth = { Authorization: `Bearer ${token}` };
const errorOf = async (res) => {
  const e = (await res.json().catch(() => ({})))?.error ?? {};
  return { status: e.status ?? "", message: String(e.message ?? "").slice(0, 160) };
};

const read = await fetch(`${docs}/${PROBE}`, { headers: auth });
const readErr = read.ok ? { status: "EXISTS", message: "" } : await errorOf(read);
check("can read billing records", read.status === 404, `HTTP ${read.status} ${readErr.status} ${readErr.message}`);

if (!process.argv.includes("--read-only") && read.status === 404) {
  // Update with precondition "exists: true" on a missing document: Firestore checks
  // permission first (403 if missing), then refuses the precondition. Nothing is written.
  const write = await fetch(`${docs}:commit`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ writes: [{ update: { name: `projects/${project}/databases/(default)/documents/${PROBE}`, fields: {} }, currentDocument: { exists: true } }] }),
  });
  const w = await errorOf(write);
  check("can write billing records (probe refused by its precondition)", w.status === "FAILED_PRECONDITION" || w.status === "NOT_FOUND", `HTTP ${write.status} ${w.status} ${w.message}`);
  const after = await fetch(`${docs}/${PROBE}`, { headers: auth });
  check("write probe changed nothing (document still absent)", after.status === 404, `HTTP ${after.status}`);
}

// The production site is Pages project "nyrie" in Cloudflare account 6707fe73...; the
// account id is explicit because a stale wrangler cache here points at another account.
console.log(failed ? "\nDo not use this key." : `\nKey is good. When approved, set it as the production secret (the value is read from the file, never shown):\n  CLOUDFLARE_ACCOUNT_ID=6707fe7344e46834fb7d8116ec1acfa0 npx wrangler pages secret put FIREBASE_SERVICE_ACCOUNT --project-name nyrie < "${file}"`);
process.exit(failed ? 1 : 0);
