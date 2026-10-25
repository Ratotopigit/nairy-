"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db, getFirebaseAuthToken } from "./firebase/config";
import type { PlanId } from "./plans";
// The same access rule the webhook and checkout use (paid periods, 3-day grace after a failed renewal).
import { hasAccess, toMs } from "@/functions/api/billing/_entitlement.js";

/**
 * Billing state. `billing/{uid}` is written only by the server after Stripe
 * confirms a payment (firestore.rules gives the owner read access and nobody
 * write access). Everything here only decides what to SHOW; real limits are
 * enforced server-side.
 */

export type CheckoutPlan = PlanId;
/** "lifetime" is no longer sold; accounts that bought it keep it. */
export type BillingPlan = "none" | CheckoutPlan | "lifetime";

export interface BillingRecord {
  plan: BillingPlan;
  status: string;
  currentPeriodEnd: number | null;
  /** When paid access ends (grace policy applied by the server); null on records from before it existed. */
  accessUntil: number | null;
  /** The subscription stops at currentPeriodEnd instead of renewing. */
  cancelAtPeriodEnd: boolean;
  /** Set once the user has paid through Stripe: they have a billing portal to open. */
  hasStripeCustomer: boolean;
}


function parseRecord(data: Record<string, unknown> | undefined): BillingRecord {
  const plan = data?.plan;
  return {
    plan: plan === "monthly" || plan === "annual" || plan === "two_year" || plan === "lifetime" ? plan : "none",
    status: typeof data?.status === "string" ? data.status : "",
    currentPeriodEnd: toMs(data?.current_period_end),
    accessUntil: toMs(data?.access_until),
    cancelAtPeriodEnd: data?.cancel_at_period_end === true,
    hasStripeCustomer: typeof data?.stripe_customer_id === "string" && data.stripe_customer_id.startsWith("cus_"),
  };
}

/** Paid access now, by the shared rule (functions/api/billing/_entitlement.js). */
export function isPaid(record: BillingRecord, now: number = Date.now()): boolean {
  return hasAccess(
    { plan: record.plan, status: record.status, access_until: record.accessUntil, current_period_end: record.currentPeriodEnd },
    now,
  );
}

export interface EntitlementState {
  /** True until the first read (or the sign-in check) has finished. */
  loading: boolean;
  record: BillingRecord;
  paid: boolean;
  /** The read failed (for example the rules are not deployed). Treated as not paid. */
  error: boolean;
}

const NONE: BillingRecord = { plan: "none", status: "", currentPeriodEnd: null, accessUntil: null, cancelAtPeriodEnd: false, hasStripeCustomer: false };

/** Live view of the signed-in user's plan. Updates the moment the server records a payment. */
export function useEntitlement(): EntitlementState {
  const [state, setState] = useState<EntitlementState>({ loading: true, record: NONE, paid: false, error: false });

  useEffect(() => {
    let stopSnapshot: (() => void) | null = null;
    const stopAuth = onAuthStateChanged(auth, (user) => {
      stopSnapshot?.();
      stopSnapshot = null;
      if (!user) {
        setState({ loading: false, record: NONE, paid: false, error: false });
        return;
      }
      setState((prev) => ({ ...prev, loading: true }));
      stopSnapshot = onSnapshot(
        doc(db, "billing", user.uid),
        (snap) => {
          const record = parseRecord(snap.data());
          setState({ loading: false, record, paid: isPaid(record), error: false });
        },
        () => setState({ loading: false, record: NONE, paid: false, error: true }),
      );
    });
    return () => {
      stopAuth();
      stopSnapshot?.();
    };
  }, []);

  return state;
}

/**
 * Checkout is offered only when this build carries a Stripe publishable key,
 * so a deploy without one keeps showing "coming soon" instead of broken buttons.
 * (Hosted Checkout redirects to Stripe, so the key itself is never sent anywhere.)
 */
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
export const billingEnabled = PUBLISHABLE_KEY.startsWith("pk_");
export const billingTestMode = PUBLISHABLE_KEY.startsWith("pk_test_");

/** POSTs to one of the billing functions and returns the Stripe URL it hands back. */
async function requestStripeUrl(path: string, body: unknown, fallbackError: string): Promise<string> {
  const token = await getFirebaseAuthToken();
  if (!token) throw new Error("Sign in again and retry.");
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as { url?: unknown; error?: unknown } | null;
  if (res.ok && typeof data?.url === "string") return data.url;
  throw new Error(typeof data?.error === "string" ? data.error : fallbackError);
}

/**
 * Asks the server for a Stripe Checkout page for this plan and returns its URL.
 * `acceptTerms` is the user's tick on the payment-terms box; the server refuses without it.
 */
export function createCheckoutUrl(plan: CheckoutPlan, acceptTerms: boolean): Promise<string> {
  return requestStripeUrl("/api/billing/checkout", { plan, accept_terms: acceptTerms }, "Couldn't start checkout. Try again.");
}

/**
 * Does the signed-in user qualify for the $1 / 7-day introductory offer? Same
 * rule as checkout. null when it can't be checked (the buttons then stay neutral).
 */
export async function fetchIntroEligibility(): Promise<boolean | null> {
  try {
    const token = await getFirebaseAuthToken();
    if (!token) return null;
    const res = await fetch("/api/billing/eligibility", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = (await res.json().catch(() => null)) as { intro?: unknown } | null;
    return res.ok && typeof data?.intro === "boolean" ? data.intro : null;
  } catch {
    return null;
  }
}

/** Asks the server for a Stripe Customer Portal link (cancel, card, invoices). */
export function createPortalUrl(): Promise<string> {
  return requestStripeUrl("/api/billing/portal", {}, "Couldn't open billing management. Try again.");
}
