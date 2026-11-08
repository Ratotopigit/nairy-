"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export const INPUT =
  "min-h-11 w-full rounded-xl border border-border-strong bg-card px-3.5 py-2.5 text-sm outline-none transition placeholder:text-[#6b7280] focus:border-primary focus:ring-2 focus:ring-primary/15";

export function Field({
  label,
  hint,
  hintId,
  right,
  children,
}: {
  label: string;
  hint?: string;
  /** Lets an invalid input point at the hint (aria-describedby) when it holds the error. */
  hintId?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {right}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span id={hintId} className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold tracking-[-0.01em]">{title}</h3>
        {hint ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Divider() {
  return <hr className="border-border" />;
}

/** Rarely used settings, folded away but one click from view. Children stay mounted, so nothing typed is lost. */
export function MoreOptions({ label = "More options", children }: { label?: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-border-strong bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb] [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDown className="size-5 shrink-0 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-7 border-t border-border px-4 pb-5 pt-5">{children}</div>
    </details>
  );
}
