/**
 * The one list of plans and prices. The Billing page and the first-login plan
 * step both render from this, so they can never show different amounts.
 *
 * These are display strings only. What is actually charged is the Stripe
 * Price behind each plan (STRIPE_PRICE_MONTHLY / _ANNUAL / _TWO_YEAR on the
 * server). If a price changes, change it in Stripe AND here.
 */

export type PlanId = "monthly" | "annual" | "two_year";

export interface PlanInfo {
  id: PlanId;
  name: string;
  tagline: string;
  /** What each charge is ("$948"). */
  price: string;
  /** How often a subscription renews ("every month"); absent for one-time plans. */
  renews?: string;
  /** The per-month figure shown large, next to the struck-through monthly price ("$79"). */
  perMonth: string;
  /** What is actually charged and how often ("Billed $948 annually"). */
  billedAs: string;
  /** Billing page: button for customers who don't qualify for the $1 week. */
  fullPriceCta: string;
  /** Saving against paying monthly, rounded down so it never overstates. */
  badge?: string;
  popular?: boolean;
  cta: string;
}

export const PLAN_CATALOG: PlanInfo[] = [
  {
    id: "monthly",
    name: "Monthly",
    tagline: "Perfect for getting started.",
    price: "$97",
    renews: "every month",
    perMonth: "$97",
    billedAs: "Billed $97 monthly",
    fullPriceCta: "Subscribe for $97/month",
    cta: "Start monthly",
  },
  {
    id: "annual",
    name: "Annually",
    tagline: "Best value for growing businesses.",
    price: "$948",
    renews: "every year",
    perMonth: "$79",
    billedAs: "Billed $948 annually",
    fullPriceCta: "Subscribe for $948/year",
    badge: "Save 18%",
    popular: true,
    cta: "Start annually",
  },
  {
    id: "two_year",
    name: "Two years",
    tagline: "Lowest price, locked in for two years.",
    price: "$1,608",
    renews: "every 2 years",
    perMonth: "$67",
    billedAs: "Billed $1,608 every two years",
    fullPriceCta: "Subscribe for $1,608/2 years",
    badge: "Save 30%",
    cta: "Start two years",
  },
];

/** The monthly price, struck through next to the cheaper per-month figures. */
export const MONTHLY_PRICE = PLAN_CATALOG.find((p) => p.id === "monthly")?.price ?? "";

/**
 * Payment terms, shown before anyone pays (Billing page, first-login plan step,
 * and on Stripe's checkout page via functions/api/billing/checkout.js, which
 * keeps its own copy of the first sentence).
 */
export const PAYMENT_TERMS =
  "All payments are non-refundable. You can cancel a subscription anytime and keep access until the end of the period you've paid for.";

/**
 * First-time subscribers pay this once for the first INTRO_DAYS, then the plan's
 * regular price (functions/api/billing/checkout.js, which reads the real
 * amounts from Stripe for its own wording).
 */
export const INTRO_PRICE = "$1";
export const INTRO_DAYS = 7;

/** "$1 for your first 7 days, then $22 every month until you cancel." */
export function introTerms(plan: PlanInfo): string {
  return plan.renews ? `${INTRO_PRICE} for your first ${INTRO_DAYS} days, then ${plan.price} ${plan.renews} until you cancel.` : "";
}

/** The published Terms of Service (promo site), linked from the checkout confirmation. */
export const TERMS_URL = "https://info.webinarstackai.com/terms";

/** What the consent checkbox says, next to the plan cards. */
export const CONSENT_LABEL =
  `I agree to these payment terms. New subscribers pay ${INTRO_PRICE} today; after ${INTRO_DAYS} days the plan's regular price is charged automatically and keeps renewing until I cancel. Returning customers pay the regular price today.`;

const PENDING_PLAN_KEY = "billing:pending-plan";
const PLAN_IDS: PlanId[] = ["monthly", "annual", "two_year"];

/**
 * A plan picked before signing in (e.g. /signup?plan=annual from the promo
 * site) is kept here until checkout opens. Storage may be unavailable; then the
 * pick is simply not remembered.
 */
export function rememberPlanFromUrl(): void {
  try {
    const plan = new URLSearchParams(window.location.search).get("plan");
    if (plan && (PLAN_IDS as string[]).includes(plan)) localStorage.setItem(PENDING_PLAN_KEY, plan);
  } catch {}
}

export function pendingPlan(): PlanId | null {
  try {
    const plan = localStorage.getItem(PENDING_PLAN_KEY);
    return plan && (PLAN_IDS as string[]).includes(plan) ? (plan as PlanId) : null;
  } catch {
    return null;
  }
}

export function clearPendingPlan(): void {
  try {
    localStorage.removeItem(PENDING_PLAN_KEY);
  } catch {}
}

/** Every plan includes all of these. */
export const PLAN_FEATURES = [
  "Unlimited webinars and pages",
  "55 designer templates",
  "Confirmation and reminder emails",
  "Registrant list with CSV export",
  "AI Chat, Offer and Content tools",
  "Slide decks to .pptx and PDF",
];
