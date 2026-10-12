/**
 * Generates the email workflows with templates.js inlined into their
 * Code nodes (n8n Code nodes cannot import files).
 *
 *   node n8n/email/build-workflows.mjs
 *
 * Edit templates.js or the glue below, then re-run. Never hand-edit the
 * generated JSON — the next build overwrites it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = readFileSync(join(here, "templates.js"), "utf8");

const PROJECT_ID = "nirey-f2faf";
const FIRESTORE = { googleApi: { id: "LeMY3R0pzOuv9c8N", name: "Firebase Service Account" } };
// Created by the user in n8n (Header Auth: Authorization = "Bearer re_…").
// On import n8n asks which credential to use if this id does not exist.
const RESEND = { httpHeaderAuth: { id: "REPLACE_WITH_RESEND_CREDENTIAL", name: "Resend API key" } };
const FAILURE_ALERTS_WORKFLOW = "NF9VQqswnNCjyYGc"; // "08 - Failure Alerts", as on the other workflows
const EMAIL_RE = "/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/";

let x = 0;
const node = (name, type, typeVersion, parameters, extra = {}) => ({
  parameters,
  id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
  type,
  typeVersion,
  position: [(x += 220), 0],
  ...extra,
});

const firestoreGet = (name, collection, documentId) =>
  node(name, "n8n-nodes-base.googleFirebaseCloudFirestore", 1.1, {
    authentication: "serviceAccount",
    projectId: PROJECT_ID,
    collection,
    documentId,
  }, {
    // A missing document is a normal outcome (no log yet, no profile yet).
    alwaysOutputData: true,
    onError: "continueRegularOutput",
    credentials: FIRESTORE,
  });

const firestoreUpsert = (name, collection, updateKey, columns) =>
  node(name, "n8n-nodes-base.googleFirebaseCloudFirestore", 1.1, {
    authentication: "serviceAccount",
    operation: "upsert",
    projectId: PROJECT_ID,
    collection,
    updateKey,
    columns: columns.join(","),
  }, { credentials: FIRESTORE });

const resendSend = (name, { url = "https://api.resend.com/emails", body = "={{ JSON.stringify($json.payload) }}" } = {}) =>
  node(name, "n8n-nodes-base.httpRequest", 4.2, {
    method: "POST",
    url,
    authentication: "genericCredentialType",
    genericAuthType: "httpHeaderAuth",
    sendHeaders: true,
    headerParameters: {
      // Resend drops a repeat send with the same key, closing the race where
      // two triggers arrive before either has written its log entry.
      parameters: [{ name: "Idempotency-Key", value: "={{ $json.idempotency_key }}" }],
    },
    sendBody: true,
    specifyBody: "json",
    jsonBody: body,
    options: { timeout: 30000 },
  }, {
    // Failures are recorded in the log and re-raised at the end, so they still
    // reach the Failure Alerts workflow.
    onError: "continueRegularOutput",
    credentials: RESEND,
  });

const code = (name, jsCode, extra = {}) =>
  node(name, "n8n-nodes-base.code", 2, { jsCode }, extra);

const chain = (nodes) => {
  const connections = {};
  for (let i = 0; i < nodes.length - 1; i += 1) {
    connections[nodes[i].name] = { main: [[{ node: nodes[i + 1].name, type: "main", index: 0 }]] };
  }
  return connections;
};

/** Linear by default; pass explicit connections for workflows that branch. */
const workflow = (name, nodes, connections = chain(nodes)) => ({
  name,
  nodes,
  connections,
  settings: { executionOrder: "v1", errorWorkflow: FAILURE_ALERTS_WORKFLOW },
  meta: { generatedBy: "n8n/email/build-workflows.mjs — do not edit by hand" },
});

const link = (connections, from, to, output = 0) => {
  connections[from] ??= { main: [] };
  while (connections[from].main.length <= output) connections[from].main.push([]);
  connections[from].main[output].push({ node: to, type: "main", index: 0 });
};

