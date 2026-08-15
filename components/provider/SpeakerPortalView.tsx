"use client";

import { Activity, CheckCircle2, Mic, Play, Radio, Users } from "lucide-react";

const teleprompterLines = [
  "Welcome everyone and thank you for joining us today.",
  "We are unpacking the practical system behind premium positioning and conversion.",
  "If you want the full framework, the next step is to review the offer structure and apply for fast-track support.",
  "As we transition, I want to highlight the strongest opportunities in front of us today.",
];

export default function SpeakerPortalView() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Stream Status
            </p>
            <p className="text-xs text-slate-500">Live event controls</p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
          >
            <Radio className="h-3.5 w-3.5" />
            Live Stream active
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Live Viewers", value: "2,438", icon: Users },
            { label: "Form Submissions", value: "189", icon: CheckCircle2 },
            { label: "Fast-Track Leads", value: "43", icon: Activity },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Mic className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                Teleprompter
              </p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              02:14 left
            </span>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
            {teleprompterLines.map((line, index) => (
              <p
                key={line}
                className={
                  index === 2
                    ? "rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700"
                    : ""
                }
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Host Controls</p>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            <Play className="h-3.5 w-3.5" />
            Start Cue
          </button>
        </div>

        <div className="space-y-3">
          {[
            "Open CTA overlay",
            "Share offer recap",
            "Trigger attendee form",
            "Launch fast-track prompt",
          ].map((action) => (
            <button
              key={action}
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <span>{action}</span>
              <span className="text-slate-400">→</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
