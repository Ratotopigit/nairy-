# Payments plan (Stripe)

Plans: **Monthly $22/mo**, **Annually $99/yr**, **Lifetime $222 once** (confirmed). The amounts shown in the app
live in one place, `lib/plans.ts`, which both the Billing page and the first-login plan step read. If a price
changes, change the Stripe Price and that file together.

## Status

- **Phase 1 + 2: built** (test mode). `billing/{uid}` rules + emulator tests, `useEntitlement()` in `lib/billing.ts`,
  `POST /api/billing/checkout` in `functions/api/billing/checkout.js`, Billing page and onboarding wired to checkout.
  The buttons only switch on in a build that has `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; without it they stay
  "Coming soon".
- **Phase 3 (webhook): not built.** Until it is, a test payment succeeds in Stripe but `billing/{uid}` is never
  written, so the Billing page says "still being confirmed".
- Phases 4-6: not built.

### Environment variables for Phases 1-2

| Variable | Where | Secret |
|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Cloudflare Pages build variable (and `.env.local` for dev) | no |
| `STRIPE_SECRET_KEY` | Cloudflare Pages, **encrypted** | yes |
| `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_LIFETIME` | Cloudflare Pages, encrypted (`price_...` ids) | no |
| `APP_URL` | Cloudflare Pages, encrypted: `https://webinarstackai.com` | no |

The Firebase API key and project id the function also needs already come from `wrangler.toml`. New variables
apply on the **next deploy**. For local testing of the function, copy `.dev.vars.example` to `.dev.vars`
(git-ignored), `npm run build`, then `npx wrangler pages dev out`.

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
