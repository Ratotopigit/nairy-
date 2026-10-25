/**
 * Who has paid access, in one place. Used by the webhook (to compute
 * access_until), the checkout function and the app (lib/billing.ts).
 *
 * Policy:
 *  - trialing / active: access until the end of the period already paid for
 *    (the 7-day $1 week, or the paid month / year / two years), including after
 *    a cancellation, which takes effect at the period end.
 *  - past_due (a renewal charge failed): GRACE_DAYS of access from the start of
 *    the unpaid period, never more than the period itself. Stripe keeps retrying;
 *    a successful retry makes the subscription active again and restores access.
 *  - canceled / unpaid / incomplete / paused: no access.
 *  - lifetime (no longer sold, kept for buyers): always.
 */
export const GRACE_DAYS = 3;
const DAY_MS = 86_400_000;
const SUBSCRIPTION_PLANS = ["monthly", "annual", "two_year"];

/** Milliseconds from an ISO string, a number (seconds or ms) or a Firestore Timestamp, else null. */
export function toMs(value) {
  if (value && typeof value === "object" && typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "number" && Number.isFinite(value)) return value < 1e11 ? value * 1000 : value;
  if (typeof value === "string" && value) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

/**
 * The moment access ends for a subscription in this state, as an ISO string,
 * or "" for none. `periodStart` / `periodEnd` are the current period's bounds (ms).
 */
export function accessUntil(status, periodStart, periodEnd) {
  if (!periodEnd) return "";
  if (status === "trialing" || status === "active") return new Date(periodEnd).toISOString();
  if (status === "past_due" && periodStart) return new Date(Math.min(periodEnd, periodStart + GRACE_DAYS * DAY_MS)).toISOString();
  return "";
}

/**
 * Does this billing/{uid} record (plain values) grant paid access now?
 * Records written before access_until existed (by n8n) fall back to the period
 * end for trialing / active only; past_due without access_until gets no access.
 */
export function hasAccess(doc, now = Date.now()) {
  if (!doc || typeof doc !== "object") return false;
  if (doc.plan === "lifetime") return true;
  if (!SUBSCRIPTION_PLANS.includes(doc.plan)) return false;
  const until = toMs(doc.access_until);
  if (until !== null) return until > now;
  const end = toMs(doc.current_period_end);
  return (doc.status === "trialing" || doc.status === "active") && end !== null && end > now;
}
