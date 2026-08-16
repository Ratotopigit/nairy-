"use client";

import { ArrowRight, CheckCircle2, FileText, Layers3, Mic2, Presentation, Target, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type RecentSession = {
  session_id: string;
  status: string;
  blueprint: { persona_name?: string; offer?: { title?: string } } | null;
  answers: { business?: { description?: string; category?: string } } | null;
};

const stages = [
  {
    number: "01",
    eyebrow: "Audience intelligence",
    title: "Avatar IQ",
    description: "Define the buyer, their urgent problem, decision triggers, objections, and message angles.",
    href: "/provider/astro-ai",
    action: "Build buyer blueprint",
    icon: Target,
  },
  {
    number: "02",
    eyebrow: "Offer architecture",
    title: "Offer IQ",
    description: "Turn the buyer blueprint into a positioned offer with scope, pricing, delivery, KPIs, and risk reversal.",
    href: "/provider/offer-iq",
    action: "Shape the offer",
    icon: Layers3,
  },
  {
    number: "03",
    eyebrow: "Conversion assets",
    title: "Content Maker",
    description: "Create the webinar or sales presentation from saved buyer and offer context without repeating answers.",
    href: "/provider/slides",
    action: "Create presentation",
    icon: Presentation,
  },
];

export default function ProviderStudioPage() {
  const [sessions, setSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const { data } = await supabase
        .from("blueprint_sessions")
        .select("session_id,status,blueprint,answers")
        .eq("owner_id", authData.user.id)
        .order("updated_at", { ascending: false })
        .limit(5);
      setSessions((data ?? []) as RecentSession[]);
    })();
  }, []);

  const latest = sessions[0];
  const hasBlueprint = Boolean(latest?.blueprint?.persona_name);
  const hasOffer = Boolean(latest?.blueprint?.offer?.title);

  return (
    <div className="provider-home mx-auto w-full max-w-[1180px] pb-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--home-border)] bg-[var(--home-surface)] px-6 py-10 sm:px-10 sm:py-14">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-[#d9a06f]/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 size-80 rounded-full bg-[#6d9b82]/15 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--home-muted)]">Webinar creation system</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--home-ink)] sm:text-6xl">Build from buyer insight to a conversion-ready webinar.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--home-muted)] sm:text-base">Complete each stage once. AstroCraft carries your audience, offer, and messaging context forward automatically.</p>
          <Link href={hasOffer ? "/provider/slides" : hasBlueprint ? "/provider/offer-iq" : "/provider/astro-ai"} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--home-ink)] px-5 py-3 text-sm font-semibold text-[var(--home-bg)]">
            {hasOffer ? "Continue creating" : hasBlueprint ? "Continue to Offer IQ" : "Start with Avatar IQ"}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="mt-9">
        <div className="flex items-end justify-between gap-4">
          <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--home-muted)]">Core workflow</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[var(--home-ink)]">One connected creation path</h2></div>
          <p className="hidden text-xs text-[var(--home-muted)] sm:block">Saved automatically to your workspace</p>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {stages.map((stage, index) => {
            const complete = index === 0 ? hasBlueprint : index === 1 ? hasOffer : false;
            const Icon = stage.icon;
            return (
              <Link key={stage.title} href={stage.href} className="group flex min-h-64 flex-col rounded-3xl border border-[var(--home-border)] bg-[var(--home-surface)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--home-border-strong)]">
                <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-[var(--home-muted)]">{stage.number}</span>{complete ? <CheckCircle2 className="size-5 text-[#39755c]" /> : <Icon className="size-5 text-[var(--home-muted)]" />}</div>
                <p className="mt-7 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--home-muted)]">{stage.eyebrow}</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-[var(--home-ink)]">{stage.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--home-muted)]">{stage.description}</p>
                <span className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-[var(--home-ink)]">{stage.action}<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-3xl border border-[var(--home-border)] bg-[var(--home-surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold tracking-[-0.025em] text-[var(--home-ink)]">Recent work</h2><FileText className="size-4 text-[var(--home-muted)]" /></div>
          <div className="mt-4 divide-y divide-[var(--home-border)]">
            {sessions.length ? sessions.map((session) => {
              const title = session.blueprint?.persona_name || session.answers?.business?.description || session.answers?.business?.category || "Buyer blueprint";
              return (
                <Link key={session.session_id} href={`/provider/astro-ai/${session.session_id}`} className="flex items-center gap-4 py-3.5 first:pt-1">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--home-bg)] text-[var(--home-muted)]"><Target className="size-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-[var(--home-ink)]">{title}</span><span className="mt-0.5 block text-[10px] capitalize text-[var(--home-muted)]">{session.status}{session.blueprint?.offer ? " · offer ready" : ""}</span></span>
                  <ArrowRight className="size-4 text-[var(--home-muted)]" />
                </Link>
              );
            }) : <p className="py-8 text-sm text-[var(--home-muted)]">No projects yet. Start with Avatar IQ to create your first buyer blueprint.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--home-border)] bg-[var(--home-ink)] p-6 text-[var(--home-bg)]">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-60">Production tools</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">Prepare the live experience.</h2>
          <div className="mt-6 space-y-2">
            <Link href="/provider/uploads" className="flex items-center gap-3 rounded-xl border border-white/15 px-4 py-3 text-sm hover:bg-white/10"><Upload className="size-4" /> Brand assets <ArrowRight className="ml-auto size-4 opacity-60" /></Link>
            <Link href="/provider/speaker-portal" className="flex items-center gap-3 rounded-xl border border-white/15 px-4 py-3 text-sm hover:bg-white/10"><Mic2 className="size-4" /> Speaker portal <ArrowRight className="ml-auto size-4 opacity-60" /></Link>
          </div>
        </section>
      </div>
    </div>
  );
}
