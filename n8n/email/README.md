# Webinar emails

Two n8n workflows, generated from this folder:

| Workflow | Trigger | Sends |
|---|---|---|
| `10 - Webinar Registration Confirmation` | webhook `webinar-registered`, called by the registration page | a confirmation to the registrant, with an .ics invite |
| `11 - Webinar Morning Summary` | hourly | each webinar owner, at 7am in *their* timezone, a list of the last 24h of registrations, only on days with any |

Sent through Resend from `hello@webinarstackai.com`, display name `"<presenter> via Webinar Stack"`, replies to the webinar owner.

## How the pieces fit

- The page sends **only ids** (`webinar_id`, `registrant_id`) plus the visitor's timezone. The workflow reads the address from Firestore, so the webhook can't be used to email arbitrary people.
- Every confirmation writes `email_log/confirm_<webinar>_<registrant>`. That entry is the "already sent" guard, and it's also what the morning summary reads, so the summary never has to scan every webinar.
- `email_state/<owner_id>.last_summary_at` stops the summary going out twice in a day.
- Both collections fall under the default-deny rule: the browser can't touch them, and n8n uses the service account.
- Resend `Idempotency-Key` headers stop duplicate sends even when two triggers race.

## Editing

Edit `webinar-emails.js` (the templates) or `build-workflows.mjs` (the workflow logic), then:

```
node n8n/email/build-workflows.mjs
```

Don't hand-edit the generated `n8n/webinar-*-workflow.json`; the next build overwrites them.

## One-time setup

1. **Resend:** create an account, add the domain `webinarstackai.com`, and add the DNS records it shows in Cloudflare (DNS only / grey cloud). Also add DMARC:
   `TXT _dmarc  v=DMARC1; p=none; rua=mailto:<an inbox you read>`
2. **API key:** in Resend, create a key with *Sending access* only.
3. **n8n credential:** Credentials → New → *Header Auth*. Name: `Resend API key`. Header name: `Authorization`, value: `Bearer re_…`.
4. **Import** both JSON files, point their *Send via Resend* nodes at that credential, then **publish**. Drafts do nothing until published.

## Limits to know

- On Resend's free plan, the daily cap is **shared by every user of the platform**. One popular webinar can use it up; later sends fail, get logged as `failed`, and raise Failure Alerts. Move to a paid plan before real users rely on it.
- The public form can be filled in with someone else's address, like any sign-up form. If that gets abused, add Cloudflare Turnstile to the registration form.
