# Billing release: go/no-go, configuration, deploy and rollback

Existing infrastructure only. Domain `webinarstackai.com`; Cloudflare account `6707fe7344e46834fb7d8116ec1acfa0`,
Pages project **`nyrie`** (`nairy.pages.dev`, production branch `main`, deploys on push); Firebase project
`nirey-f2faf`; the live Stripe account. The promo site `info.webinarstackai.com` is Pages project `complement`,
which is not in this repo.

> A stale wrangler cache in this checkout (`node_modules/.cache/wrangler/pages.json`) points at another account.
> Every wrangler command below therefore sets `CLOUDFLARE_ACCOUNT_ID` explicitly.

## 1. Read-only checks already done (2026-10-25)

| Check | Result |
|---|---|
| Production deployment | `a258b18a` from commit `47dd2b3` (= the base of this release). It is the **rollback target**. |
| Production secrets (names only, values never read) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `N8N_BILLING_SECRET`. **No `FIREBASE_SERVICE_ACCOUNT` yet**, so a new key is needed (§3). Preview: none. |
| Firebase project | `nirey-f2faf` in `wrangler.toml`, `PRODUCTION_FIREBASE_PROJECT_ID`, and the live JavaScript bundle (`projectId:"nirey-f2faf"`). |
| Live webhook route | `POST /api/billing/webhook` unsigned → 400 "Invalid signature"; GET → 405. The release keeps the same URL, events and signature check. |
| n8n rollback route | "17 - Billing Event" active, published version = current (`4024eee0…`), unchanged since 2026-10-13. Unauthenticated POST → 403. |
| Routing | `/api/*` is served by the functions (`_routes.json`); security headers unchanged. |
| Sandbox | `npm run verify:billing`: 24/24, 25 events delivered, 6 emulator records (your run). |
| Tests | `npm test` 40/40, `npm run test:emulator` 7/7, build passes with Next.js 15.5.28; 0 critical in `npm audit`. |

What I could not check without your live Stripe key: the four live price amounts, the live endpoint's event list and
recent deliveries, and the Customer portal settings. **`node scripts/check-live-stripe.mjs`** checks all of them
using GET requests only. A restricted read-only key is enough.

## 2. Audit findings

**Consent and disclosures (app).**
- Each plan card says "$1 for your first 7 days, then $X every month / year / 2 years until you cancel".
- The Pay buttons stay disabled until the terms box is ticked, and the server refuses without it. The time of consent
  is stored on the subscription (`terms_accepted_at`).
- Stripe's page states $1 today, the date of the first full charge, the recurring amount and interval, how to cancel,
  and that payments are non-refundable.
- **Gap (go/no-go):** the promo site still advertises **$22 / $99 / $222 lifetime**. Its buttons only scroll the page
  (`#plans`), and its one app link is `/provider` with no plan. Customers would see prices that differ from what they
  are charged. Update `complement` before release: show the new prices with the $1 / 7-day terms, and link the buttons
  to `https://webinarstackai.com/signup?plan=monthly`, `…?plan=annual` and `…?plan=two_year`.
- Recommended, not blocking: a Terms page linked next to the checkbox.

**Premium access.**
- `billing/{uid}` is written only by the server; the rules give the owner read-only access.
- Paid means `trialing`, `active` or `past_due` until `current_period_end`; `canceled` and `unpaid` lose access;
  Lifetime buyers keep theirs.
- **Requirement (go/no-go):** after a failed renewal `past_due` keeps access until the new period end, which can be a
  month, a year or two years. So in Stripe, Settings > Billing > Revenue recovery, set "if all retries fail" to
  **cancel the subscription** (or mark it unpaid). This setting is not readable through the API; check it by hand.
- Known and unchanged: no feature is locked for free users yet (Phase 5 of PAYMENTS_PLAN.md). Premium status is shown,
  not enforced.

**Deployment configuration.** No secrets in the repo. `.dev.vars` and `.wrangler/` are ignored. `wrangler.toml` carries
only public ids, and the price ids belong to the same Stripe account as the `pk_live` key. Firestore rules are
unchanged, so no rules deploy is needed. No new dependencies; Next.js was patched to 15.5.28.

## 3. FIREBASE_SERVICE_ACCOUNT (least privilege, existing project)

The only Firestore credential today sits inside n8n and can't be exported, so create one key for the webhook:

1. Google Cloud console, project **nirey-f2faf**: IAM & Admin > Service accounts > Create service account. Name
   `billing-webhook`, role **Cloud Datastore User**, nothing else. Then Keys > Add key > JSON. Save the file outside
   the repo.
2. `node scripts/check-service-account.mjs C:\path\to\key.json`. It checks the project, gets a token and probes read
   and write permission. It writes nothing.
3. **On approval**, set the secret. The value is read from the file and never printed or committed:
   `CLOUDFLARE_ACCOUNT_ID=6707fe7344e46834fb7d8116ec1acfa0 npx wrangler pages secret put FIREBASE_SERVICE_ACCOUNT --project-name nyrie < C:/path/to/key.json`
   The running deployment doesn't use it until the next deploy. Delete the local key file afterwards.

## 4. Go/no-go checklist

| # | Item | How | Go when |
|---|---|---|---|
| 1 | Tests | `npm test`; `npm run test:emulator` | 40/40, 7/7 ✅ |
| 2 | Sandbox end to end | `npm run verify:billing` | 24/24 ✅ |
| 3 | Live prices, endpoint, deliveries, portal | `node scripts/check-live-stripe.mjs` | all PASS |
| 4 | Service-account key | `node scripts/check-service-account.mjs key.json` | all PASS |
| 5 | Failed-payment behaviour | Stripe > Settings > Billing > Revenue recovery | cancel (or mark unpaid) after retries |
| 6 | Trial emails | Stripe > Settings > Billing > Subscriptions and emails | trial reminder + successful-payment receipts on |
| 7 | Promo site prices and links | `complement` project | new prices + `/signup?plan=…` links live (or the promo page taken down) |
| 8 | Secret set | §3 step 3 | `wrangler pages secret list --project-name nyrie` shows `FIREBASE_SERVICE_ACCOUNT` |
| 9 | Your approval to deploy | | explicit yes |

**Deploy:** commit and push `main`. Cloudflare builds `nyrie` production.

**Right after (no charge, no resend):**
- `curl -X POST https://webinarstackai.com/api/billing/webhook -d "{}"` returns 400.
- The Billing page shows $199 / $1,188 / $1,896 with the $1 line and the terms box.
- The next real Stripe event shows 200 under Developers > Webhooks, and the n8n workflow shows no new execution.

Resending a past event or making a $1 purchase with your own card are optional stronger checks, and need your
approval.

## 5. Rollback

- **Everything, instantly:** Cloudflare > Workers & Pages > nyrie > Deployments > `a258b18a` (commit `47dd2b3`) >
  **Rollback to this deployment**. The old code, old prices and n8n route are back. The n8n workflow and its secret
  were never changed.
- **New code, n8n writer:**
  `CLOUDFLARE_ACCOUNT_ID=6707fe7344e46834fb7d8116ec1acfa0 npx wrangler pages secret delete FIREBASE_SERVICE_ACCOUNT --project-name nyrie`,
  then Deployments > the latest > Retry deployment. Live n8n refuses Two-Year updates, and Stripe retries them for up
  to 3 days, so roll forward within that window. Or, with approval, publish the repo's
  `n8n/billing-event-workflow.json`, which accepts `two_year`.
- **Afterwards:** Stripe > Developers > Webhooks > the endpoint > resend any failed events (approval). Redelivery is
  harmless.
