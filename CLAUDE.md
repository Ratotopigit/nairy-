# WebinarStack app — webinarstackai.com

The signed-in product: webinar builder, watch room, replays, brand kit, AI fill, billing.
Sister repo: the marketing site `info.webinarstackai.com` lives in `A:\PROJECT KHATAM\COMPLIMENT\complement--main`
(GitHub `Ratotopigit/complement-`). Different stack, different Firebase project — don't mix them up.

## Stack
- Next.js 15 (App Router), React 18, TypeScript, Tailwind 3.
- **Static export in production** (`output: "export"` → `out/`). There is no Next server in prod:
  `app/api/*` routes only exist in `next dev`. Real server code is Cloudflare Pages Functions in `functions/`.
- Firebase project **`nirey-f2faf`** (Auth, Firestore, Storage). Rules: `firestore.rules`, `storage.rules`.
  Main collections: `webinars`, `users`, `workspace_assets`, `content_sessions`, `blueprint_sessions`, `broadcasts`, `email_prefs`.
- AI work runs in **n8n** (`explosionmarketing.app.n8n.cloud`). The browser posts straight to n8n webhooks
  with a Firebase ID token. See `n8n/README.md`. n8n is the source of truth; the JSON exports in `n8n/` are copies.
- Stripe billing (LIVE account) in `functions/api/billing/*`. See `docs/BILLING_RELEASE.md`, `docs/PAYMENTS_PLAN.md`.

## Layout
- `app/` routes: `provider/*` (webinar creator steps), `w/` (public webinar/watch page), `user/`, `admin/`, `onboarding/`, `login/`, `signup/`.
- `components/` by area (`provider`, `webinar`, `deck`, `chat`, `admin`, …). `lib/` holds the logic (`webinars.ts`, `brand-kit.ts`, `page-blocks.ts`, `plans.ts`, `billing.ts`, …).
- `functions/[host]/[slug].js` serves pretty webinar links `/<host>/<title>-<id>` in production.

## Commands
- `npm run dev` (port 3000) · `npm run build` · `npm run typecheck` · `npm run lint` · `npm test`
- Always run `npm run typecheck` and `npm test` before saying a change is done.

## Deploy
- Cloudflare Pages project **`nyrie`**, production branch `main`. **Every push to `main` deploys to production.**
  Work on a branch; push to `main` only when the user says so.
- `NEXT_PUBLIC_*` values are inlined at build time from `wrangler.toml` `[vars]` (public, not secrets).
- Wrangler: always set `CLOUDFLARE_ACCOUNT_ID=6707fe7344e46834fb7d8116ec1acfa0` (a stale local cache points elsewhere).

## Never
- Never put secrets in the repo (Stripe secret/webhook keys, Firebase service account, n8n secrets). They live only
  as encrypted Cloudflare Pages variables or n8n credentials. `.env.local` is local only.
- Never test against live Stripe or write test data into `nirey-f2faf` production. Use `npm run verify:billing` / the emulator tests.
- Never rename n8n webhook paths (`avatar-iq`, `offer-iq`, `content-maker`) — the live site calls them.
- Never re-import an `n8n/*.json` export over a live workflow.
