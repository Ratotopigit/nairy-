"use client";

import {
  ArrowRight,
  FilePlus2,
  Layers3,
  MessageSquare,
  Mic,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const modules = [
  {
    href: "/provider/webinar-chat",
    label: "Webinar Chat",
    description: "Brainstorm buyer personas, offers, and presentation strategy through an AI chat.",
    icon: MessageSquare,
  },
  {
    href: "/provider/webinar-offer",
    label: "Webinar Offer",
    description: "Shape a direct-response offer powered by your buyer blueprint and uploads.",
    icon: Layers3,
  },
  {
    href: "/provider/webinar-content",
    label: "Webinar Content",
    description: "Generate and edit webinar decks, sales slides, and pitch presentations.",
    icon: FilePlus2,
  },
  {
    href: "/provider/webinar-upload",
    label: "Webinar Upload",
    description: "Upload logos, brand photos, briefs, and PDFs so every AI module has context.",
    icon: UploadCloud,
  },
  {
    href: "/provider/webinar-speaker",
    label: "Webinar Speaker",
    description: "Run live broadcasts with real-time teleprompter and audience engagement controls.",
    icon: Mic,
  },
];

export default function ProviderHomePage() {
  const pathname = usePathname();

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <header className="border-b border-border pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Creation Studio
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          Welcome to WebinarKit.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          Your buyer intelligence, offer strategy, and presentation creation workspace.
          Start with Webinar Chat to brainstorm, then flow into Webinar Offer and Webinar Content.
          Upload logos, brand colors, and brief PDFs in Webinar Upload so every module knows your business.
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group rounded-3xl border p-6 transition ${
                active
                  ? "border-foreground bg-card"
                  : "border-border bg-card hover:border-foreground/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className="grid size-11 place-items-center rounded-2xl border border-border bg-muted text-foreground"
                >
                  <Icon className="size-5" />
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
              </div>
              <h2 className="mt-5 text-lg font-semibold tracking-[-0.02em]">
                {item.label}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </Link>
          );
        })}
      </div>

      <section className="mt-10 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          How it works
        </p>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          <li className="rounded-2xl border border-border bg-background p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
              01 — Upload context
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Add logos, brand colors, and a brief PDF in Webinar Upload so Webinar Chat and
              Webinar Offer know your business.
            </p>
          </li>
          <li className="rounded-2xl border border-border bg-background p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
              02 — Brainstorm with Webinar Chat
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Chat through your buyer, offer, and presentation ideas. Fill the
              Idea Blueprint as you go.
            </p>
          </li>
          <li className="rounded-2xl border border-border bg-background p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
              03 — Ship with Webinar Offer + Webinar Content
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Build an offer strategy, then generate a full presentation deck with
              the right sections, style, and brand assets.
            </p>
          </li>
        </ol>
      </section>
    </div>
  );
}
