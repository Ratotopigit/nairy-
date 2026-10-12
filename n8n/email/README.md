# Platform emails

Five n8n workflows, all generated from this folder:

| Workflow | Trigger | Sends |
|---|---|---|
| `10 - Webinar Registration Confirmation` | webhook `webinar-registered`, called by the registration page | a confirmation to the registrant, with an .ics invite when the session has a date |
| `11 - Webinar Morning Summary` | hourly | each webinar owner, at 7am in *their* timezone, the last 24h of registrations (only on days with any) |
| `12 - Welcome Email` | webhook `user-welcome`, called the first time a new account's profile is created | a welcome listing what they can do |
| `13 - Admin Broadcast` | webhook `admin-broadcast`, called from `/admin/email` | an admin's announcement, one email per user, with an unsubscribe link |
| `14 - Email Unsubscribe` | webhook `email-unsubscribe`, called from `/unsubscribe` | nothing; records the opt-out |

Everything is sent by n8n's **Gmail** node from the connected Explosion Marketing Google Workspace account. Display names: `"<presenter> via Webinar Stack"` for registration confirmations, `"Webinar Stack"` for everything else. Confirmation replies go to the webinar's owner.

## How the pieces fit

- Requests carry **ids or a Firebase sign-in token, never an email address**. Every workflow reads the address from Firestore or from the verified token, so none of these webhooks can mail arbitrary people.
- The welcome email only goes to accounts Firebase created in the last 24 hours. The `users` collection is newer than many accounts, so a long-standing user's first profile sync must not trigger a welcome.
- Broadcasts require the caller to be an admin by the same three markers as `isAdmin()` in `firestore.rules`.
- `email_log/<type>_<ids>` is the "already sent" guard for confirmations and welcomes. The morning summary also reads it, so it never has to scan every webinar.
- `email_state/<owner>` stops the summary going out twice a day. `email_prefs/<uid>` holds each user's unsubscribe token and opt-out. `broadcasts/<id>` records each broadcast's result for the admin page.
- All of these fall under default-deny for the browser; n8n uses the Firebase service account.

## Editing

Edit `templates.js` (the emails) or `build-workflows.mjs` (the workflow logic), then:

```
node n8n/email/build-workflows.mjs
```

Never hand-edit the generated `n8n/*-workflow.json`; the next build overwrites them.

## One-time setup

1. In n8n: **Credentials → Add credential → Gmail OAuth2 API → Sign in with Google**, using the Explosion Marketing account the emails should come from. Name it `Explosion Marketing Gmail`.
2. Import the five JSON files. In each **Send…** node, choose that credential.
3. **Publish** each workflow. Drafts do nothing until published.

## Limits to know

- Google Workspace allows roughly **2,000 emails per day per account**, shared across all of these workflows. Plenty for confirmations and welcomes. A broadcast to thousands of users would hit it, and the overflow is recorded as `failed` and raises Failure Alerts.
- The Gmail node cannot set custom headers, so broadcasts carry a visible unsubscribe link (which Australia's Spam Act requires) but no one-click `List-Unsubscribe` header. Fine at this volume; revisit with a dedicated sending service if broadcasts grow large.
- Anyone can put someone else's address into a sign-up or registration form. If that gets abused, add Cloudflare Turnstile to those forms.
