# Payments plan (Stripe)

> **Releasing billing:** see [BILLING_RELEASE.md](BILLING_RELEASE.md) for the checks, production secrets, deploy and rollback.

Plans (since 2026-10-25): **Monthly $199/mo**, **Annual $1,188/yr**, **Two-Year $1,896 every 2 years**, each after a
one-time **$1** introductory week. Lifetime ($222) is no longer sold; accounts that bought it keep it. The amounts shown in the app
live in one place, `lib/plans.ts`, which both the Billing page and the first-login plan step read. If a price
changes, change the Stripe Price and that file together.

**Refund policy (decided): all payments are non-refundable.** It is shown before paying on the Billing page, the
first-login plan step and Stripe's checkout page. If a refund is ever issued by hand in Stripe, a fully refunded
Lifetime purchase still loses access automatically.

## Status

The decision was made to go live without a separate test-mode phase; the go-live check is a 100%-off promo code.

- **Phase 1 + 2: built.** `billing/{uid}` rules + emulator tests, `useEntitlement()` in `lib/billing.ts`,
  `POST /api/billing/checkout` (`functions/api/billing/checkout.js`), Billing page and onboarding wired to checkout.
  The buttons only switch on in a build that has `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; without it they stay
  "Coming soon".
- **Phase 3: built.** `POST /api/billing/webhook` (`functions/api/billing/webhook.js`) verifies the Stripe signature,
  re-reads the subscription / payment from Stripe (so late, repeated or out-of-order events can't undo newer
  state) and sends one update to the n8n workflow **17 - Billing Event** (`n8n/billing-event-workflow.json`), which
  writes `billing/{uid}`. Tested against real Firestore with a throwaway user (since deleted).
- **Phase 4: built.** `POST /api/billing/portal` and a "Manage billing" button for anyone with a Stripe customer.
- **Phase 5 (limits for free users): not built.** Waiting on the free-vs-paid decision; nothing is locked yet.
- **Phase 6 (go live): steps below.**

### Environment variables

| Variable | Where | Secret |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `wrangler.toml` `[vars]` (build-time) | no |
| `STRIPE_SECRET_KEY` | Cloudflare Pages, **encrypted** | yes |
| `STRIPE_WEBHOOK_SECRET` | Cloudflare Pages, **encrypted** (`whsec_...` from the Stripe webhook endpoint) | yes |
| `FIREBASE_SERVICE_ACCOUNT` | Cloudflare Pages, **encrypted**: the JSON key of a service account with only the **Cloud Datastore User** role. The webhook uses it to write `billing/{uid}` itself | yes |
| `N8N_BILLING_SECRET` | Legacy, only read while `FIREBASE_SERVICE_ACCOUNT` is not set (the webhook then still hands events to n8n) | yes |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_TWO_YEAR`, `STRIPE_PRICE_INTRO` | `wrangler.toml` `[vars]` (live ids, already set) | no |
| `APP_URL` | `wrangler.toml` `[vars]`: `https://webinarstackai.com` (already set) | no |

The Firebase API key, project id and n8n webhook base the functions also need already come from `wrangler.toml`.
New variables apply on the **next deploy**. For local testing of the functions, copy `.dev.vars.example` to
`.dev.vars` (git-ignored), `npm run build`, then `npx wrangler pages dev out`.

### Stripe settings

