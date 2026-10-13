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
// Emails go out through the Explosion Marketing Google Workspace account,
// connected in n8n with "Sign in with Google" (Gmail OAuth2). The From address
// is whichever account is connected. On import n8n asks which credential to
// use if this id does not exist.
// The Gmail login saved in the explosionmarketing n8n instance (an id, not a secret).
const GMAIL = { gmailOAuth2: { id: "wRAdlx4C2JELtf3I", name: "bibeks gmail" } };
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

/**
 * One email per input item, through Gmail. `replyTo` routes replies to the
 * webinar owner; `invite` attaches the binary property "invite" (.ics).
 */
const emailSend = (name, { replyTo = false, invite = false } = {}) =>
  node(name, "n8n-nodes-base.gmail", 2.1, {
    resource: "message",
    operation: "send",
    sendTo: "={{ $json.payload.to }}",
    subject: "={{ $json.payload.subject }}",
    emailType: "html",
    message: "={{ $json.payload.html }}",
    options: {
      appendAttribution: false,
      senderName: "={{ $json.payload.senderName }}",
      ...(replyTo ? { replyTo: "={{ $json.payload.replyTo }}" } : {}),
      ...(invite ? { attachmentsUi: { attachmentsBinary: [{ property: "invite" }] } } : {}),
    },
  }, {
    // Failures are recorded and re-raised at the end, so they still reach the
    // Failure Alerts workflow.
    onError: "continueRegularOutput",
    credentials: GMAIL,
  });

const code = (name, jsCode, extra = {}) =>
  node(name, "n8n-nodes-base.code", 2, { jsCode }, extra);

/**
 * Prepended to every node that reads a send result. A successful Gmail send
 * returns the message { id, threadId, labelIds }; a failure (with "continue on
 * error") returns { error }.
 */
const OUTCOME = `function sendOutcome(res) {
  if (res && typeof res.id === "string" && res.id.length > 0) return { ok: true, detail: res.id };
  const err = res && res.error;
  const message = String((err && (err.message ?? err.description)) ?? err ?? (res && res.message) ?? "unknown");
  return { ok: false, detail: message.slice(0, 300) };
}
`;

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
// Private to the host; only ever sent to people who registered.
const session = first("Load Session Link");

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
  joinUrl: session.join_url,
});
// Replies reach the webinar's owner, not a shared inbox. With no owner email
// they fall back to the sending account itself.
const payload = gmailPayload(email, { to, replyTo: ownerEmail || undefined });

// The .ics invite travels as n8n binary data for the Gmail node to attach.
const invite = email.attachments[0];
const binary = invite
  ? { invite: { data: invite.content, mimeType: invite.type, fileName: invite.filename } }
  : undefined;

