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
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Stream Status</h2>
            <p className="text-xs text-muted-foreground">Live event controls</p>
          </div>

          {/* Status indicator, not an action — rendered as a pill so it is not
              mistaken for a button. */}
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground">
            <Radio className="h-3 w-3" />
            Live
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Live Viewers", value: "2,438", icon: Users },
            { label: "Form Submissions", value: "189", icon: CheckCircle2 },
            { label: "Fast-Track Leads", value: "43", icon: Activity },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-border bg-muted p-4"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-muted p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mic className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Teleprompter
              </p>
            </div>
            <span className="rounded-full bg-card px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              02:14 left
            </span>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm leading-7 text-foreground">
            {teleprompterLines.map((line, index) => (
              <p
                key={line}
                className={
                  index === 2
                    ? "rounded-lg bg-primary/10 px-3 py-2 text-primary"
                    : ""
                }
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </section>

      <aside className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Host Controls</h2>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-medium text-muted-foreground hover:border-border-strong hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
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
              className="flex w-full items-center justify-between rounded-xl border border-border bg-muted px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <span>{action}</span>
              <span className="text-muted-foreground">→</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
