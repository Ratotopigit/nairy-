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
        <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--foreground)]">
          What is your business or brand called?
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
          This will establish your core brand identity across Webinar Chat, Webinar Offer, and your presentation decks.
        </p>
      </div>

      <div className="w-full space-y-2 text-left">
        <label htmlFor="businessName" className="block text-xs sm:text-sm font-bold text-[var(--foreground)]">
          Business or Brand Name <span className="text-red-500">*</span>
        </label>
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
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
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-all hover:border-slate-300 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none shadow-2xs"
          />
        </div>
      </div>
    </div>
  );
}