return [{
  ...(binary ? { binary } : {}),
  json: {
    payload,
    has_invite: binary ? 1 : 0,
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

export const logEntryCode = (buildNode) => `${OUTCOME}
const built = $("${buildNode}").first().json;
const outcome = sendOutcome($input.first().json ?? {});
return [{
  json: {
    ...built.log,
    status: outcome.ok ? "sent" : "failed",
    delivery: outcome.ok ? outcome.detail : "",
    error: outcome.ok ? "" : outcome.detail,
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
  "owner_timezone", "delivery", "error", "created_at",
];

x = 0;
const confirmationNodes = [
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
  firestoreGet(
    "Load Session Link",
    "={{ 'webinars/' + $('Validate Request').first().json.webinar_id + '/private' }}",
    "session",
  ),
  code("Build Confirmation", `${TEMPLATE}\n// ── glue ──\n${BUILD_CONFIRMATION_GLUE}`),
  // A webinar without a date has no invite; attaching a missing file fails.
  ifPositive("Has Invite", "={{ $json.has_invite }}"),
  emailSend("Send With Invite", { replyTo: true, invite: true }),
  emailSend("Send Email", { replyTo: true }),
  code("Build Log Entry", logEntryCode("Build Confirmation")),
  firestoreUpsert("Save Email Log", "email_log", "log_id", LOG_COLUMNS),
  code("Fail If Not Sent", FAIL_IF_NOT_SENT),
];
const confirmationConnections = {};
[
  "Registration Webhook", "Validate Request", "Load Email Log", "Load Webinar", "Load Registrant",
  "Load Owner", "Load Owner Memory", "Load Session Link", "Build Confirmation", "Has Invite",
].reduce((prev, next) => (link(confirmationConnections, prev, next), next));
link(confirmationConnections, "Has Invite", "Send With Invite", 0);
link(confirmationConnections, "Has Invite", "Send Email", 1);
link(confirmationConnections, "Send With Invite", "Build Log Entry");
link(confirmationConnections, "Send Email", "Build Log Entry");
link(confirmationConnections, "Build Log Entry", "Save Email Log");
link(confirmationConnections, "Save Email Log", "Fail If Not Sent");
const confirmation = workflow("10 - Webinar Registration Confirmation", confirmationNodes, confirmationConnections);

// ───────────────────────────── Morning summary ─────────────────────────────

export const WINDOW = `// Runs hourly. Each owner is summarised at 7am in THEIR timezone, covering
// the 24 hours before.
const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
// The Firestore node posts this body to :runQuery as-is, so it must be
// wrapped in structuredQuery.
const query = {
  structuredQuery: {
    from: [{ collectionId: "email_log" }],
    where: {
      fieldFilter: {
        field: { fieldPath: "created_at" },
        op: "GREATER_THAN_OR_EQUAL",
        value: { stringValue: since },
      },
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
      payload: gmailPayload(email, { to }),
    },
  });
}
return out;`;

export const STATE_ENTRIES = `${OUTCOME}
// Pairs each send result with the summary it sent (same order), and only
// records owners whose email actually went out.
const built = $("Build Summaries").all();
return $input.all().flatMap((item, i) => {
  if (!sendOutcome(item.json ?? {}).ok) return [];
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
  }, {
    // A failed query must stop the run (and reach Failure Alerts). Continuing
    // past it made the summary silently never send.
    alwaysOutputData: true,
    onError: "stopWorkflow",
    credentials: FIRESTORE,
  }),
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
  emailSend("Send Email"),
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
    payload: gmailPayload(email, { to: req.email }),
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
  emailSend("Send Email"),
  code("Build Log Entry", logEntryCode("Build Welcome")),
  firestoreUpsert("Save Email Log", "email_log", "log_id", ["log_id", "type", "status", "uid", "to", "delivery", "error", "created_at"]),
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

export const BUILD_EMAILS_GLUE = `
const req = $("Authorize").first().json;
const recipients = $("Prepare Recipients").all().map((i) => i.json);
const subject = req.test ? \`[Test] \${req.subject}\` : req.subject;
// One email per person: keeps addresses private and unsubscribe links personal.
return recipients.map((r) => {
  const email = broadcastEmail({
    subject,
    message: req.message,
    recipient: { uid: r.uid, name: r.name, email: r.email, token: r.unsubscribe_token },
  });
  return { json: { payload: gmailPayload(email, { to: r.email }) } };
});`;

export const SUMMARIZE_BROADCAST = `${OUTCOME}
const req = $("Authorize").first().json;
const stats = $("Prepare Recipients").first().json;
let sent = 0;
let failed = 0;
const errors = new Set();
for (const item of $input.all()) {
  const outcome = sendOutcome(item.json ?? {});
  if (outcome.ok) sent += 1;
  else {
    failed += 1;
    errors.add(outcome.detail);
  }
}
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
    error: [...errors].join(" | ").slice(0, 500),
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
  code("Build Emails", `${TEMPLATE}\n// ── glue ──\n${BUILD_EMAILS_GLUE}`, { executeOnce: true }),
  emailSend("Send Email"),
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
link(broadcastConnections, "Save Unsubscribe Tokens", "Build Emails");
link(broadcastConnections, "Build Emails", "Send Email");
link(broadcastConnections, "Send Email", "Summarize");
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

// ──────────────────────────────── Reminders ────────────────────────────────

export const REMINDER_WINDOW = `// Runs every 15 minutes. Finds sessions starting within the next day; the
// next node decides which reminder (if any) each one is due.
const now = Date.now();
const from = new Date(now).toISOString();
const to = new Date(now + 25 * 60 * 60 * 1000).toISOString();
// next_session_at is an ISO string, so a string range is a time range. A
// single-field range needs no composite index; "published" is checked after.
const query = {
  structuredQuery: {
    from: [{ collectionId: "webinars" }],
    where: {
      compositeFilter: {
        op: "AND",
        filters: [
          { fieldFilter: { field: { fieldPath: "next_session_at" }, op: "GREATER_THAN", value: { stringValue: from } } },
          { fieldFilter: { field: { fieldPath: "next_session_at" }, op: "LESS_THAN_OR_EQUAL", value: { stringValue: to } } },
        ],
      },
    },
  },
};
return [{ json: { query: JSON.stringify(query) } }];`;

export const DUE_REMINDERS = `// One item per webinar that has a reminder due and not yet sent for THIS
// session date (so a rescheduled or re-run webinar gets fresh reminders).
//   day   2 to 24 hours before the start
//   hour  in the last 65 minutes before the start (runs are 15 minutes apart)
const all = (name) => { try { return $(name).all().map((i) => i.json); } catch { return []; } };
const idOf = (doc) => {
  const id = String(doc._id ?? "") || String(doc._name ?? "").split("/").pop() || "";
  if (id) return id;
  const m = /-([A-Za-z0-9]{16,40})$/.exec(String(doc.public_path ?? ""));
  return m ? m[1] : "";
};
const state = new Map(all("Reminder State").filter((s) => s && s.webinar_id).map((s) => [s.webinar_id, s]));
const now = Date.now();
const out = [];
for (const doc of all("Upcoming Webinars")) {
  const id = idOf(doc ?? {});
  if (!id || doc.status !== "published") continue;
  const start = Date.parse(doc.next_session_at ?? "");
  if (!Number.isFinite(start)) continue;
  const until = start - now;
  const kind = until > 0 && until <= 65 * 60 * 1000 ? "hour"
    : until > 2 * 60 * 60 * 1000 && until <= 24 * 60 * 60 * 1000 ? "day"
    : null;
  if (!kind) continue;
  const prev = state.get(id) ?? {};
  // Compare instants, not strings: Firestore hands a stored timestamp back as
  // "...:00Z" while the webinar carries "...:00.000Z", so a string compare
  // never matched and the same reminder went out every 15 minutes.
  const sentFor = Date.parse(prev[\`\${kind}_sent_for\`] ?? "");
  if (Number.isFinite(sentFor) && sentFor === start) continue;
  out.push({
    json: {
      webinar: { ...doc, id },
      kind,
      start_iso: doc.next_session_at,
      prev_day: String(prev.day_sent_for ?? ""),
      prev_hour: String(prev.hour_sent_for ?? ""),
    },
  });
}
return out;`;

export const BUILD_REMINDERS_GLUE = `
const EMAIL = ${EMAIL_RE};
const first = (name) => { try { return $(name).first()?.json ?? {}; } catch { return {}; } };
const ctx = first("Current Webinar");
const owner = first("Load Owner");
const session = first("Load Session Link");
const webinar = ctx.webinar ?? {};
const now = Date.now();
// People who registered moments ago just got the confirmation (which has
// everything); don't follow it straight up with a reminder.
const freshMs = ctx.kind === "day" ? 6 * 60 * 60 * 1000 : 20 * 60 * 1000;

const seen = new Set();
const out = [];
for (const item of $("Load Registrants").all()) {
  const r = item.json ?? {};
  const to = String(r.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(to) || seen.has(to)) continue;
  seen.add(to);
  const created = Date.parse(r._createTime ?? "");
  if (Number.isFinite(created) && now - created < freshMs) continue;
  const email = reminderEmail({
    webinar,
    registrant: { name: r.name, email: to },
    kind: ctx.kind,
    joinUrl: session.join_url,
    now,
  });
  out.push({ json: { payload: gmailPayload(email, { to, replyTo: EMAIL.test(String(owner.email ?? "")) ? owner.email : undefined }) } });
}
// Always hand something on: an empty branch would end the loop early.
return out.length ? out : [{ json: { skip: 1 } }];`;

export const TALLY_REMINDERS = `${OUTCOME}
const ctx = $("Current Webinar").first().json;
let sent = 0;
let failed = 0;
const errors = new Set();
for (const item of $input.all()) {
  if (item.json?.skip) continue;
  const outcome = sendOutcome(item.json ?? {});
  if (outcome.ok) sent += 1;
  else {
    failed += 1;
    errors.add(outcome.detail);
  }
}
return [{
  json: {
    webinar_id: ctx.webinar.id,
    kind: ctx.kind,
    start_iso: ctx.start_iso,
    prev_day: ctx.prev_day,
    prev_hour: ctx.prev_hour,
    sent,
    failed,
    error: [...errors].join(" | ").slice(0, 300),
  },
}];`;

export const REMINDER_STATE_ENTRIES = `// Marks each reminder as sent for this session date, keeping the other
// kind's mark as it was. If EVERY email for a webinar failed, it is left
// unmarked so the next run (15 minutes later) tries again.
const tallies = $input.all().map((i) => i.json).filter((t) => t && t.webinar_id);
const failedTotal = tallies.reduce((n, t) => n + (t.failed || 0), 0);
const errors = tallies.filter((t) => t.error).map((t) => \`\${t.webinar_id} (\${t.kind}): \${t.error}\`).join(" | ");
const entries = tallies
  .filter((t) => !(t.sent === 0 && t.failed > 0))
  .map((t) => ({
    json: {
      webinar_id: t.webinar_id,
      day_sent_for: t.kind === "day" ? t.start_iso : t.prev_day,
      hour_sent_for: t.kind === "hour" ? t.start_iso : t.prev_hour,
      updated_at: new Date().toISOString(),
      failed_total: failedTotal,
      errors,
    },
  }));
return entries.length ? entries : [{ json: { noop: 1, failed_total: failedTotal, errors } }];`;

export const FAIL_IF_REMINDERS_FAILED = `const entries = $("Reminder State Entries").all().map((i) => i.json);
const failed = entries[0]?.failed_total ?? 0;
if (failed > 0) throw new Error(\`\${failed} reminder email(s) not sent: \${entries[0].errors}\`);
return $input.all();`;

x = 0;
const reminderNodes = [
  node("Every 15 Minutes", "n8n-nodes-base.scheduleTrigger", 1.2, {
    rule: { interval: [{ field: "minutes", minutesInterval: 15 }] },
  }),
  code("Reminder Window", REMINDER_WINDOW),
  node("Upcoming Webinars", "n8n-nodes-base.googleFirebaseCloudFirestore", 1.1, {
    authentication: "serviceAccount",
    operation: "query",
    projectId: PROJECT_ID,
    query: "={{ $json.query }}",
  }, {
    // A failed query must stop the run and reach Failure Alerts, not
    // silently send nothing.
    alwaysOutputData: true,
    onError: "stopWorkflow",
    credentials: FIRESTORE,
  }),
  node("Reminder State", "n8n-nodes-base.googleFirebaseCloudFirestore", 1.1, {
    authentication: "serviceAccount",
    operation: "getAll",
    projectId: PROJECT_ID,
    collection: "reminder_state",
    returnAll: true,
  }, {
    executeOnce: true,
    alwaysOutputData: true,
    onError: "continueRegularOutput",
    credentials: FIRESTORE,
  }),
  code("Due Reminders", DUE_REMINDERS),
  node("Loop Over Webinars", "n8n-nodes-base.splitInBatches", 3, { batchSize: 1, options: {} }),
  code("Current Webinar", "return $input.all();"),
  node("Load Registrants", "n8n-nodes-base.googleFirebaseCloudFirestore", 1.1, {
    authentication: "serviceAccount",
    operation: "getAll",
    projectId: PROJECT_ID,
    collection: "={{ 'webinars/' + $json.webinar.id + '/registrants' }}",
    returnAll: true,
  }, {
    alwaysOutputData: true,
    onError: "continueRegularOutput",
    credentials: FIRESTORE,
  }),
  { ...firestoreGet("Load Owner", "users", "={{ $('Current Webinar').first().json.webinar.owner_id || 'no-owner' }}"), executeOnce: true },
  {
    ...firestoreGet(
      "Load Session Link",
      "={{ 'webinars/' + $('Current Webinar').first().json.webinar.id + '/private' }}",
      "session",
    ),
    executeOnce: true,
  },
  code("Build Reminders", `${TEMPLATE}\n// ── glue ──\n${BUILD_REMINDERS_GLUE}`, { executeOnce: true }),
  ifPositive("Has Recipients", "={{ $json.skip ? 0 : 1 }}"),
  emailSend("Send Reminder", { replyTo: true }),
  code("Tally", TALLY_REMINDERS),
  code("Reminder State Entries", REMINDER_STATE_ENTRIES),
  ifPositive("Has Entries", "={{ $json.noop ? 0 : 1 }}"),
  firestoreUpsert("Save Reminder State", "reminder_state", "webinar_id", ["webinar_id", "day_sent_for", "hour_sent_for", "updated_at"]),
  code("Fail If Any Failed", FAIL_IF_REMINDERS_FAILED, { executeOnce: true }),
];
const reminderConnections = {};
["Every 15 Minutes", "Reminder Window", "Upcoming Webinars", "Reminder State", "Due Reminders", "Loop Over Webinars"]
  .reduce((prev, next) => (link(reminderConnections, prev, next), next));
// splitInBatches v3: output 0 = done (everything fed back), output 1 = loop.
link(reminderConnections, "Loop Over Webinars", "Reminder State Entries", 0);
link(reminderConnections, "Loop Over Webinars", "Current Webinar", 1);
["Current Webinar", "Load Registrants", "Load Owner", "Load Session Link", "Build Reminders", "Has Recipients"]
  .reduce((prev, next) => (link(reminderConnections, prev, next), next));
link(reminderConnections, "Has Recipients", "Send Reminder", 0);
link(reminderConnections, "Has Recipients", "Tally", 1);
link(reminderConnections, "Send Reminder", "Tally");
link(reminderConnections, "Tally", "Loop Over Webinars");
link(reminderConnections, "Reminder State Entries", "Has Entries");
link(reminderConnections, "Has Entries", "Save Reminder State", 0);
link(reminderConnections, "Has Entries", "Fail If Any Failed", 1);
link(reminderConnections, "Save Reminder State", "Fail If Any Failed");
const reminders = workflow("15 - Webinar Reminders", reminderNodes, reminderConnections);

// ───────────────────────────── Join info ─────────────────────────────────

export const VALIDATE_JOIN_REQUEST = `// Only ids are accepted. A bad request still gets an (empty) answer, because
// this webhook responds from a Respond to Webhook node.
const body = $json.body ?? {};
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const webinarId = String(body.webinar_id ?? "");
const registrantId = String(body.registrant_id ?? "");
const valid = ID.test(webinarId) && ID.test(registrantId);
return [{ json: { valid, webinar_id: valid ? webinarId : "no-webinar", registrant_id: valid ? registrantId : "no-registrant" } }];`;

export const BUILD_JOIN_RESPONSE = `// The attendee join link goes only to a browser that holds the id of a
// registration made in the last 2 hours on a published webinar. The registrant
// id is random and returned only to the person who registered.
const first = (name) => { try { return $(name).first()?.json ?? {}; } catch { return {}; } };
const req = first("Validate Join Request");
const webinar = first("Load Webinar");
const registrant = first("Load Registrant");
const session = first("Load Session Link");
const created = Date.parse(registrant._createTime ?? "");
const ok = req.valid === true
  && webinar.status === "published"
  && typeof registrant.email === "string" && registrant.email.length > 0
  && Number.isFinite(created) && Date.now() - created <= 2 * 60 * 60 * 1000;
const url = String(session.join_url ?? "").trim();
const joinUrl = ok && /^https:\\/\\/[^\\s]+$/i.test(url) ? url : "";
return [{ json: { join_url: joinUrl } }];`;

x = 0;
const joinInfoNodes = [
  node("Join Info Webhook", "n8n-nodes-base.webhook", 2, {
    httpMethod: "POST",
    path: "webinar-join-info",
    responseMode: "responseNode",
    options: {},
  }, { webhookId: "webinar-join-info" }),
  code("Validate Join Request", VALIDATE_JOIN_REQUEST),
  firestoreGet("Load Webinar", "webinars", "={{ $('Validate Join Request').first().json.webinar_id }}"),
  firestoreGet(
    "Load Registrant",
    "={{ 'webinars/' + $('Validate Join Request').first().json.webinar_id + '/registrants' }}",
    "={{ $('Validate Join Request').first().json.registrant_id }}",
  ),
  firestoreGet(
    "Load Session Link",
    "={{ 'webinars/' + $('Validate Join Request').first().json.webinar_id + '/private' }}",
    "session",
  ),
  code("Build Join Response", BUILD_JOIN_RESPONSE),
  respond("Respond Join Info", "$json", 200),
];
const joinInfo = workflow("16 - Webinar Join Info", joinInfoNodes);

const OUTPUTS = {
  "webinar-join-info-workflow.json": joinInfo,
  "webinar-reminders-workflow.json": reminders,
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

export { joinInfo, confirmation, summary, welcome, broadcast, unsubscribe, reminders, TEMPLATE };