- **Webhook endpoint** `https://webinarstackai.com/api/billing/webhook`, events: `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`.
- **Customer portal**: allow cancel **at the end of the billing period** (no proration, nothing refunded), update
  payment method, invoice history. Leave plan switching off for now (the Billing page says it isn't available yet).

## Webhook without n8n (2026-10-25)

**What n8n did.** The workflow "17 - Billing Event" (live copy identical to `n8n/billing-event-workflow.json`) had one
job: take the update the site's webhook sent it, check the shared-secret header and the update's shape, load
`billing/{uid}`, merge with the lifetime and stale-subscription guards, and save. That record is the only thing that
activates paid access. It sent **no customer emails**; Stripe sends receipts and trial reminders. Its only other link
is n8n's error workflow, which alerted you when a run failed.

**What happens now.** `functions/api/billing/webhook.js` writes `billing/{uid}` itself (`_store.js`) when
`FIREBASE_SERVICE_ACCOUNT` is set. `mergeBilling()` is the n8n merge node line for line, and a test runs both
against the same cases. The write only applies if the document hasn't changed since it was read. If two events race,
the losing one re-reads and merges again, which n8n didn't do. Only the 10 billing fields are written; other fields
are left alone. Any failure answers Stripe with an error, so Stripe retries.

**One path per event.** With `FIREBASE_SERVICE_ACCOUNT` set, n8n is never called. Without it, the webhook behaves
exactly as before and forwards to n8n, so a deploy before the secret exists breaks nothing. n8n has not been changed
and its workflow is not deleted. The live n8n copy still accepts only monthly and annual, so until the secret is set,
Two-Year purchases are not recorded.

**Cutover.** Create a service account in the Firebase project (Google Cloud > IAM > Service accounts) with only the
**Cloud Datastore User** role and download its JSON key. Add it as the encrypted Cloudflare Pages variable
`FIREBASE_SERVICE_ACCOUNT`, then deploy. Watch the next Stripe deliveries succeed and the n8n workflow stop getting
executions. After that, the n8n workflow and `N8N_BILLING_SECRET` can be retired whenever you like. Failure alerts
then come from Stripe ("webhook failing" emails) and the Cloudflare function logs instead of n8n's error workflow.

## Introductory offer: $1 for the first 7 days

**Rule.** A first-time subscriber (any plan) pays a one-time **$1** today and gets a 7-day trial on the
plan's regular price. When the trial ends, Stripe charges $199 (monthly), $1,188 (yearly) or $1,896 (every 2 years) and
keeps renewing on that interval until they cancel. Anyone who has paid before pays the
regular price today.

**How.** `functions/api/billing/checkout.js` adds the one-time `STRIPE_PRICE_INTRO` as a second line item and sets
`subscription_data[trial_period_days]=7`. Stripe invoices the one-time item at the start of the trial and never
again. The recurring price starts when the trial ends. The function reads both prices from Stripe before
creating the session. It refuses (503) if the intro price is recurring, inactive or in another currency, so a
mistake there can never bill $1 every month.

**Who counts as first-time.** Nothing in `billing/{uid}` (no customer, subscription or lifetime purchase), and no
Stripe customer with the same email has ever had a subscription (any status). The email lookup is only used to say
no. A customer found by email is never attached to the session, because a Firebase email need not be verified.
Known limit: the same person with a second email address gets the offer again (a card-fingerprint check would close
that).

**Consent.** The Billing page and the onboarding plan step show "$1 for your first 7 days, then $X every
month/year until you cancel" on each subscription card. The Pay buttons stay disabled until the terms box is
ticked. The server refuses without `accept_terms: true` and records `terms_accepted_at` on the subscription's
metadata. Stripe's page shows the exact amounts and the first charge date next to the Pay button.

**Plan picked before signing in.** The promo site links to `https://webinarstackai.com/signup?plan=monthly`
(or `annual` / `two_year`; use `/login?plan=...` for existing users). The pick is kept in localStorage across
sign-up or sign-in. New users find it preselected on the onboarding plan step. Existing users land on
`/provider/billing?plan=...` with that card highlighted. It is cleared once checkout opens.

**Webhooks.** No change was needed. `trialing` is a paid status until `current_period_end` (the trial end). The
first regular invoice moves the subscription to `active`. A failed charge moves it to `past_due`, and portal
cancellation and deletion are recorded as before. Duplicate and out-of-order events are harmless because every
event re-reads the subscription from Stripe and writes its current state.

**Tests.** `npm test` (Node's built-in runner, no dependencies): `tests/billing/checkout.test.mjs` and
`tests/billing/webhook.test.mjs`. The webhook tests run the real n8n "Merge Billing State" code from
`n8n/billing-event-workflow.json`.

### What to set up in Stripe (do it in test mode first, then repeat in live)

1. **Products and prices: already created, nothing to add.** Monthly $199 `price_1UUPYN...`, Annual $1,188
   `price_1UUPZ7...`, Two-Year $1,896 `price_1UUPZv...` (recurring, every 2 years) and the one-time $1
   `price_1UUPcv...`, all in `wrangler.toml`. The checkout refuses to run if the $1 price is not one-time or a plan
   price is not recurring. The product name of the $1 price is what customers see on their invoice.
2. **Customer portal** (Settings > Billing > Customer portal): cancel **at end of billing period**, update payment
   method, invoice history. Cancelling during the trial ends the subscription at the trial end with no further
   charge.
3. **Subscriptions and emails** (Settings > Billing > Subscriptions and emails): turn on trial-ending reminder
   emails ("Link to a Stripe-hosted page") and successful-payment receipts. Card networks require both for paid
   trials. Under failed payments, use Smart Retries and **cancel the subscription if all retries fail**. Until
   then a `past_due` account keeps access.
4. **Webhook endpoint:** the same URL and event list as above, no new events. A test-mode endpoint has its own
   `whsec_...`.
5. **Credentials:** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` stay encrypted Cloudflare Pages variables. Use
   `sk_test_` / test price ids in `.dev.vars` for local runs and `sk_live_` / live ids in production. If you want a
   Cloudflare **preview** deployment on test mode, add an `[env.preview.vars]` block to `wrangler.toml` with the test
   price ids and `pk_test_` key, and set the test secrets on the Preview environment.

### Deployment checklist

1. `npm test` passes.
2. **Test mode, locally:** copy `.dev.vars.example` to `.dev.vars` with test values, `npm run build`,
   `npx wrangler pages dev out`, `stripe listen --forward-to localhost:8788/api/billing/webhook`. Then:
   - Buy Monthly with `4242 4242 4242 4242`. Expect $1.00 charged and Billing to show "introductory week".
   - Advance a [test clock](https://docs.stripe.com/billing/testing/test-clocks) 7 days. Expect a $199.00 invoice
     paid and the status `active`. Repeat with Annual ($1,188.00) and Two-Year ($1,896.00).
   - Buy with 4242, then in Manage billing switch the card to `4000 0000 0000 0341` (it attaches but every charge
     declines) and advance the clock 7 days. The renewal fails and Billing says the payment didn't go through.
   - Cancel in Manage billing during the trial: no $199 charge at the trial end.
   - Buy again with the same account or email: the regular price is due today and there is no $1 line.
3. **Live:** the price ids in `wrangler.toml` are live. Test mode needs its own copies of these prices (test and live
   ids differ), set in `.dev.vars`. Do steps 2–3 of the Stripe setup in live mode.
4. Set `FIREBASE_SERVICE_ACCOUNT` (see "Webhook without n8n"), then commit and push. **Pushing to main deploys.** Without the
   secret, the webhook falls back to the n8n workflow, whose live copy does not know `two_year`, so Two-Year
   purchases would not be recorded.
5. One real $1 purchase with your own card, then cancel it in Manage billing. Check the receipt, the n8n
   execution and the Billing page.
6. Watch Stripe and the n8n "17 - Billing Event" executions for failures for the first week.

## 0. Ground rules (read first)

- **Publishable key (`pk_...`)** is safe in the browser. It goes in the build-time variable
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`.env.local` for dev, Cloudflare Pages build variables for production).
- **Secret key (`sk_...`) and webhook signing secret (`whsec_...`) must only ever live as encrypted
  Cloudflare Pages environment variables.** Never in the repo, never in `NEXT_PUBLIC_*`, never in a chat,
  never in an n8n node. Do not paste them to anyone, including Claude. If one leaks, roll it in the Stripe dashboard.
- Build and test everything in **Stripe test mode** (`pk_test` / `sk_test`). Switch to live keys only at the end.
- The browser is never trusted: the server decides who paid and what they get.

## 1. Why the server pieces are Cloudflare Pages Functions

The site is a static export, so production has no Next.js API routes. The repo already runs
Pages Functions (`functions/[host]/[slug].js`), so billing endpoints go in `functions/api/billing/`.
Stripe webhooks must be signature-checked, and n8n's code sandbox has no `crypto`, so the webhook is
verified in a Pages Function (Web Crypto) and then handed to n8n, which already holds the Firestore
service account and writes the result.

```
Billing page ──(Firebase ID token)──> /api/billing/checkout ──> Stripe Checkout (hosted)
                                                                      │
Stripe ──webhook──> /api/billing/webhook (verifies signature) ──> n8n "billing-event" ──> Firestore billing/{uid}
                                                                      │
Billing page + gated features <── reads billing/{uid} (read-only for the owner)
```

## 2. Stripe dashboard setup (test mode first)

1. One product, "Webinar Stack", with three prices: Monthly $22 recurring (month), Annually $99 recurring (year),
   Lifetime $222 one-time. Note the three `price_...` ids.
2. Customer portal: enable (cancel, update card, invoices).
3. Webhook endpoint `https://webinarstackai.com/api/billing/webhook` for: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`,
   `charge.refunded`.
4. Promotion codes (coupons): create in Stripe and let Checkout accept them (`allow_promotion_codes`).
5. Decide currency and whether to turn on Stripe Tax (see open questions).

## 3. Data model

`billing/{uid}` in Firestore, **written only by the server (n8n service account)**:

| field | meaning |
|---|---|
| `plan` | `none` / `monthly` / `annual` / `lifetime` |
| `status` | Stripe subscription status, or `lifetime` |
| `stripe_customer_id`, `stripe_subscription_id` | for the portal and lookups |
| `current_period_end` | when access runs out unless renewed |
| `last_event_id` | idempotency: ignore a replayed webhook |
| `updated_at` | ISO string |

Rules: owner may **read**, nobody may write from the browser. Entitlement:
`paid = plan == lifetime || (status in [active, trialing, past_due] && current_period_end > now)`.
Test these rules in the emulator the same way as the existing rules tests.

## 4. Phases

**Phase 1: Foundations (small).** Stripe test products/prices, env vars in Cloudflare, `billing/{uid}` rules + tests,
`useEntitlement()` hook (live read of the billing doc), Billing page shows the real plan.

**Phase 2: Checkout.** `POST /api/billing/checkout`: verifies the Firebase ID token (same
`accounts:lookup` check the n8n workflows use), creates a Checkout Session with `client_reference_id = uid` and
`metadata.uid`, mode `subscription` for monthly/annual and `payment` for lifetime, success URL
`/provider/billing?status=success`, cancel URL back. The Billing buttons call it and redirect.
The success page waits for the webhook by watching `billing/{uid}` (it can lag a few seconds).

**Phase 3: Webhook to Firestore.** `POST /api/billing/webhook`: verify `Stripe-Signature` with the signing
secret, then forward the event to a new n8n workflow `billing-event` (shared-secret header) that upserts
`billing/{uid}`. Handles: first payment, renewals, cancel at period end, failed payment (grace), refund of a
lifetime purchase (revoke). Idempotent via `last_event_id`.

**Phase 4: Portal.** `POST /api/billing/portal` returns a Customer Portal link ("Manage billing" button).

**Phase 5: Enforcement (the part that actually protects revenue).** Client checks are only for UX.
Real limits go where the cost is:
- n8n AI workflows (Chat, Offer, Content, deck art): load `billing/{uid}` and return `402` when the account is over
  the free limit.
- Firestore rules: cap published webinars for free accounts using the billing doc.
- UI: upgrade prompts that open the Billing page.

**Phase 6: Go live.** Swap to live keys, create live products/webhook, one real $ test with a coupon-discounted
purchase, check emails/receipts, watch Stripe + n8n failure alerts for a week.

## 5. Test plan (test mode)

Stripe CLI `stripe listen --forward-to` for local webhooks; test card `4242 4242 4242 4242`; cases: monthly,
annual, lifetime, promo code, declined card (`4000 0000 0000 0002`), 3D Secure, cancel then renewal date passes,
failed renewal, refund a lifetime payment, replayed webhook (must not double-apply), webhook with a bad signature
(must be rejected), user A cannot read user B's billing doc, checkout with an expired/forged ID token (401).

## 6. Open questions (I need answers before Phase 5)

1. **What does free vs paid mean?** The Billing page currently says every plan includes everything. Decide the
   free limits (for example: 1 published webinar, N AI generations per month) or whether the product is paid-only
   after a trial.
2. **Currency**: USD or AUD (your reference mentioned AUD). Prices are shown as "$" today.
3. **Tax**: Stripe Tax for GST/VAT, or prices tax-inclusive.
4. **Lifetime refunds**: window (for example 14 days) and whether a refund revokes access automatically.
5. **Existing users**: grandfathered free, or start the clock at launch.

## 7. Prompt to start the build

> Read `docs/PAYMENTS_PLAN.md`. Implement Phase 1 and Phase 2 only, in Stripe test mode. Use Cloudflare Pages
> Functions under `functions/api/billing/`, verify the Firebase ID token server-side, never accept a uid from the
> request body, read keys only from environment variables (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`),
> add `billing/{uid}` Firestore rules (owner read, no client write) with emulator tests, and wire the three Billing
> cards to checkout. Show me the test plan results before moving on. Do not ask me for the secret key: tell me which
> environment variables to set and where.
