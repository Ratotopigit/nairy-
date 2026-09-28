"use client";

import Link from "next/link";
import {
  ArrowRight,
  Brain,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Layers3,
  Megaphone,
  MessageSquare,
  UploadCloud,
} from "lucide-react";
import { useHomeContent } from "@/lib/home-settings";
import CustomYouTubePlayer from "@/components/provider/CustomYouTubePlayer";

const HOW_IT_WORKS_STEPS = [
  {
    title: "Upload Context",
    description:
      "Add your brand assets, PDFs, logos and key information about your business.",
    icon: UploadCloud,
    href: "/provider/webinar-upload",
  },
  {
    title: "Brainstorm with AI",
    description:
      "Get strategic ideas, buyer personas, offer concepts and webinar plans powered by AI.",
    icon: Brain,
    href: "/provider/webinar-chat",
  },
  {
    title: "Create Content",
    description:
      "Build your offer, presentation deck, scripts and speaker notes with AI assistance.",
    icon: FileText,
    href: "/provider/webinar-content",
  },
  {
    title: "Present & Convert",
    description:
      "Deliver your webinar with confidence and reach your audience.",
    icon: Megaphone,
    href: "/provider/webinar-content",
  },
];

export default function ProviderHomePage() {
  const { settings: homeContent, videoId } = useHomeContent();

  return (
    <div className="w-full max-w-[1360px] mx-auto">
      {/* Main Studio Section: White Div on Left + Module Cards on Right */}
      <div className="flex flex-col xl:flex-row items-stretch gap-4">
        {/* Left: Video / Studio Div */}
        <div className="relative w-full xl:w-[630px] h-[220px] sm:h-[300px] md:h-[350px] xl:h-[390px] shrink-0 rounded-2xl sm:rounded-3xl border border-border bg-card shadow-sm transition-all overflow-hidden">
          {videoId ? (
            <CustomYouTubePlayer videoId={videoId} autoplay={true} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-medium text-muted-foreground">
              No video is Connected
            </div>
          )}
        </div>

        {/* Right: Module Cards Grid (Height matches 390px on XL) */}
        <div className="flex-1 w-full min-w-0 h-auto xl:h-[390px] grid grid-cols-1 sm:grid-cols-2 xl:grid-rows-2 gap-3.5">
          {/* Webinar Chat */}
          <div className="relative group/chat flex flex-col min-h-0 h-full">
            {/* Soft, faded emerald ambient lighting below */}
            <div className="pointer-events-none absolute -bottom-3 inset-x-6 h-8 rounded-full bg-emerald-400/25 blur-xl opacity-0 transition-opacity duration-500 ease-out group-hover/chat:opacity-100" />
            <Link
              href="/provider/webinar-chat"
              className="group relative z-10 flex-1 overflow-hidden rounded-2xl border border-[#d6e8dc] bg-[#f4fbf7] p-4 flex flex-col justify-between transition-all duration-500 ease-out hover:-translate-y-3 hover:-translate-x-1.5 hover:rotate-[-1.5deg] hover:border-[#b8dfc4] hover:shadow-[0_20px_35px_-8px_rgba(16,185,129,0.25)]"
            >
              {/* Soft mint abstract wave */}
              <div className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-emerald-200/40 blur-xl" />
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 right-0 h-20 w-24 text-emerald-200/35"
                viewBox="0 0 100 100"
                fill="currentColor"
              >
                <path d="M10,100 C40,90 60,60 100,35 L100,100 Z" />
              </svg>

              {/* Header with Icon & Dot Matrix */}
              <div className="relative z-10 flex items-start justify-between">
                <div className="grid size-9 place-items-center rounded-xl border border-[#c1dfcb] bg-[#d5eada] text-[#1f4d3d] transition-all duration-300 group-hover:scale-110 group-hover:rotate-[-6deg] group-hover:bg-[#c2e4cc] group-hover:border-[#9ed1ad] group-hover:shadow-sm">
                  <MessageSquare className="size-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
                </div>
                {/* 2x3 subtle dot pattern */}
                <div className="flex gap-1 opacity-30">
                  <div className="flex flex-col gap-1">
                    <span className="size-1 rounded-full bg-[#1f4d3d]" />
                    <span className="size-1 rounded-full bg-[#1f4d3d]" />
                    <span className="size-1 rounded-full bg-[#1f4d3d]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="size-1 rounded-full bg-[#1f4d3d]" />
                    <span className="size-1 rounded-full bg-[#1f4d3d]" />
                    <span className="size-1 rounded-full bg-[#1f4d3d]" />
                  </div>
                </div>
              </div>

              {/* Text content */}
              <div className="relative z-10 mt-2">
                <h2 className="text-[15px] font-bold tracking-tight text-[#1f4d3d]">
                  Webinar Chat
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#526a61]">
                  Brainstorm buyer personas, offers, and presentation strategy through an AI chat.
                </p>
              </div>

              {/* Action circle */}
              <div className="relative z-10 mt-auto pt-2 shrink-0">
                <div className="grid size-6 place-items-center rounded-full bg-[#e3f0e7] text-[#1f4d3d] transition-all duration-300 group-hover:bg-[#1f4d3d] group-hover:text-white group-hover:scale-115 group-hover:translate-x-1">
                  <ArrowRight className="size-3" />
                </div>
              </div>
            </Link>
          </div>

          {/* Webinar Offer */}
          <div className="relative group/offer flex flex-col min-h-0 h-full">
            {/* Soft, faded warm amber ambient lighting below */}
            <div className="pointer-events-none absolute -bottom-3 inset-x-6 h-8 rounded-full bg-amber-400/25 blur-xl opacity-0 transition-opacity duration-500 ease-out group-hover/offer:opacity-100" />
            <Link
              href="/provider/webinar-offer"
              className="group relative z-10 flex-1 overflow-hidden rounded-2xl border border-[#eee7da] bg-[#faf8f3] p-4 flex flex-col justify-between transition-all duration-500 ease-out hover:-translate-y-3 hover:translate-x-1.5 hover:rotate-[1.5deg] hover:border-[#dfd3c0] hover:shadow-[0_20px_35px_-8px_rgba(245,158,11,0.25)]"
            >
              {/* Soft warm tan wave */}
              <div className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-amber-200/40 blur-xl" />
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 right-0 h-20 w-24 text-amber-200/40"
                viewBox="0 0 100 100"
                fill="currentColor"
              >
                <path d="M0,100 C30,90 55,55 100,30 L100,100 Z" />
              </svg>

              <div className="relative z-10 flex items-start justify-between">
                <div className="grid size-9 place-items-center rounded-xl bg-[#faead4] text-[#9a6a18] transition-all duration-300 group-hover:scale-110 group-hover:rotate-[6deg] group-hover:bg-[#f5dfc3] group-hover:shadow-sm">
                  <Layers3 className="size-4 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" />
                </div>
              </div>

              <div className="relative z-10 mt-2">
                <h2 className="text-[15px] font-bold tracking-tight text-[#1f4d3d]">
                  Webinar Offer
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#526a61]">
                  Shape a direct-response offer powered by your buyer blueprint and uploads.
                </p>
              </div>

              <div className="relative z-10 mt-auto pt-2 shrink-0">
                <div className="grid size-6 place-items-center rounded-full bg-[#f3ede1] text-[#9a6a18] transition-all duration-300 group-hover:bg-[#9a6a18] group-hover:text-white group-hover:scale-115 group-hover:translate-x-1">
                  <ArrowRight className="size-3" />
                </div>
              </div>
            </Link>
          </div>

          {/* Webinar Content (Dark Green Featured Card) */}
          <div className="relative group/content flex flex-col min-h-0 h-full">
            {/* Soft, faded emerald ambient lighting below */}
            <div className="pointer-events-none absolute -bottom-3 inset-x-6 h-9 rounded-full bg-emerald-600/30 blur-xl opacity-0 transition-opacity duration-500 ease-out group-hover/content:opacity-100" />
            <Link
              href="/provider/webinar-content"
              className="group relative z-10 flex-1 overflow-hidden rounded-2xl border border-[#275343] bg-[#1f4d3d] p-4 flex flex-col justify-between text-white shadow-sm transition-all duration-500 ease-out hover:-translate-y-3 hover:-translate-x-1.5 hover:rotate-[-1.5deg] hover:border-[#38745d] hover:shadow-[0_22px_42px_-6px_rgba(31,77,61,0.5)]"
            >
              {/* Top row with icon & slide mockup */}
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="grid size-9 place-items-center rounded-xl border border-[#3b7561] bg-[#2b5f4d] text-white transition-all duration-300 group-hover:scale-110 group-hover:rotate-[-6deg] group-hover:bg-[#346f5b] group-hover:border-emerald-400/50 group-hover:shadow-md">
                  <FileText className="size-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 text-emerald-100" />
                </div>

                {/* 3D stacked presentation slide illustration */}
                <div className="relative shrink-0 pointer-events-none hidden sm:block w-20 sm:w-24 h-9 sm:h-10 mr-1 mt-0.5">
                  <div className="absolute inset-0 translate-x-1.5 -translate-y-1 rotate-[5deg] rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm" />
                  <div className="absolute inset-0 translate-x-0.5 -translate-y-0.5 rotate-[2.5deg] rounded-lg border border-white/15 bg-white/10 backdrop-blur-sm" />
                  <div className="absolute inset-0 rounded-lg border border-white/20 bg-white/15 px-2 py-1 backdrop-blur-md shadow-md flex items-center gap-1.5">
                    <div className="size-5 rounded bg-emerald-900/80 border border-white/20 flex items-center justify-center text-emerald-300 shrink-0 transition-transform duration-300 group-hover:scale-110">
                      <ImageIcon className="size-2.5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="h-1 w-3/4 rounded-full bg-white/70" />
                      <div className="h-1 w-full rounded-full bg-white/45" />
                      <div className="h-1 w-1/2 rounded-full bg-white/35" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Text content */}
              <div className="relative z-10 mt-2">
                <h2 className="text-[15px] font-bold tracking-tight text-white">
                  Webinar Content
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#c2ded3]">
                  Generate and edit webinar decks, sales slides, and pitch presentations.
                </p>
              </div>

              {/* Action circle */}
              <div className="relative z-10 mt-auto pt-2 shrink-0">
                <div className="grid size-6 place-items-center rounded-full bg-white/15 text-white transition-all duration-300 group-hover:bg-white group-hover:text-[#1f4d3d] group-hover:scale-115 group-hover:translate-x-1">
                  <ArrowRight className="size-3" />
                </div>
              </div>
            </Link>
          </div>

          {/* Webinar Upload */}
          <div className="relative group/upload flex flex-col min-h-0 h-full">
            {/* Soft, faded teal/mint ambient lighting below */}
            <div className="pointer-events-none absolute -bottom-3 inset-x-6 h-8 rounded-full bg-teal-400/25 blur-xl opacity-0 transition-opacity duration-500 ease-out group-hover/upload:opacity-100" />
            <Link
              href="/provider/webinar-upload"
              className="group relative z-10 flex-1 overflow-hidden rounded-2xl border border-[#d6e8dc] bg-[#f4fbf7] p-4 flex flex-col justify-between transition-all duration-500 ease-out hover:-translate-y-3 hover:translate-x-1.5 hover:rotate-[1.5deg] hover:border-[#b8dfc4] hover:shadow-[0_20px_35px_-8px_rgba(20,184,166,0.25)]"
            >
              <div className="pointer-events-none absolute -bottom-6 -right-6 h-28 w-28 rounded-full bg-emerald-200/40 blur-xl" />
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 right-0 h-20 w-24 text-emerald-200/35"
                viewBox="0 0 100 100"
                fill="currentColor"
              >
                <path d="M10,100 C40,90 60,60 100,35 L100,100 Z" />
              </svg>

              <div className="relative z-10 flex items-start justify-between">
                <div className="grid size-9 place-items-center rounded-xl border border-[#c1dfcb] bg-[#d5eada] text-[#1f4d3d] transition-all duration-300 group-hover:scale-110 group-hover:rotate-[6deg] group-hover:bg-[#c2e4cc] group-hover:border-[#9ed1ad] group-hover:shadow-sm">
                  <UploadCloud className="size-4 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1" />
                </div>
              </div>

              <div className="relative z-10 mt-2">
                <h2 className="text-[15px] font-bold tracking-tight text-[#1f4d3d]">
                  Webinar Upload
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#526a61]">
                  Upload logos, brand photos, briefs, and PDFs so every AI module has context.
                </p>
              </div>

              <div className="relative z-10 mt-auto pt-2 shrink-0">
                <div className="grid size-6 place-items-center rounded-full bg-[#e3f0e7] text-[#1f4d3d] transition-all duration-300 group-hover:bg-[#1f4d3d] group-hover:text-white group-hover:scale-115 group-hover:translate-x-1">
                  <ArrowRight className="size-3" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Middle Banners Row (Brought UP): Context Highlight Card + Brand Tagline Card */}
      <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-[1.1fr_1.9fr] gap-4 items-stretch">
        {/* Left Card: Context Highlight */}
        <Link
          href={homeContent.actionHref || "/provider/webinar-upload"}
          className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[#275343] bg-gradient-to-br from-[#1f4d3d] via-[#1a4436] to-[#153a2d] p-5 sm:p-7 text-white flex flex-col justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:border-[#38745d]"
        >
          {/* Subtle decorative leaf / ambient graphic */}
          <div className="pointer-events-none absolute -left-6 -bottom-6 w-36 h-36 rounded-full bg-emerald-500/15 blur-2xl" />
          <img
            src="/assets/leaf-watermark 2.png"
            alt=""
            className="pointer-events-none absolute -left-3 -bottom-4 w-24 sm:w-28 h-auto opacity-15 select-none object-contain"
          />

          <div className="relative z-10">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-semibold text-emerald-300/90">
              {homeContent.tagline}
            </span>
            <h2 className="mt-2 text-lg sm:text-xl xl:text-2xl font-bold tracking-tight text-white leading-tight">
              {homeContent.titleLine1}
              <br />
              {homeContent.titleLine2}
            </h2>
            <p className="mt-2 sm:mt-2.5 max-w-sm text-xs text-[#c2ded3] leading-relaxed">
              {homeContent.description}
            </p>
          </div>

          <div className="relative z-10 mt-4 sm:mt-5 flex justify-end">
            <div className="grid size-8 sm:size-9 place-items-center rounded-full bg-white/15 text-white transition-all duration-300 group-hover:bg-white group-hover:text-[#1f4d3d] group-hover:scale-110 shadow-sm">
              <ArrowRight className="size-3.5 sm:size-4" />
            </div>
          </div>
        </Link>

        {/* Right Card: Brand Tagline */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-sm flex items-center justify-center min-h-[140px] sm:min-h-[170px]">
          <div className="relative z-10 flex flex-col items-center text-center">
            <span className="block font-serif italic font-bold text-xl sm:text-2xl md:text-3xl text-[#1f4d3d] tracking-tight leading-tight">
              {homeContent.brandTagline1 || "Better Webinars."}
            </span>
            <span className="block font-serif italic font-bold text-xl sm:text-2xl md:text-3xl text-[#1f4d3d] tracking-tight leading-tight">
              {homeContent.brandTagline2 || "Bigger Impact."}
            </span>
            <svg
              aria-hidden="true"
              className="w-28 sm:w-36 md:w-44 h-3 text-emerald-600 mt-1.5"
              viewBox="0 0 100 12"
              fill="none"
            >
              <path
                d="M 2 7 Q 50 1, 98 7"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Leaf Watermark */}
          <img
            src="/assets/leaf-watermark.png"
            alt=""
            className="pointer-events-none absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-16 sm:w-24 md:w-28 h-auto opacity-25 sm:opacity-35 select-none object-contain"
          />
        </div>
      </div>

      {/* How It Works Section (Brought BELOW the two banners) */}
      <section className="mt-4 sm:mt-6 rounded-2xl sm:rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col xl:flex-row items-stretch gap-6 xl:gap-8">
          {/* Left Column: Heading & Subtitle */}
          <div className="xl:w-64 shrink-0 flex flex-col justify-center xl:border-r xl:border-border/80 xl:pr-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1f4d3d] leading-tight">
              From idea to impact in 4 simple steps.
            </h2>
            <p className="mt-2 sm:mt-2.5 text-xs text-[#526a61] leading-relaxed">
              Let AI handle the heavy lifting while you focus on your audience.
            </p>
          </div>

          {/* Right Flow: 4 Step Items */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 items-start">
            {HOW_IT_WORKS_STEPS.map((stepItem, idx) => {
              const StepIcon = stepItem.icon;
              const isLast = idx === HOW_IT_WORKS_STEPS.length - 1;

              return (
                <div key={stepItem.title} className="relative flex flex-col justify-between h-full">
                  <div>
                    {/* Top Row: Icon + Chevron Arrow */}
                    <div className="flex items-center justify-between">
                      <div className="grid size-9 place-items-center rounded-xl border border-[#c1dfcb] bg-[#d5eada] text-[#1f4d3d] shadow-xs">
                        <StepIcon className="size-4.5" />
                      </div>
                      {!isLast && (
                        <ChevronRight className="size-4 text-muted-foreground/40 hidden xl:block" />
                      )}
                    </div>

                    {/* Step Title & Description */}
                    <h3 className="mt-3 text-sm font-bold tracking-tight text-[#1f4d3d]">
                      {stepItem.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#526a61] leading-relaxed">
                      {stepItem.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
