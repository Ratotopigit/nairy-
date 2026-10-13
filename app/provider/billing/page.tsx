"use client";

import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";

/**
 * Billing. Payments are not switched on yet, so this page says exactly that
 * rather than showing a card form that does nothing.
 */
export default function BillingPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/provider/webinars"
          aria-label="Back to webinars"
          className="grid size-9 place-items-center rounded-xl border border-border bg-card transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Billing</h1>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Current plan</p>
        <p className="mt-1 text-xl font-semibold tracking-[-0.01em]">Free</p>
        <p className="mt-1 text-sm text-muted-foreground">Everything in your account is available at no charge right now.</p>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-secondary text-muted-foreground">
            <CreditCard className="size-4" />
          </span>
          <div>
            <p className="font-medium">Payment method</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Paid plans and card payments aren&apos;t available yet. When they are, you&apos;ll add and manage your card here, and nothing is charged until you choose a plan.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
