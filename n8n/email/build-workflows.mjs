/**
 * Generates the email workflows with webinar-emails.js inlined into their
 * Code nodes (n8n Code nodes cannot import files).
 *
 *   node n8n/email/build-workflows.mjs
 *
 * Edit webinar-emails.js or the glue below, then re-run. Never hand-edit the
 * generated JSON — the next build overwrites it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = readFileSync(join(here, "webinar-emails.js"), "utf8");

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

const resendSend = (name) =>
  node(name, "n8n-nodes-base.httpRequest", 4.2, {
    method: "POST",
    url: "https://api.resend.com/emails",
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
    jsonBody: "={{ JSON.stringify($json.payload) }}",
    options: { timeout: 20000 },
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

const workflow = (name, nodes) => ({
  name,
  nodes,
  connections: chain(nodes),
  settings: { executionOrder: "v1", errorWorkflow: FAILURE_ALERTS_WORKFLOW },
  meta: { generatedBy: "n8n/email/build-workflows.mjs — do not edit by hand" },
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

export const BUILD_LOG_ENTRY = `const built = $("Build Confirmation").first().json;
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

export const FAIL_IF_NOT_SENT = `// The log entry is saved first, so the registrant still appears in the morning
// summary. Then a failed send is raised so Failure Alerts hears about it.
const entry = $("Build Log Entry").first().json;
if (entry.status !== "sent") {
  throw new Error(\`Confirmation email not sent for \${entry.log_id}: \${entry.error}\`);
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
  code("Build Log Entry", BUILD_LOG_ENTRY),
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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const outDir = join(here, "..");
  writeFileSync(join(outDir, "webinar-registration-confirmation-workflow.json"), `${JSON.stringify(confirmation, null, 2)}\n`);
  writeFileSync(join(outDir, "webinar-morning-summary-workflow.json"), `${JSON.stringify(summary, null, 2)}\n`);
  console.log("wrote webinar-registration-confirmation-workflow.json and webinar-morning-summary-workflow.json");
}

export { confirmation, summary, TEMPLATE };
