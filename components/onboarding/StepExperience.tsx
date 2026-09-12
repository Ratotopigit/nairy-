"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Check,
  Compass,
  BookOpen,
  Layers,
  Award,
  Megaphone,
  TrendingUp,
  Share2,
  Mail,
  PenTool,
  Zap,
  Target,
  Globe,
  CircleOff,
} from "lucide-react";
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
    icon: Compass,
  },
  {
    id: "some-experience",
    label: "Some experience",
    description: "Familiar with basic tools, have run some ads or written content.",
    icon: BookOpen,
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Comfortable with funnels, conversion metrics, and email flows.",
    icon: Layers,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Experienced growth practitioner or operator managing complex systems.",
    icon: Award,
  },
];

const KNOWN_AREAS = [
  { label: "Marketing", icon: Megaphone },
  { label: "Sales", icon: TrendingUp },
  { label: "Social media", icon: Share2 },
  { label: "Email marketing", icon: Mail },
  { label: "Content creation", icon: PenTool },
  { label: "Automation", icon: Zap },
  { label: "Online advertising", icon: Target },
  { label: "Website building", icon: Globe },
  { label: "None yet", icon: CircleOff },
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
    <div className="space-y-5">
      {/* Step Heading */}
      <div>
        <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--foreground)]">
          Your current experience
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
          We tune the technical depth of our tutorials, prompts, and templates to match your comfort level.
        </p>
      </div>

      {/* Q10: Experience Level */}
      <div className="space-y-2">
        <label className="block text-xs sm:text-sm font-bold text-[var(--foreground)]">
          How experienced are you with online business and marketing? <span className="text-red-500">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {EXPERIENCE_LEVELS.map((level) => {
            const isSelected = data.experienceLevel === level.label;
            const Icon = level.icon;
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => onChange({ experienceLevel: level.label })}
                className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all duration-150 focus:outline-none ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)]/[0.03] text-[var(--primary)] ring-1 ring-[var(--primary)] shadow-2xs"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <Icon
                      className={`size-4 shrink-0 transition-colors ${
                        isSelected
                          ? "text-[var(--primary)]"
                          : "text-slate-500 group-hover:text-slate-700"
                      }`}
                    />
                    <span className="text-xs font-semibold truncate leading-snug">
                      {level.label}
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
                </div>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                  {level.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Q11: Known Areas (Multi-select) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs sm:text-sm font-bold text-[var(--foreground)]">
            Which areas do you already know well? <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-slate-500">
            Select all that apply
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {KNOWN_AREAS.map(({ label, icon: Icon }) => {
            const isSelected = (data.knownAreas || []).includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleArea(label)}
                className={`group relative flex items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-150 focus:outline-none ${
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
                    {label}
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
      </div>
    </div>
  );
}
