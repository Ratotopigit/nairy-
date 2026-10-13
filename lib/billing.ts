"use client";

import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db, getFirebaseAuthToken } from "./firebase/config";
import type { PlanId } from "./plans";

/**
 * Billing state. `billing/{uid}` is written only by the server after Stripe
 * confirms a payment (firestore.rules gives the owner read access and nobody
 * write access). Everything here only decides what to SHOW; real limits are
 * enforced server-side.
 */

export type CheckoutPlan = PlanId;
export type BillingPlan = "none" | CheckoutPlan;

export interface BillingRecord {
  plan: BillingPlan;
  status: string;
  currentPeriodEnd: number | null;
  /** The subscription stops at currentPeriodEnd instead of renewing. */
  cancelAtPeriodEnd: boolean;
  /** Set once the user has paid through Stripe: they have a billing portal to open. */
  hasStripeCustomer: boolean;
}

const PAID_STATUSES = ["active", "trialing", "past_due"];

/** Firestore Timestamp, ISO string or number (seconds or ms) to ms, else null. */
function toMillis(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis() as number;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value < 1e11 ? value * 1000 : value;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function parseRecord(data: Record<string, unknown> | undefined): BillingRecord {
  const plan = data?.plan;
  return {
    plan: plan === "monthly" || plan === "annual" || plan === "lifetime" ? plan : "none",
    status: typeof data?.status === "string" ? data.status : "",
    currentPeriodEnd: toMillis(data?.current_period_end),
    cancelAtPeriodEnd: data?.cancel_at_period_end === true,
    hasStripeCustomer: typeof data?.stripe_customer_id === "string" && data.stripe_customer_id.startsWith("cus_"),
  };
}

/** paid = lifetime, or an active-ish subscription that has not run out. */
export function isPaid(record: BillingRecord, now: number = Date.now()): boolean {
  if (record.plan === "lifetime") return true;
  return (
    (record.plan === "monthly" || record.plan === "annual") &&
    PAID_STATUSES.includes(record.status) &&
    record.currentPeriodEnd !== null &&
    record.currentPeriodEnd > now
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

const NONE: BillingRecord = { plan: "none", status: "", currentPeriodEnd: null, cancelAtPeriodEnd: false, hasStripeCustomer: false };

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

/** Asks the server for a Stripe Checkout page for this plan and returns its URL. */
export function createCheckoutUrl(plan: CheckoutPlan): Promise<string> {
  return requestStripeUrl("/api/billing/checkout", { plan }, "Couldn't start checkout. Try again.");
}

/** Asks the server for a Stripe Customer Portal link (cancel, card, invoices). */
export function createPortalUrl(): Promise<string> {
  return requestStripeUrl("/api/billing/portal", {}, "Couldn't open billing management. Try again.");
}
