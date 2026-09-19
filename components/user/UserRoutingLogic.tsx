"use client";

import type { ReactNode } from "react";
import { Calendar, CheckCircle, Clock } from "lucide-react";

interface RoutingResult {
  score: number;
  category: "high-value" | "consultation-ready" | "nurture";
  title: string;
  description: string;
  actionText: string;
  actionHref?: string;
  actionIcon?: ReactNode;
}

const routingResults: { [key: number]: RoutingResult } = {
  100: {
    score: 100,
    category: "high-value",
    title: "Fast-Track Qualified",
    description:
      "Score 100/100 - Elite qualification. You're ready for an immediate 1-on-1 consultation.",
    actionText: "Book Your Consultation",
    actionHref: "#",
    actionIcon: <Calendar className="w-4 h-4 mr-2 text-primary" />,
  },
  95: {
    score: 95,
    category: "high-value",
    title: "Fast-Track Qualified",
    description:
      "Score 95/100 - Exceptional qualification. Priority consultation booking.",
    actionText: "Book Your Consultation",
    actionHref: "#",
    actionIcon: <Calendar className="w-4 h-4 mr-2 text-primary" />,
  },
  85: {
    score: 85,
    category: "high-value",
    title: "Fast-Track Qualified",
    description:
      "Score 85+/100 - You qualify for a 1-on-1 consultation with automatic calendar hold.",
    actionText: "Book Your Consultation",
    actionHref: "#",
    actionIcon: <Calendar className="w-4 h-4 mr-2 text-primary" />,
  },
  80: {
    score: 80,
    category: "consultation-ready",
    title: "Consultation-Ready",
    description:
      "Score 70-84/100 - You're consultation-ready. Complete the readiness checklist.",
    actionText: "View Checklist",
    actionHref: "#",
    actionIcon: <CheckCircle className="w-4 h-4 mr-2 text-ochre" />,
  },
  75: {
    score: 75,
    category: "consultation-ready",
    title: "Consultation-Ready",
    description:
      "Score 70-84/100 - Strong qualification. Ready for discovery call.",
    actionText: "View Checklist",
    actionHref: "#",
    actionIcon: <CheckCircle className="w-4 h-4 mr-2 text-ochre" />,
  },
  70: {
    score: 70,
    category: "consultation-ready",
    title: "Consultation-Ready",
    description:
      "Score 70-84/100 - You qualify for consultation. Begin the readiness process.",
    actionText: "View Checklist",
    actionHref: "#",
    actionIcon: <CheckCircle className="w-4 h-4 mr-2 text-ochre" />,
  },
  50: {
    score: 50,
    category: "nurture",
    title: "Nurture Sequence",
    description:
      "Score < 70/100 - Keep nurturing. You'll receive updates on future opportunities.",
    actionText: "Stay Updated",
    actionHref: "#",
    actionIcon: <Clock className="w-4 h-4 mr-2 text-accent" />,
  },
  30: {
    score: 30,
    category: "nurture",
    title: "Nurture Sequence",
    description:
      "Score < 70/100 - Stay connected. Future masterclasses will be announced.",
    actionText: "Stay Updated",
    actionHref: "#",
    actionIcon: <Clock className="w-4 h-4 mr-2 text-accent" />,
  },
  0: {
    score: 0,
    category: "nurture",
    title: "Nurture Sequence",
    description:
      "Score < 70/100 - Keep engaging. Future offers will match your journey.",
    actionText: "Stay Updated",
    actionHref: "#",
    actionIcon: <Clock className="w-4 h-4 mr-2 text-accent" />,
  },
};

export function useQualificationScoring() {
  const calculateScore = (data: {
    offerType: string;
    revenueRange: string;
    audienceSize: string;
    budgetRange: string;
    timeline: string;
  }): number => {
    let score = 0;

    if (data.offerType === "High-Value Coaching") score += 25;
    else if (data.offerType === "Mastermind") score += 20;
    else if (data.offerType === "Group Program") score += 15;
    else score += 10;

    if (data.revenueRange === "7-figure") score += 20;
    else if (data.revenueRange === "6-figure") score += 15;
    else if (data.revenueRange === "5-figure") score += 10;
    else score += 5;

    if (data.audienceSize === "5,000+") score += 20;
    else if (data.audienceSize === "1,000-5,000") score += 15;
    else if (data.audienceSize === "500-1,000") score += 10;
    else score += 5;

    if (data.budgetRange === "50,000+") score += 20;
    else if (data.budgetRange === "20,000-50,000") score += 15;
    else if (data.budgetRange === "5,000-20,000") score += 10;
    else score += 5;

    if (data.timeline === "Within 30 days") score += 15;
    else if (data.timeline === "Within 90 days") score += 10;
    else if (data.timeline === "Within 6 months") score += 5;

    return Math.min(Math.max(score, 0), 100);
  };

  const getRoutingResult = (score: number): RoutingResult => {
    if (score >= 85) return routingResults[85];
    if (score >= 70) return routingResults[75];
    return routingResults[50];
  };

  return { calculateScore, getRoutingResult };
}

export default function UserRoutingLogic({ score }: { score: number }) {
  let category: "high-value" | "consultation-ready" | "nurture";
  let result: RoutingResult | undefined;

  if (score >= 85) {
    category = "high-value";
    result = {
      score,
      category: "high-value",
      title: "Fast-Track Qualified",
      description:
        "Score 85+/100 - You qualify for a 1-on-1 consultation with automatic calendar hold confirmation.",
      actionText: "Book Your Consultation",
      actionHref: "#",
      actionIcon: <Calendar className="w-4 h-4 mr-2 text-primary" />,
    };
  } else if (score >= 70) {
    category = "consultation-ready";
    result = {
      score,
      category: "consultation-ready",
      title: "Consultation-Ready",
      description:
        "Score 70-84/100 - You're consultation-ready. Complete the readiness checklist.",
      actionText: "View Checklist",
      actionHref: "#",
      actionIcon: <CheckCircle className="w-4 h-4 mr-2 text-ochre" />,
    };
  } else {
    category = "nurture";
    result = {
      score,
      category: "nurture",
      title: "Nurture Sequence",
      description:
        "Score < 70/100 - Keep nurturing. You'll receive updates on future opportunities.",
      actionText: "Stay Updated",
      actionHref: "#",
      actionIcon: <Clock className="w-4 h-4 mr-2 text-accent" />,
    };
  }

  return (
    <div
      className={`p-6 rounded-2xl border ${
        category === "high-value"
          ? "border-primary text-primary"
          : category === "consultation-ready"
            ? "border-ochre text-ochre"
            : "border-accent text-accent"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-foreground">{result?.title}</h3>
        <span className="text-sm font-medium">{result?.score}/100</span>
      </div>

      <p className="text-muted-foreground mb-4 line-clamp-2">{result?.description}</p>

      {result?.actionIcon && (
        <div className="text-right mb-4">{result.actionIcon}</div>
      )}

      <div>
        <button
          type="button"
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            category === "high-value"
              ? "bg-primary text-primary-foreground"
              : category === "consultation-ready"
                ? "bg-ochre text-foreground"
                : "bg-muted text-foreground"
          } hover:bg-opacity-90`}
        >
          {result?.actionText}
        </button>
      </div>
    </div>
  );
}