// Same Firebase ID-token check the chat, offer and deck workflows use.
const FIREBASE_WEB_API_KEY = "AIzaSyDEc-zNxEGcYEpKFKuSgZUllsCTQ1xSCdg"; // public web key, already shipped in the app
const verifyFirebaseToken = (name) =>
  node(name, "n8n-nodes-base.httpRequest", 4.2, {
    method: "POST",
    url: `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={{ JSON.stringify({ idToken: $json.id_token }) }}",
    options: { timeout: 10000 },
  }, { onError: "continueRegularOutput" });

const EXTRACT_BEARER = `const headers = $json.headers ?? {};
const raw = headers.authorization ?? headers.Authorization ?? "";
const token = String(raw).replace(/^Bearer\\s+/i, "").trim();
if (!token || token.length > 8192) return [];
return [{ json: { id_token: token, body: $json.body ?? {} } }];`;

const ifPositive = (name, expression) =>
  node(name, "n8n-nodes-base.if", 2.2, {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 1 },
      conditions: [{ leftValue: expression, operator: { type: "number", operation: "gt" }, rightValue: 0 }],
      combinator: "and",
    },
    options: {},
  });

const respond = (name, body, status) =>
  node(name, "n8n-nodes-base.respondToWebhook", 1.4, {
    respondWith: "json",
    responseBody: `={{ JSON.stringify(${body}) }}`,
    options: { responseCode: status },
  });

// ─────────────────────────────── Confirmation ───────────────────────────────

export const VALIDATE_REQUEST = `// Only ids are accepted. The address is read from Firestore below and never
// taken from the request, so this webhook cannot mail arbitrary people.
const body = $json.body ?? {};
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const webinarId = String(body.webinar_id ?? "");
const registrantId = String(body.registrant_id ?? "");
if (!ID.test(webinarId) || !ID.test(registrantId)) return [];
return [{
  json: {
    webinar_id: webinarId,
    registrant_id: registrantId,
    // Only used to format the session time in the visitor's own timezone.
    timezone: String(body.timezone ?? "").slice(0, 64),
    log_id: \`confirm_\${webinarId}_\${registrantId}\`,
  },
}];`;

export const BUILD_CONFIRMATION_GLUE = `
const EMAIL = ${EMAIL_RE};
const first = (name) => { try { return $(name).first()?.json ?? {}; } catch { return {}; } };
const req = first("Validate Request");
const log = first("Load Email Log");
const webinar = { ...first("Load Webinar"), id: req.webinar_id };
const registrant = first("Load Registrant");
const owner = first("Load Owner");
const memory = first("Load Owner Memory");

// Already handled: a retry or a replayed request. Never email twice.
if (log.log_id || log.status) return [];
if (webinar.status !== "published") return [];
const to = String(registrant.email ?? "").trim().toLowerCase();
if (!EMAIL.test(to)) return [];
// Fresh registrations only, so nobody can replay an old id to resend.
const created = Date.parse(registrant._createTime ?? "");
if (!Number.isFinite(created) || Date.now() - created > 2 * 60 * 60 * 1000) return [];

const ownerEmail = [owner.email, memory.email]
  .map((e) => String(e ?? "").trim())
  .find((e) => EMAIL.test(e)) || "";

const email = confirmationEmail({
  webinar,
  registrant: { name: registrant.name, email: to },
  timezone: req.timezone,
});
const payload = {
  from: email.from,
  to: [to],
  subject: email.subject,
  html: email.html,
  text: email.text,
  tags: [{ name: "type", value: "registration_confirmation" }],
};
// Replies reach the webinar's owner, not a shared inbox.
if (ownerEmail) payload.reply_to = ownerEmail;
if (email.attachments.length) payload.attachments = email.attachments;

return [{
  json: {
    payload,
    idempotency_key: req.log_id,
    log: {
      log_id: req.log_id,
      type: "confirmation",
      webinar_id: req.webinar_id,
      webinar_title: String(webinar.title ?? "").slice(0, 200),
      registrant_id: req.registrant_id,
      registrant_name: String(registrant.name ?? "").slice(0, 120),
      registrant_email: to,
      owner_id: String(webinar.owner_id ?? ""),
      owner_email: ownerEmail,
      owner_name: String(owner.displayName ?? "").slice(0, 120),
      owner_timezone: String(webinar.owner_timezone ?? "UTC").slice(0, 64),
    },
  },
}];`;

export const logEntryCode = (buildNode) => `const built = $("${buildNode}").first().json;
const res = $input.first().json ?? {};
const sent = typeof res.id === "string" && res.id.length > 0;
return [{
  json: {
    ...built.log,
    status: sent ? "sent" : "failed",
    resend_id: sent ? res.id : "",
    error: sent ? "" : String(res.error?.message ?? res.message ?? res.error ?? "unknown").slice(0, 300),
    // ISO UTC, so the morning summary can range-query it as a string.
    created_at: new Date().toISOString(),
  },
}];`;

export const FAIL_IF_NOT_SENT = `// The log entry is saved first (for a confirmation, that keeps the registrant
// in the morning summary). Then a failed send is raised so Failure Alerts
// hears about it.
const entry = $("Build Log Entry").first().json;
if (entry.status !== "sent") {
  throw new Error(\`Email not sent for \${entry.log_id}: \${entry.error}\`);
}
return $input.all();`;

const LOG_COLUMNS = [
  "log_id", "type", "status", "webinar_id", "webinar_title", "registrant_id",
  "registrant_name", "registrant_email", "owner_id", "owner_email", "owner_name",
  "owner_timezone", "resend_id", "error", "created_at",
];

x = 0;
const confirmation = workflow("10 - Webinar Registration Confirmation", [
  node("Registration Webhook", "n8n-nodes-base.webhook", 2, {
    httpMethod: "POST",
    path: "webinar-registered",
    // Answer the browser at once; the email is sent in the background.
    responseMode: "onReceived",
    options: {},
  }, { webhookId: "webinar-registered" }),
  code("Validate Request", VALIDATE_REQUEST),
  firestoreGet("Load Email Log", "email_log", "={{ $json.log_id }}"),
  firestoreGet("Load Webinar", "webinars", "={{ $('Validate Request').first().json.webinar_id }}"),
  firestoreGet(
    "Load Registrant",
    "={{ 'webinars/' + $('Validate Request').first().json.webinar_id + '/registrants' }}",
    "={{ $('Validate Request').first().json.registrant_id }}",
  ),
  firestoreGet("Load Owner", "users", "={{ $('Load Webinar').first().json.owner_id || 'no-owner' }}"),
  firestoreGet("Load Owner Memory", "workspace_memory", "={{ $('Load Webinar').first().json.owner_id || 'no-owner' }}"),
  code("Build Confirmation", `${TEMPLATE}\n// ── glue ──\n${BUILD_CONFIRMATION_GLUE}`),
  resendSend("Send via Resend"),
  code("Build Log Entry", logEntryCode("Build Confirmation")),
  firestoreUpsert("Save Email Log", "email_log", "log_id", LOG_COLUMNS),
  code("Fail If Not Sent", FAIL_IF_NOT_SENT),
]);

// ───────────────────────────── Morning summary ─────────────────────────────

export const WINDOW = `// Runs hourly. Each owner is summarised at 7am in THEIR timezone, covering
// the 24 hours before.
const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const query = {
  from: [{ collectionId: "email_log" }],
  where: {
    fieldFilter: {
      field: { fieldPath: "created_at" },
      op: "GREATER_THAN_OR_EQUAL",
      value: { stringValue: since },
    },
  },
};
return [{ json: { since, query: JSON.stringify(query) } }];`;

export const BUILD_SUMMARIES_GLUE = `
const EMAIL = ${EMAIL_RE};
const all = (name) => { try { return $(name).all().map((i) => i.json); } catch { return []; } };
const logs = all("Recent Registrations")
  .filter((l) => l && l.type === "confirmation" && l.owner_id && l.registrant_email);
const state = new Map(all("Summary State").filter((s) => s && s.owner_id).map((s) => [s.owner_id, s]));
const now = Date.now();

const byOwner = new Map();
for (const l of logs) {
  if (!byOwner.has(l.owner_id)) byOwner.set(l.owner_id, []);
  byOwner.get(l.owner_id).push(l);
}

const out = [];
for (const [ownerId, rows] of byOwner) {
  rows.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const latest = rows[rows.length - 1];
  const tz = safeTimezone(latest.owner_timezone);
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(new Date(now)));
  if (hour !== 7) continue;

  // Already sent today (a re-run, or the hourly trigger firing twice).
  const last = Date.parse(state.get(ownerId)?.last_summary_at ?? "");
  if (Number.isFinite(last) && now - last < 20 * 60 * 60 * 1000) continue;

  const to = rows.map((r) => String(r.owner_email ?? "").trim()).reverse().find((e) => EMAIL.test(e));
  if (!to) continue;

  // One section per webinar; the same person registering twice counts once.
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.webinar_id)) groups.set(r.webinar_id, { webinar: { id: r.webinar_id, title: r.webinar_title }, fresh: [], seen: new Set() });
    const g = groups.get(r.webinar_id);
    if (g.seen.has(r.registrant_email)) continue;
    g.seen.add(r.registrant_email);
    g.fresh.push({ name: r.registrant_name, email: r.registrant_email });
  }

  const email = digestEmail({
    ownerName: latest.owner_name || "",
    groups: [...groups.values()].map(({ webinar, fresh }) => ({ webinar, fresh })),
  });
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(now));
  out.push({
    json: {
      owner_id: ownerId,
      idempotency_key: \`summary_\${ownerId}_\${localDate}\`,
      payload: {
        from: email.from,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        tags: [{ name: "type", value: "owner_daily_summary" }],
      },
    },
  });
}
return out;`;

export const STATE_ENTRIES = `// Pairs each Resend response with the summary it sent (same order), and only
// records owners whose email actually went out.
const built = $("Build Summaries").all();
return $input.all().flatMap((item, i) => {
  const ok = typeof item.json?.id === "string" && item.json.id.length > 0;
  if (!ok) return [];
  return [{ json: { owner_id: built[i].json.owner_id, last_summary_at: new Date().toISOString() } }];
});`;

x = 0;
const summary = workflow("11 - Webinar Morning Summary", [
  node("Every Hour", "n8n-nodes-base.scheduleTrigger", 1.2, {
    rule: { interval: [{ field: "hours", hoursInterval: 1, triggerAtMinute: 5 }] },
  }),
  code("Window", WINDOW),
  node("Recent Registrations", "n8n-nodes-base.googleFirebaseCloudFirestore", 1.1, {
    authentication: "serviceAccount",
    operation: "query",
    projectId: PROJECT_ID,
    query: "={{ $json.query }}",
  }, { alwaysOutputData: true, onError: "continueRegularOutput", credentials: FIRESTORE }),
  node("Summary State", "n8n-nodes-base.googleFirebaseCloudFirestore", 1.1, {
    authentication: "serviceAccount",
    operation: "getAll",
    projectId: PROJECT_ID,
    collection: "email_state",
    returnAll: true,
  }, {
    // Without this it would re-read the whole collection once per log entry.
    executeOnce: true,
    alwaysOutputData: true,
    onError: "continueRegularOutput",
    credentials: FIRESTORE,
  }),
  code("Build Summaries", `${TEMPLATE}\n// ── glue ──\n${BUILD_SUMMARIES_GLUE}`),
  resendSend("Send via Resend"),
  code("State Entries", STATE_ENTRIES),
  firestoreUpsert("Save Summary State", "email_state", "owner_id", ["owner_id", "last_summary_at"]),
]);

// ──────────────────────────────── Welcome ────────────────────────────────

export const NORMALIZE_NEW_USER = `const EMAIL = ${EMAIL_RE};
const user = $json.users?.[0] ?? {};
const uid = String(user.localId ?? "");
const email = String(user.email ?? "").trim().toLowerCase();
if (!uid || !EMAIL.test(email)) return [];
// Only genuinely new accounts. The users collection is newer than many
// accounts, so "no profile yet" alone would welcome long-standing users on
// their next login. Firebase's own createdAt (ms) is the truth.
const created = Number(user.createdAt);
if (!Number.isFinite(created) || Date.now() - created > 24 * 60 * 60 * 1000) return [];
return [{ json: { uid, email, name: String(user.displayName ?? ""), log_id: \`welcome_\${uid}\` } }];`;

export const BUILD_WELCOME_GLUE = `
const req = $("Normalize User").first().json;
const log = (() => { try { return $("Load Email Log").first()?.json ?? {}; } catch { return {}; } })();
if (log.log_id || log.status) return []; // welcomed already
const email = welcomeEmail({ name: req.name, email: req.email });
return [{
  json: {
    payload: {
      from: email.from,
      to: [req.email],
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [{ name: "type", value: "welcome" }],
    },
    idempotency_key: req.log_id,
    log: { log_id: req.log_id, type: "welcome", uid: req.uid, to: req.email },
  },
}];`;

x = 0;
const welcome = workflow("12 - Welcome Email", [
  node("Signup Webhook", "n8n-nodes-base.webhook", 2, {
    httpMethod: "POST",
    path: "user-welcome",
    responseMode: "onReceived",
    options: {},
  }, { webhookId: "user-welcome" }),
  code("Extract Bearer Token", EXTRACT_BEARER),
  verifyFirebaseToken("Verify Firebase Token"),
  code("Normalize User", NORMALIZE_NEW_USER),
  firestoreGet("Load Email Log", "email_log", "={{ $json.log_id }}"),
  code("Build Welcome", `${TEMPLATE}\n// ── glue ──\n${BUILD_WELCOME_GLUE}`),
  resendSend("Send via Resend"),
  code("Build Log Entry", logEntryCode("Build Welcome")),
  firestoreUpsert("Save Email Log", "email_log", "log_id", ["log_id", "type", "status", "uid", "to", "resend_id", "error", "created_at"]),
  code("Fail If Not Sent", FAIL_IF_NOT_SENT),
]);

// ───────────────────────────── Admin broadcast ─────────────────────────────

export const CALLER = `const user = $json.users?.[0] ?? {};
const uid = String(user.localId ?? "");
if (!uid) return [];
return [{
  json: {
    uid,
    email: String(user.email ?? "").trim().toLowerCase(),
    body: $("Extract Bearer Token").first().json.body ?? {},
  },
}];`;

export const AUTHORIZE = `// Admin = the same three markers the rules' isAdmin() and the app's
// checkIsAdmin() use. Anything else is dropped without a trace.
const first = (name) => { try { return $(name).first()?.json ?? {}; } catch { return {}; } };
const caller = first("Caller");
const isAdmin = [first("Load Caller User"), first("Load Caller Admin"), first("Load Caller Memory")]
  .some((doc) => doc && doc.admin === true);
if (!isAdmin) return [];

const body = caller.body ?? {};
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const broadcastId = String(body.broadcast_id ?? "");
const subject = String(body.subject ?? "").trim();
const message = String(body.message ?? "").trim();
const uids = Array.isArray(body.recipient_uids) ? body.recipient_uids.map(String) : [];
if (!/^[A-Za-z0-9_-]{8,64}$/.test(broadcastId)) return [];
if (!subject || subject.length > 150 || !message || message.length > 10000) return [];
if (uids.length > 5000 || !uids.every((u) => ID.test(u))) return [];

return [{
  json: {
    broadcast_id: broadcastId,
    subject,
    message,
    test: body.test === true,
    recipient_uids: uids,
    caller_uid: caller.uid,
    caller_email: caller.email,
  },
}];`;

export const PREPARE_RECIPIENTS = `const EMAIL = ${EMAIL_RE};
const req = $("Authorize").first().json;
const all = (name) => { try { return $(name).all().map((i) => i.json); } catch { return []; } };
const idOf = (doc) => String(doc.uid ?? doc._id ?? "");
const users = new Map(all("All Users").filter((u) => u && idOf(u)).map((u) => [idOf(u), u]));
const prefs = new Map(all("All Prefs").filter((p) => p && idOf(p)).map((p) => [idOf(p), p]));

// Not cryptographic (crypto is unavailable in this sandbox). The worst a
// guessed token allows is unsubscribing someone from announcements.
const newToken = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

// A test goes only to the admin who pressed the button, even if they have
// unsubscribed themselves.
const wanted = req.test ? [req.caller_uid] : [...new Set(req.recipient_uids)];
const seenEmails = new Set();
let skippedOptedOut = 0;
let skippedNoEmail = 0;
const recipients = [];
for (const uid of wanted) {
  const user = users.get(uid);
  const email = String(user?.email ?? "").trim().toLowerCase();
  if (!user || !EMAIL.test(email)) { skippedNoEmail += 1; continue; }
  const pref = prefs.get(uid) ?? {};
  if (pref.opted_out === true && !req.test) { skippedOptedOut += 1; continue; }
  if (seenEmails.has(email)) continue;
  seenEmails.add(email);
  recipients.push({
    uid,
    email,
    name: String(user.displayName ?? ""),
    unsubscribe_token: String(pref.unsubscribe_token ?? "") || newToken(),
    // Written back unchanged with the token, so saving a token can never
    // clear someone's opt-out, whatever the upsert's merge behaviour.
    opted_out: pref.opted_out === true,
  });
}

const stats = { requested: wanted.length, skipped_opted_out: skippedOptedOut, skipped_no_email: skippedNoEmail };
if (!recipients.length) return [{ json: { empty: true, ...stats } }];
return recipients.map((r) => ({ json: { ...r, ...stats } }));`;

export const BUILD_BATCHES_GLUE = `
const req = $("Authorize").first().json;
const recipients = $("Prepare Recipients").all().map((i) => i.json);
const subject = req.test ? \`[Test] \${req.subject}\` : req.subject;
const payloads = recipients.map((r) => {
  const email = broadcastEmail({
    subject,
    message: req.message,
    recipient: { uid: r.uid, name: r.name, email: r.email, token: r.unsubscribe_token },
  });
  return {
    from: email.from,
    to: [r.email],
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: email.headers,
    tags: [{ name: "type", value: req.test ? "broadcast_test" : "broadcast" }],
  };
});
// Resend's batch endpoint takes up to 100 emails per call.
const batches = [];
for (let i = 0; i < payloads.length; i += 100) {
  batches.push({ json: { batch: payloads.slice(i, i + 100), idempotency_key: \`\${req.broadcast_id}-\${i / 100}\` } });
}
return batches;`;

export const SUMMARIZE_BROADCAST = `const req = $("Authorize").first().json;
const stats = $("Prepare Recipients").first().json;
const batches = $("Build Batches").all().map((i) => i.json.batch.length);
let sent = 0;
let failed = 0;
const errors = [];
$input.all().forEach((item, i) => {
  const res = item.json ?? {};
  if (Array.isArray(res.data)) sent += res.data.length;
  else {
    failed += batches[i] ?? 0;
    errors.push(String(res.error?.message ?? res.message ?? res.error ?? "unknown").slice(0, 200));
  }
});
return [{
  json: {
    broadcast_id: req.broadcast_id,
    status: failed === 0 ? "sent" : sent > 0 ? "partial" : "failed",
    subject: req.subject,
    test: req.test,
    requested: stats.requested,
    sent,
    failed,
    skipped_opted_out: stats.skipped_opted_out,
    skipped_no_email: stats.skipped_no_email,
    error: errors.join(" | ").slice(0, 500),
    sent_by_uid: req.caller_uid,
    sent_by_email: req.caller_email,
    created_at: new Date().toISOString(),
  },
}];`;

export const NOTHING_TO_SEND = `const req = $("Authorize").first().json;
const stats = $input.first().json;
return [{
  json: {
    broadcast_id: req.broadcast_id,
    status: "empty",
    subject: req.subject,
    test: req.test,
    requested: stats.requested ?? 0,
    sent: 0,
    failed: 0,
    skipped_opted_out: stats.skipped_opted_out ?? 0,
    skipped_no_email: stats.skipped_no_email ?? 0,
    error: "",
    sent_by_uid: req.caller_uid,
    sent_by_email: req.caller_email,
    created_at: new Date().toISOString(),
  },
}];`;

export const FAIL_IF_BROADCAST_FAILED = `// The result is saved first so the admin page shows what happened; then a
// failure is raised for Failure Alerts.
// Read the result from whichever branch ran, not from the database write's
// response, whose shape is not guaranteed.
const pick = (name) => { try { return $(name).first()?.json; } catch { return undefined; } };
const result = pick("Summarize") ?? pick("Nothing To Send") ?? $input.first().json;
if (result.status === "failed" || result.status === "partial") {
  throw new Error(\`Broadcast \${result.broadcast_id}: \${result.failed} failed — \${result.error}\`);
}
return $input.all();`;

const BROADCAST_COLUMNS = [
  "broadcast_id", "status", "subject", "test", "requested", "sent", "failed",
  "skipped_opted_out", "skipped_no_email", "error", "sent_by_uid", "sent_by_email", "created_at",
];

x = 0;
const broadcastNodes = [
  node("Broadcast Webhook", "n8n-nodes-base.webhook", 2, {
    httpMethod: "POST",
    path: "admin-broadcast",
    // The admin page follows progress through broadcasts/{id}, so answer now
    // rather than holding the request open while batches send.
    responseMode: "onReceived",
    options: {},
  }, { webhookId: "admin-broadcast" }),
  code("Extract Bearer Token", EXTRACT_BEARER),
  verifyFirebaseToken("Verify Firebase Token"),
  code("Caller", CALLER),
  firestoreGet("Load Caller User", "users", "={{ $json.uid }}"),
  firestoreGet("Load Caller Admin", "admins", "={{ $('Caller').first().json.email || 'no-email' }}"),
  firestoreGet("Load Caller Memory", "workspace_memory", "={{ $('Caller').first().json.uid }}"),
  code("Authorize", AUTHORIZE),
  node("All Users", "n8n-nodes-base.googleFirebaseCloudFirestore", 1.1, {
    authentication: "serviceAccount", operation: "getAll", projectId: PROJECT_ID, collection: "users", returnAll: true,
  }, { executeOnce: true, alwaysOutputData: true, onError: "continueRegularOutput", credentials: FIRESTORE }),
  node("All Prefs", "n8n-nodes-base.googleFirebaseCloudFirestore", 1.1, {
    authentication: "serviceAccount", operation: "getAll", projectId: PROJECT_ID, collection: "email_prefs", returnAll: true,
  }, { executeOnce: true, alwaysOutputData: true, onError: "continueRegularOutput", credentials: FIRESTORE }),
  code("Prepare Recipients", PREPARE_RECIPIENTS),
  ifPositive("Has Recipients", "={{ $json.empty ? 0 : 1 }}"),
  firestoreUpsert("Save Unsubscribe Tokens", "email_prefs", "uid", ["uid", "unsubscribe_token", "opted_out"]),
  code("Build Batches", `${TEMPLATE}\n// ── glue ──\n${BUILD_BATCHES_GLUE}`, { executeOnce: true }),
  resendSend("Send Batch", { url: "https://api.resend.com/emails/batch", body: "={{ JSON.stringify($json.batch) }}" }),
  code("Summarize", SUMMARIZE_BROADCAST),
  code("Nothing To Send", NOTHING_TO_SEND),
  firestoreUpsert("Save Result", "broadcasts", "broadcast_id", BROADCAST_COLUMNS),
  code("Fail If Broadcast Failed", FAIL_IF_BROADCAST_FAILED),
];
const broadcastConnections = {};
[
  "Broadcast Webhook", "Extract Bearer Token", "Verify Firebase Token", "Caller", "Load Caller User",
  "Load Caller Admin", "Load Caller Memory", "Authorize", "All Users", "All Prefs", "Prepare Recipients", "Has Recipients",
].reduce((prev, next) => (link(broadcastConnections, prev, next), next));
link(broadcastConnections, "Has Recipients", "Save Unsubscribe Tokens", 0);
link(broadcastConnections, "Save Unsubscribe Tokens", "Build Batches");
link(broadcastConnections, "Build Batches", "Send Batch");
link(broadcastConnections, "Send Batch", "Summarize");
link(broadcastConnections, "Summarize", "Save Result");
link(broadcastConnections, "Has Recipients", "Nothing To Send", 1);
link(broadcastConnections, "Nothing To Send", "Save Result");
link(broadcastConnections, "Save Result", "Fail If Broadcast Failed");
const broadcast = workflow("13 - Admin Broadcast", broadcastNodes, broadcastConnections);

// ─────────────────────────────── Unsubscribe ───────────────────────────────

export const VALIDATE_UNSUBSCRIBE = `// From the confirm page (JSON body) or Gmail/Yahoo one-click (query string,
// form body "List-Unsubscribe=One-Click").
const q = $json.query ?? {};
const b = typeof $json.body === "object" && $json.body ? $json.body : {};
const uid = String(q.u ?? b.u ?? "");
const token = String(q.t ?? b.t ?? "");
const ok = /^[A-Za-z0-9_-]{1,128}$/.test(uid) && /^[a-f0-9]{16,64}$/.test(token);
return [{ json: { ok, uid: ok ? uid : "", token: ok ? token : "" } }];`;

export const CHECK_TOKEN = `const req = $("Validate").first().json;
const pref = $input.first()?.json ?? {};
const valid = req.ok && typeof pref.unsubscribe_token === "string" && pref.unsubscribe_token === req.token;
if (!valid) return [{ json: { valid: 0 } }];
return [{
  json: {
    valid: 1,
    uid: req.uid,
    unsubscribe_token: req.token,
    opted_out: true,
    opted_out_at: new Date().toISOString(),
  },
}];`;

x = 0;
const unsubscribeNodes = [
  node("Unsubscribe Webhook", "n8n-nodes-base.webhook", 2, {
    httpMethod: "POST",
    path: "email-unsubscribe",
    responseMode: "responseNode",
    options: {},
  }, { webhookId: "email-unsubscribe" }),
  code("Validate", VALIDATE_UNSUBSCRIBE),
  firestoreGet("Load Prefs", "email_prefs", "={{ $json.uid || 'invalid' }}"),
  code("Check Token", CHECK_TOKEN),
  ifPositive("Valid Link", "={{ $json.valid }}"),
  firestoreUpsert("Save Opt-out", "email_prefs", "uid", ["uid", "unsubscribe_token", "opted_out", "opted_out_at"]),
  respond("Respond Unsubscribed", "{ ok: true }", 200),
  respond("Respond Invalid", "{ ok: false, error: 'This unsubscribe link is not valid.' }", 400),
];
const unsubscribeConnections = {};
["Unsubscribe Webhook", "Validate", "Load Prefs", "Check Token", "Valid Link"]
  .reduce((prev, next) => (link(unsubscribeConnections, prev, next), next));
link(unsubscribeConnections, "Valid Link", "Save Opt-out", 0);
link(unsubscribeConnections, "Save Opt-out", "Respond Unsubscribed");
link(unsubscribeConnections, "Valid Link", "Respond Invalid", 1);
const unsubscribe = workflow("14 - Email Unsubscribe", unsubscribeNodes, unsubscribeConnections);

const OUTPUTS = {
  "webinar-registration-confirmation-workflow.json": confirmation,
  "webinar-morning-summary-workflow.json": summary,
  "welcome-email-workflow.json": welcome,
  "admin-broadcast-workflow.json": broadcast,
  "email-unsubscribe-workflow.json": unsubscribe,
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const outDir = join(here, "..");
  for (const [file, wf] of Object.entries(OUTPUTS)) {
    writeFileSync(join(outDir, file), `${JSON.stringify(wf, null, 2)}\n`);
    console.log(`wrote n8n/${file}`);
  }
}

export { confirmation, summary, welcome, broadcast, unsubscribe, TEMPLATE };
