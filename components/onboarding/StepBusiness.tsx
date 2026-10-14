"use client";

import React from "react";
import { Building2 } from "lucide-react";
import { OnboardingData } from "@/lib/onboarding";

interface StepBusinessProps {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

export function StepBusiness({ data, onChange }: StepBusinessProps) {
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          What is your business or brand called?
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground max-w-md mx-auto">
          This will establish your core brand identity across Webinar Chat, Webinar Offer, and your presentation decks.
        </p>
      </div>

      <div className="w-full space-y-2 text-left">
        <label htmlFor="businessName" className="block text-sm font-semibold text-foreground">
          Business or Brand Name <span className="text-accent">*</span>
        </label>
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground">
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
            className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all hover:border-border-strong focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
