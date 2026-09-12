"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Check,
  User,
  Rocket,
  Megaphone,
  Users,
  GraduationCap,
  Building2,
  Laptop,
  MoreHorizontal,
} from "lucide-react";
import { OnboardingData } from "@/lib/onboarding";

interface StepAboutYouProps {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

const ROLE_OPTIONS = [
  { role: "Business owner", icon: User },
  { role: "Entrepreneur", icon: Rocket },
  { role: "Marketer", icon: Megaphone },
  { role: "Coach / Consultant", icon: Users },
  { role: "Course creator", icon: GraduationCap },
  { role: "Agency", icon: Building2 },
  { role: "Freelancer", icon: Laptop },
  { role: "Other", icon: MoreHorizontal },
];

export function StepAboutYou({ data, onChange }: StepAboutYouProps) {
  return (
    <div className="space-y-5">
      {/* Step Heading */}
      <div>
        <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--foreground)]">
          Let’s personalize your experience
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
          We’ll tailor your workspace and learning tracks based on your role and goals.
        </p>
      </div>

      {/* Q1: Name */}
      <div className="space-y-1.5">
        <label className="block text-xs sm:text-sm font-bold text-[var(--foreground)]">
          What should we call you? <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="firstName" className="block text-xs text-slate-500 mb-1">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              required
              value={data.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              placeholder="Shrawan"
              autoFocus
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-all hover:border-slate-300 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none shadow-2xs"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-xs text-slate-500 mb-1">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              required
              value={data.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              placeholder="Karki"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 transition-all hover:border-slate-300 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Q2: Role */}
      <div className="space-y-2">
        <div>
          <label className="block text-xs sm:text-sm font-bold text-[var(--foreground)]">
            What best describes you? <span className="text-red-500">*</span>
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            Select the identity that aligns closest with your primary focus.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {ROLE_OPTIONS.map(({ role, icon: Icon }) => {
            const isSelected = data.role === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => onChange({ role })}
                className={`group relative flex items-center justify-between rounded-2xl border px-3.5 py-3 text-left transition-all duration-150 focus:outline-none ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)]/[0.03] text-[var(--primary)] ring-1 ring-[var(--primary)] shadow-2xs"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Icon
                    className={`size-4 shrink-0 transition-colors ${
                      isSelected
                        ? "text-[var(--primary)]"
                        : "text-slate-500 group-hover:text-slate-700"
                    }`}
                  />
                  <span className="text-xs font-semibold truncate leading-snug">
                    {role}
                  </span>
                </div>

                {isSelected ? (
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white"
                  >
                    <Check className="size-2.5 stroke-[3]" />
                  </motion.div>
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-slate-300 group-hover:border-slate-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Custom role input if "Other" is selected */}
        {data.role === "Other" && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-1"
          >
            <label htmlFor="customRole" className="block text-xs text-slate-500 mb-1">
              Please specify your role:
            </label>
            <input
              id="customRole"
              type="text"
              value={data.customRole || ""}
              onChange={(e) => onChange({ customRole: e.target.value })}
              placeholder="e.g., Fractional CMO, Community Builder"
              className="w-full sm:w-1/2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-900 placeholder-slate-400 transition-all hover:border-slate-300 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none shadow-2xs"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
