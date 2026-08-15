"use client";

import { useState } from "react";
import { Bold, Download, Italic, Sparkles } from "lucide-react";

const tabs = ["Webinar Script", "Sales Page", "Email Seq."];

const slideCards = [
  {
    id: "01",
    title: "Title",
    content: "Build a premium offer your market already wants.",
  },
  {
    id: "02",
    title: "Agenda",
    content: "Find the gap, improve positioning, convert trust into action.",
  },
  {
    id: "03",
    title: "Pain Point",
    content:
      "Your audience is over-sold, under-supported, and looking for clarity.",
  },
  {
    id: "04",
    title: "Objection",
    content: "The problem isn't demand — it is right-fit messaging and trust.",
  },
];

export default function SlideStudio() {
  const [activeTab, setActiveTab] = useState("Webinar Script");

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  activeTab === tab
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Autosaved
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <button type="button" className="rounded-md p-2 hover:bg-white">
              <Bold className="h-4 w-4 text-slate-700" />
            </button>
            <button type="button" className="rounded-md p-2 hover:bg-white">
              <Italic className="h-4 w-4 text-slate-700" />
            </button>
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Suggestion
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="space-y-5 text-slate-700">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Opening hook
                </p>
                <p className="text-2xl font-bold leading-tight text-slate-900">
                  You do not need more content. You need a clearer conversion
                  story.
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Agenda
                </p>
                <ul className="list-disc space-y-2 pl-5 text-base">
                  <li>Establish the real bottleneck for your offer.</li>
                  <li>Reconnect the audience to the transformation.</li>
                  <li>
                    Give them a premium next step with trust-forward language.
                  </li>
                </ul>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Close
                </p>
                <p className="text-base leading-7">
                  If you are ready to shift from general instruction to a
                  high-conviction offer, this session helps you package the
                  promise in a way that feels premium, clear, and easy to act
                  on.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Presentation Deck
            </p>
            <p className="text-xs text-slate-500">Live canvas preview</p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500"
          >
            <Download className="h-3.5 w-3.5" />
            Export to PowerPoint
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {slideCards.map((slide) => (
            <div
              key={slide.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {slide.id}
                </span>
                <span className="rounded-md bg-white px-2 py-1 text-[10px] font-medium text-slate-500">
                  Editable
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-base font-bold text-slate-900">
                  {slide.title}
                </p>
                <p className="text-xs leading-5 text-slate-600">
                  {slide.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
