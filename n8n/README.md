# n8n production setup

The product uses three native n8n workflows:

1. `avatar-iq-chat-workflow.json`
2. `offer-iq-workflow.json`
3. `content-maker-workflow.json`

There are no HTTP Request nodes, Gemini API expressions, Supabase REST calls, or n8n environment variables. Each workflow uses an AI Agent, Google Gemini Chat Model, Structured Output Parser, Postgres nodes, and Postgres Chat Memory.

The workflow database setup creates the core memory tables as a safety net. Run the Supabase migrations before deployment so account memory, assistant sessions, the private asset library, Storage policies, and all indexes are installed correctly.

If the live project has missing-table or schema-cache errors, open Supabase SQL Editor and run `supabase/production-repair.sql` once. It is safe to rerun, backfills profile rows for existing users, and refreshes the PostgREST schema cache at the end.

## Create three credentials once

Create these credentials in n8n before importing the workflows:

## Create two environment variables

In n8n **Settings > Variables**, create these values before publishing:

```text
SUPABASE_JWT_ISSUER=https://YOUR_PROJECT_REF.supabase.co/auth/v1
GEMINI_MODEL=models/gemini-3.5-flash
```

The workflows read them through `$vars`; no Supabase project URL or model identifier is embedded in the exported JSON. Keep credentials in n8n Credentials, not Variables.

### Google Gemini

Create one **Google Gemini(PaLM) API** credential named `Google Gemini`. Enter the Google AI Studio key once. Every Gemini model node references this same credential.

Set `GEMINI_MODEL` to the exact Flash model identifier available in n8n's built-in model list.

### Supabase Postgres

Create one **Postgres** credential named `Supabase Postgres` using the Supabase database connection information. Prefer the Supabase session pooler for a hosted n8n instance. Enable SSL.

Every database query uses prepared parameters. The verified JWT subject is used as `owner_id`; the user ID sent in the request body is never trusted.

### Supabase JWT

Create one **JWT Auth** credential named `Supabase JWT`. Configure the signing algorithm and verification key to match the Supabase project's JWT signing configuration. This credential is attached to all three Webhook nodes.

For a Supabase asymmetric signing key, use **Key Type: PEM Key** and **Algorithm: ES256**. Leave **Private Key** empty for webhook verification. Paste the complete public key into **Public Key**, including both boundary lines and the line breaks:

```text
-----BEGIN PUBLIC KEY-----
YOUR_PUBLIC_KEY_BODY
-----END PUBLIC KEY-----
```

Do not paste the JWKS JSON, only the `x`/`y` values, a publishable key, the JWT secret, or the service-role key. Those values cause `secretOrPublicKey must be an asymmetric key when using ES256`.

The website sends the active Supabase token in the `Authorization: Bearer ...` header. n8n verifies it before the workflow runs, then the normalization node derives the user ID from the verified `sub` claim.

## Import and map credentials

Import all three JSON files. When n8n reports missing credentials, map each placeholder name to the matching credential above. The same credentials are reused across every node and workflow; no keys need to be entered into individual nodes.

The native setup nodes create and secure these tables automatically:

- `blueprint_sessions`: Avatar IQ, Offer IQ, intake, and project memory.
- `content_sessions`: generated slides, deck settings, and Content Maker history.
- `workspace_memory`: business, buyer, offer, brand, and creation preferences reused across chats.
- `assistant_sessions`: unified assistant briefs and results.
- `workspace_assets`: private logos, photos, documents, and generated asset metadata.
- `n8n_chat_histories`: private AI Agent conversation memory managed by Postgres Chat Memory.

The `n8n_chat_histories` table is blocked from Supabase's browser-facing `anon` and `authenticated` API roles. It is only accessed through n8n's direct Postgres credential.

## Website configuration

```env
N8N_WEBHOOK_BASE_URL=https://YOUR_N8N/webhook
N8N_MAX_BODY_BYTES=1000000
N8N_REQUEST_TIMEOUT_MS=120000
```

The website calls same-origin `/api/n8n/...` routes, which forward the Supabase access token to n8n. This avoids browser CORS failures and keeps the n8n host server-side. Restart or redeploy the website after changing this value.

## Activate

1. Confirm the Gemini, Postgres, and JWT credentials show as connected.
2. Publish or activate all three workflows so their production webhooks are registered.
3. Confirm `blueprint_sessions`, `content_sessions`, `workspace_memory`, `workspace_assets`, and `n8n_chat_histories` receive rows.

Successful and failed execution payload retention is disabled in the exported workflow settings because requests contain short-lived Supabase access tokens. Confirm those execution settings after import, especially if the n8n version changes them.
