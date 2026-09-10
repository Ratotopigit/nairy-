"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Award, BookOpen } from "lucide-react";
import { OnboardingData } from "@/lib/onboarding";

interface StepExperienceProps {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
}

const EXPERIENCE_LEVELS = [
  {
    id: "beginner",
    label: "Beginner",
    description: "New to digital marketing funnels, copy, and online acquisition.",
  },
  {
    id: "some-experience",
    label: "Some experience",
    description: "Familiar with basic tools, have run some ads or written content.",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Comfortable with funnels, conversion metrics, and email flows.",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Experienced growth practitioner or operator managing complex systems.",
  },
];

const KNOWN_AREAS = [
  "Marketing",
  "Sales",
  "Social media",
  "Email marketing",
  "Content creation",
  "Automation",
  "Online advertising",
  "Website building",
  "None yet",
];

export function StepExperience({ data, onChange }: StepExperienceProps) {
  const toggleArea = (area: string) => {
    const current = data.knownAreas || [];
    if (area === "None yet") {
      if (current.includes("None yet")) {
        onChange({ knownAreas: [] });
      } else {
        onChange({ knownAreas: ["None yet"] });
      }
      return;
    }

    const withoutNone = current.filter((a) => a !== "None yet");
    if (withoutNone.includes(area)) {
      onChange({ knownAreas: withoutNone.filter((a) => a !== area) });
    } else {
      onChange({ knownAreas: [...withoutNone, area] });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] sm:text-2xl">
          Your current experience
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          We tune the technical depth of our tutorials, prompts, and templates to match your comfort level.
        </p>
      </div>

      {/* Q10: Experience Level */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Award className="size-4 text-[var(--primary)]" />
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
            How experienced are you with online business and marketing? <span className="text-[var(--accent)]">*</span>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EXPERIENCE_LEVELS.map((level) => {
            const isSelected = data.experienceLevel === level.label;
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => onChange({ experienceLevel: level.label })}
                className={`group relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--card)] shadow-xs ring-1 ring-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--foreground)]">
                    {level.label}
                  </span>
                  {isSelected ? (
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]"
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </motion.span>
                  ) : (
                    <span className="size-4 shrink-0 rounded-full border border-[var(--border)] group-hover:border-[var(--border-strong)]" />
                  )}
                </div>
                <p className="mt-2 text-xs text-[var(--muted-foreground)] leading-relaxed">
                  {level.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q11: Known Areas (Multi-select) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-[var(--primary)]" />
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]">
              Which areas do you already know well? <span className="text-[var(--accent)]">*</span>
            </label>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">
            Select all that apply
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {KNOWN_AREAS.map((area) => {
            const isSelected = (data.knownAreas || []).includes(area);
            return (
              <button
                key={area}
                type="button"
                onClick={() => toggleArea(area)}
                className={`group relative flex items-center justify-between rounded-xl border p-3.5 text-left text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--card)] text-[var(--primary)] shadow-xs ring-1 ring-[var(--primary)]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--surface)]"
                }`}
              >
                <span>{area}</span>
                {isSelected ? (
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]"
                  >
                    <Check className="size-2.5 stroke-[3]" />
                  </motion.span>
                ) : (
                  <span className="size-4 shrink-0 rounded-full border border-[var(--border)] group-hover:border-[var(--border-strong)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
