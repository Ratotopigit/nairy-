#!/usr/bin/env node
/**
 * Paid-plan check for the three AI workflows (01 Webinar Chat / avatar-iq,
 * 02 Webinar Offer / offer-iq, 03 Webinar Content / content-maker). They call
 * the AI model on every request, so a signed-in user without an active plan
 * gets 402 instead.
 *
 * Inserted between "Verify User and Normalize" (the signed-in user) and
 * "Load Account Memory" (first step of the real work):
 *   Load Billing (billing/{uid}) -> Check Paid Access -> Has Paid Access?
 *     yes -> Load Account Memory (unchanged from here on)
 *     no  -> Respond Payment Required (402)
 * The access rule is functions/api/billing/_entitlement.js, embedded from its
 * source, so n8n, the webhook and checkout can't disagree.
 *
 *   node n8n/paid-check.mjs   -> applies the check to the repo copies (idempotent)
 * For the live workflows the same nodes and wiring are added to the current
 * live version (the repo copies are older than live), then published.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { GRACE_DAYS, hasAccess, toMs } from "../functions/api/billing/_entitlement.js";

export const WORKFLOW_FILES = ["avatar-iq-chat-workflow.json", "offer-iq-workflow.json", "content-maker-workflow.json"];
const AFTER = "Verify User and Normalize";
const NEXT = "Load Account Memory";

export const CHECK_CODE = `// Paid access by the rule in functions/api/billing/_entitlement.js (embedded below).
// A missing or unreadable billing/{uid} means no paid plan: fail closed.
const GRACE_DAYS = ${GRACE_DAYS};
const SUBSCRIPTION_PLANS = ["monthly", "annual", "two_year"];
const toMs = ${toMs.toString()};
const hasAccess = ${hasAccess.toString()};

const user = $('${AFTER}').first().json;
const billing = $input.first() ? $input.first().json : {};
const doc = billing && !billing.error ? billing : {};
return [{ json: { ...user, paid_access: hasAccess(doc) } }];`;

export const PAYMENT_REQUIRED = "AI tools need an active plan. Choose a plan on the Billing page to continue.";

/** The four nodes, placed under the existing ones. `credentials` is the workflow's Firestore credential. */
export function paidCheckNodes(credentials, [x, y]) {
  return [
    {
      parameters: { authentication: "serviceAccount", projectId: "nirey-f2faf", collection: "billing", documentId: "={{ $json.user_id }}" },
      name: "Load Billing",
      type: "n8n-nodes-base.googleFirebaseCloudFirestore",
      typeVersion: 1.1,
      position: [x, y + 560],
      alwaysOutputData: true,
      onError: "continueRegularOutput",
      credentials,
    },
    {
      parameters: { jsCode: CHECK_CODE },
      name: "Check Paid Access",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [x + 200, y + 560],
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 1 },
          conditions: [{ leftValue: "={{ $json.paid_access }}", rightValue: true, operator: { type: "boolean", operation: "true", singleValue: true } }],
          combinator: "and",
        },
        options: {},
      },
      name: "Has Paid Access?",
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [x + 400, y + 560],
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: `={{ JSON.stringify({ error: ${JSON.stringify(PAYMENT_REQUIRED)}, code: 'payment_required' }) }}`,
        options: { responseCode: 402 },
      },
      name: "Respond Payment Required",
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.4,
      position: [x + 600, y + 720],
    },
  ];
}

/** Adds the check to a workflow object (no-op if it is already there). */
export function addPaidCheck(workflow) {
  if (workflow.nodes.some((n) => n.name === "Check Paid Access")) return workflow;
  const after = workflow.nodes.find((n) => n.name === AFTER);
  const next = workflow.nodes.find((n) => n.name === NEXT);
  const route = workflow.connections[AFTER]?.main?.[0];
  if (!after || !next || route?.length !== 1 || route[0].node !== NEXT) {
    throw new Error(`${workflow.name}: expected ${AFTER} -> ${NEXT}`);
  }
  workflow.nodes.push(...paidCheckNodes(next.credentials, after.position));
  workflow.connections[AFTER].main[0] = [{ node: "Load Billing", type: "main", index: 0 }];
  workflow.connections["Load Billing"] = { main: [[{ node: "Check Paid Access", type: "main", index: 0 }]] };
  workflow.connections["Check Paid Access"] = { main: [[{ node: "Has Paid Access?", type: "main", index: 0 }]] };
  workflow.connections["Has Paid Access?"] = {
    main: [[{ node: NEXT, type: "main", index: 0 }], [{ node: "Respond Payment Required", type: "main", index: 0 }]],
  };
  return workflow;
}

if (import.meta.url === new URL(process.argv[1], "file://").href || process.argv[1]?.endsWith("paid-check.mjs")) {
  for (const file of WORKFLOW_FILES) {
    const url = new URL(file, import.meta.url);
    const raw = readFileSync(url, "utf8");
    const workflow = addPaidCheck(JSON.parse(raw));
    writeFileSync(url, JSON.stringify(workflow, null, 2) + (raw.endsWith("\n") ? "\n" : ""));
    console.log(`paid check in ${file}`);
  }
}
