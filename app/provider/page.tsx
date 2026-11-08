"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { listWebinars, sessionPhase, type Webinar } from "@/lib/webinars";
import { PROVIDER_STEPS } from "@/lib/provider-steps";
import { useHomeContent } from "@/lib/home-settings";
import CustomYouTubePlayer from "@/components/provider/CustomYouTubePlayer";

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; latest: Webinar | null };

const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const primaryBtn = `inline-flex items-center justify-center gap-2 min-h-12 rounded-xl bg-[#2563eb] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1d4ed8] ${focus}`;

export default function ProviderHomePage() {
  const { videoId } = useHomeContent();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      setFirstName(user.displayName?.trim().split(/\s+/)[0] ?? "");
      try {
        const rows = await listWebinars(user.uid);
        setLoad({ state: "ready", latest: rows[0] ?? null });
      } catch {
        setLoad({ state: "error" });
      }
    });
    return unsubscribe;
  }, []);

  const latest = load.state === "ready" ? load.latest : null;
  const label = latest ? latest.name || latest.title || "Untitled webinar" : "";
  const editHref = latest ? `/provider/webinars/edit?id=${latest.id}` : "";

  let heading = "Create your first webinar";
  let body = "Start here. Give it a name, choose free or paid, then make the page people sign up on.";
  let href = "/provider/webinars?new=1";
  let cta = "Create webinar";
  if (latest?.status === "draft") {
    heading = `Finish ${label}`;
    body = "Your webinar is still a draft. Pick up where you left off.";
    href = editHref;
    cta = "Continue editing";
  } else if (latest) {
    heading = label;
    const phase = sessionPhase(latest);
    body = phase === "ended" || phase === "closed" ? "This session has ended. Set a new date to run it again." : "Your webinar is published. People can sign up with your link.";
    href = editHref;
    cta = "Open webinar";
  }

  return (
    <div className="easy-read mx-auto w-full max-w-4xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {firstName ? `Welcome, ${firstName}` : "Welcome"}
        </h1>
        <p className="mt-1.5 text-base text-muted-foreground sm:text-lg">
          Follow the steps below, starting with your webinar.
        </p>
      </header>

      {videoId && (
        <section aria-labelledby="video-heading">
          <h2 id="video-heading" className="text-lg font-bold tracking-tight text-foreground">
            Welcome video
          </h2>
          <div className="mt-3 aspect-video w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <CustomYouTubePlayer videoId={videoId} autoplay={false} />
          </div>
        </section>
      )}

      <section aria-labelledby="next-step" className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <p id="next-step" className="text-sm font-semibold uppercase tracking-wider text-[#2563eb]">
          Your next step
        </p>
        {load.state === "loading" ? (
          <div className="mt-3 min-h-[116px] space-y-3" aria-busy="true">
            <div className="h-7 w-2/3 rounded-lg bg-secondary" />
            <div className="h-4 w-1/2 rounded-lg bg-secondary" />
            <div className="h-12 w-44 rounded-xl bg-secondary" />
          </div>
        ) : (
          <div className="mt-3 min-h-[116px]">
            <h2 className="break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl">{heading}</h2>
            <p className="mt-1.5 text-base text-muted-foreground">{body}</p>
            {load.state === "error" && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                We couldn't load your webinars just now. Check your internet connection, then refresh the page.
              </p>
            )}
            <Link href={href} className={`${primaryBtn} mt-4`}>
              {cta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      <section aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="text-lg font-bold tracking-tight text-foreground">
          Your five steps
        </h2>
        <ol className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {PROVIDER_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.number}>
                <Link
                  href={step.href}
                  className={`group flex items-center gap-4 p-4 transition-colors hover:bg-secondary/60 sm:p-5 ${focus} focus-visible:ring-inset focus-visible:ring-offset-0`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2563eb] text-sm font-bold text-white">
                    {step.number}
                  </span>
                  <Icon className="hidden size-5 shrink-0 text-[#2563eb] sm:block" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-foreground">{step.label}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{step.description}</span>
                  </span>
                  <ArrowRight
                    className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-[#2563eb]"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
