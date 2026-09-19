"use client";

import React from "react";
import { motion } from "framer-motion";
import { FolderOpen, Server, Clock, TrendingUp } from "lucide-react";

interface MetricItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color: string;
  bgColor: string;
}

interface UserMetricsCardProps {
  metrics?: MetricItem[];
}

const defaultMetrics: MetricItem[] = [
  {
    label: "Active Projects",
    value: 12,
    icon: <FolderOpen className="w-5 h-5" />,
    trend: "+3 this month",
    trendUp: true,
    color: "text-foreground",
    bgColor: "bg-muted",
  },
  {
    label: "System Uptime",
    value: "99.9%",
    icon: <Server className="w-5 h-5" />,
    trend: "Last 30 days",
    trendUp: true,
    color: "text-foreground",
    bgColor: "bg-muted",
  },
  {
    label: "Avg Response Time",
    value: "245ms",
    icon: <Clock className="w-5 h-5" />,
    trend: "-12% vs last month",
    trendUp: true,
    color: "text-foreground",
    bgColor: "bg-muted",
  },
  {
    label: "Success Rate",
    value: "98.7%",
    icon: <TrendingUp className="w-5 h-5" />,
    trend: "+0.2% this week",
    trendUp: true,
    color: "text-foreground",
    bgColor: "bg-muted",
  },
];

export default function UserMetricsCard({ metrics = defaultMetrics }: UserMetricsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
      className="w-full rounded-3xl border border-border bg-card p-6 lg:p-8"
    >
      <h3 className="mb-5 text-base font-semibold tracking-tight text-foreground">Workspace Metrics</h3>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 + index * 0.05 }}
            className="rounded-2xl border border-border bg-background p-4 transition-colors hover:border-border-strong"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-xl ${metric.bgColor}`}>
                <span className={`${metric.color}`}>{metric.icon}</span>
              </div>
              {metric.trend && (
                <span className={`text-xs font-medium ${metric.trendUp ? "text-primary" : "text-accent"}`}>
                  {metric.trend}
                </span>
              )}
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{metric.value}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}