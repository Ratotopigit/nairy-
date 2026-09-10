"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { OnboardingData } from "@/lib/onboarding";

interface StepAboutYouProps {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

const ROLES = [
  "Business owner",
  "Entrepreneur",
  "Marketer",
  "Coach / Consultant",
  "Course creator",
  "Agency",
  "Freelancer",
  "Other",
];

export function StepAboutYou({ data, onChange }: StepAboutYouProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Tell us about you
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          We&apos;ll tailor your personalized creation workspace and learning tracks based on your role.
        </p>
      </div>

      {/* Q1: Name */}
      <div className="space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
          What should we call you? <span className="text-[var(--accent)]">*</span>
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-xs text-[var(--muted-foreground)] mb-1.5">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              required
              value={data.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              placeholder="Alex"
              autoFocus
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 transition-all hover:border-[var(--border-strong)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-xs text-[var(--muted-foreground)] mb-1.5">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              required
              value={data.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              placeholder="Rivera"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 transition-all hover:border-[var(--border-strong)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
        </div>
      </div>

      {/* Q2: Role */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
            What best describes you? <span className="text-[var(--accent)]">*</span>
          </label>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Select the identity that aligns closest with your primary focus.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {ROLES.map((role) => {
            const isSelected = data.role === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => onChange({ role })}
                className={`group relative flex items-center justify-between rounded-xl border p-3.5 text-left text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--card)] text-[var(--primary)] shadow-xs ring-1 ring-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                }`}
              >
                <span>{role}</span>
                {isSelected ? (
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex size-4 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]"
                  >
                    <Check className="size-2.5 stroke-[3]" />
                  </motion.span>
                ) : (
                  <span className="size-4 rounded-full border border-[var(--border)] group-hover:border-[var(--border-strong)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Custom role input if "Other" is selected */}
        {data.role === "Other" && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-2"
          >
            <label htmlFor="customRole" className="block text-xs text-[var(--muted-foreground)] mb-1.5">
              Please specify your role:
            </label>
            <input
              id="customRole"
              type="text"
              value={data.customRole || ""}
              onChange={(e) => onChange({ customRole: e.target.value })}
              placeholder="e.g., Fractional CMO, Community Builder"
              className="w-full sm:w-1/2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 transition-all hover:border-[var(--border-strong)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
