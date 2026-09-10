"use client";

import React from "react";
import { Building2, Sparkles } from "lucide-react";
import { OnboardingData } from "@/lib/onboarding";

interface StepBusinessProps {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

export function StepBusiness({ data, onChange }: StepBusinessProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          What is your business or brand called?
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          This will establish your core brand identity across Avatar IQ, Offer IQ, and your presentation decks.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="businessName" className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)] mb-2">
            Business or Brand Name <span className="text-[var(--accent)]">*</span>
          </label>
          <div className="relative max-w-lg">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--muted-foreground)]">
              <Building2 className="size-4" />
            </div>
            <input
              id="businessName"
              type="text"
              required
              value={data.businessName}
              onChange={(e) => onChange({ businessName: e.target.value })}
              placeholder="e.g., Summit Growth Partners, Acme Labs"
              autoFocus
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] py-3.5 pl-11 pr-4 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 transition-all hover:border-[var(--border-strong)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
        </div>

        {/* Informational callout card */}
        <div className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 max-w-lg">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
            <Sparkles className="size-4" />
          </div>
          <div className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            <span className="font-semibold text-[var(--foreground)]">Pro tip:</span> If you are operating as a personal brand or solopreneur, feel free to use your own name or your primary project handle. You can adjust this anytime in your Workspace Settings.
          </div>
        </div>
      </div>
    </div>
  );
}
