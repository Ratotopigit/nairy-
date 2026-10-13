/**
 * The one list of plans and prices. The Billing page and the first-login plan
 * step both render from this, so they can never show different amounts.
 *
 * These are display strings only. What is actually charged is the Stripe
 * Price behind each plan (STRIPE_PRICE_MONTHLY / _ANNUAL / _LIFETIME on the
 * server). If a price changes, change it in Stripe AND here.
 */

export type PlanId = "monthly" | "annual" | "lifetime";

export interface PlanInfo {
  id: PlanId;
  name: string;
  tagline: string;
  /** Crossed-out comparison price, if any. */
  was?: string;
  price: string;
  /** "/mo", "/yr", or "" for a one-time price. */
  unit: string;
  note: string;
  badge?: string;
  popular?: boolean;
  cta: string;
}

export const PLAN_CATALOG: PlanInfo[] = [
  {
    id: "monthly",
    name: "Monthly",
    tagline: "Perfect for getting started.",
    price: "$22",
    unit: "/mo",
    note: "Billed monthly",
    cta: "Start monthly",
  },
  {
    id: "annual",
    name: "Annually",
    tagline: "Best value for growing businesses.",
    was: "$264/yr",
    price: "$99",
    unit: "/yr",
    note: "Billed once a year, about $8.25 a month",
    badge: "Save 62%",
    popular: true,
    cta: "Start annually",
  },
  {
    id: "lifetime",
    name: "Life time",
    tagline: "Forever. No recurring costs.",
    price: "$222",
    unit: "",
    note: "Pay once",
    badge: "Pays for itself in about 2 years",
    cta: "Get lifetime",
  },
];

/**
 * Payment terms, shown before anyone pays (Billing page, first-login plan step,
 * and on Stripe's checkout page via functions/api/billing/checkout.js, which
 * keeps its own copy of the first sentence).
 */
export const PAYMENT_TERMS =
  "All payments are non-refundable. You can cancel a subscription anytime and keep access until the end of the period you've paid for.";

/** Every plan includes all of these. */
export const PLAN_FEATURES = [
  "Unlimited webinars and pages",
  "55 designer templates",
  "Confirmation and reminder emails",
  "Registrant list with CSV export",
  "AI Chat, Offer and Content tools",
  "Slide decks to .pptx and PDF",
];
