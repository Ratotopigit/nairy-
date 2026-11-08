"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Heart, LayoutTemplate, PencilLine, Search, X } from "lucide-react";
import { LiveThumb } from "@/components/webinar/LiveThumb";
import { previewWebinar } from "@/lib/webinar-preview";
import {
  getTemplate,
  LAYOUT_LABELS,
  searchTemplates,
  TEMPLATE_CATEGORIES,
  THANK_YOU_TEMPLATES,
  templatesInCategory,
  type TemplateCategory,
  type WebinarTemplate,
} from "@/lib/webinar-templates";
import type { Webinar } from "@/lib/webinars";
import type { PageId } from "@/lib/page-blocks";

type Props = {
  open: boolean;
  /** The webinar being edited: every thumbnail shows ITS content, images and colours. */
  webinar: Webinar;
  /** Which page's design is being chosen. */
  page: PageId;
  onClose: () => void;
  /** Registration page: use this template. */
  onPick: (templateId: string) => void;
  /** Thank-you page: "" is the simple confirmation. */
  onPickThanks: (id: Webinar["thank_you_template"]) => void;
  /** Replay page or watch room: the standard page. */
  onStandard: () => void;
  /** Open the page builder for this page (new or the existing custom page). */
  onBuild: () => void;
};

const TITLES: Record<PageId, string> = { registration: "registration page", thanks: "thank-you page", replay: "replay page", watch: "watch room" };

const CARD =
  "group relative overflow-hidden rounded-2xl border bg-card text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foreground";

function InUse() {
  return (
    <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[#2563eb] px-3 py-1 text-xs font-semibold text-white">
      <Check className="size-4" aria-hidden="true" /> In use
    </span>
  );
}

const MOST_LIKED = "Most liked";
type Tab = TemplateCategory | "All" | typeof MOST_LIKED;

export function TemplatePicker({ open, webinar, page, onClose, onPick, onPickThanks, onStandard, onBuild }: Props) {
  const current = getTemplate(webinar.template_id);
  const custom = (webinar.pages[page] ?? []).length > 0;
  // Thumbnails show each design, not the custom blocks that would otherwise cover it.
  const plain: Webinar = { ...webinar, pages: { ...webinar.pages, [page]: [] } };
  const [category, setCategory] = useState<Tab>(MOST_LIKED);
  const [text, setText] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setCategory(MOST_LIKED);
    setText("");
    // Keyboard users start inside the dialog and return to the button that opened it.
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const results: WebinarTemplate[] = useMemo(
    () =>
      category === MOST_LIKED
        ? searchTemplates(text, "All").filter((t) => t.featured)
        : text.trim()
          ? searchTemplates(text, category)
          : category === "All"
            ? searchTemplates("", "All")
            : templatesInCategory(category),
    [text, category],
  );


  if (!open) return null;

  const regPage = page === "registration";
  const thanksOptions = [
    {
      id: "" as const,
      name: "Simple confirmation",
      description:
        webinar.delivery_type === "automated" ? "A short “You're registered” card with your video." : "A short “You're registered” card with calendar buttons.",
    },
    ...THANK_YOU_TEMPLATES,
  ];

  // First tile: the page builder. On a custom page it reopens what they built.
  const buildTile = (
    <div className={`${CARD} border-dashed ${custom ? "border-[#2563eb] ring-2 ring-[#2563eb]" : "border-border"}`}>
      <button
        type="button"
        onClick={onBuild}
        aria-label={custom ? "Edit my custom page" : "Build it yourself in the page builder"}
        className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus:outline-none"
      />
      <div className="grid aspect-[1280/819] place-items-center border-b border-border bg-[#2563eb]/5 text-[#2563eb]">
        {custom ? <PencilLine className="size-8" /> : <LayoutTemplate className="size-8" />}
      </div>
      {custom ? <InUse /> : null}
      <div className="px-4 py-3">
        <p className="text-base font-semibold">{custom ? "Edit my custom page" : "Build it yourself"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {custom
            ? "Keep your own page and change its blocks."
            : `Start from a simple layout and drag in blocks: text, images, video${regPage ? ", a sign-up form" : ""} and more.`}
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-picker-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full flex-col overflow-hidden rounded-t-3xl outline-none border border-border bg-background shadow-2xl sm:rounded-3xl ${
          regPage ? "h-[94vh] max-w-6xl sm:h-[90vh]" : "max-h-[94vh] max-w-4xl sm:max-h-[90vh]"
        }`}
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="design-picker-title" className="text-lg font-semibold tracking-[-0.02em]">
              Choose a design for your {TITLES[page]}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {custom
                ? "Click a design to use it. It replaces your custom page; your headline, date, photos and meeting link stay."
                : "Click a design to use it. Each one shows your own words and photos. You can switch any time without losing anything."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" title="Close" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-border-strong px-3 text-sm font-medium hover:bg-secondary">
            <X className="size-5" aria-hidden="true" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        {regPage ? (
          <div className="space-y-3 border-b border-border px-5 py-3 sm:px-6">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Search designs"
                placeholder="Search, e.g. coaching, clinic, dark…"
                className="min-h-11 w-full rounded-xl border border-border-strong bg-card py-2.5 pl-10 pr-3.5 text-sm outline-none placeholder:text-[#6b7280] focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Category">
              {([MOST_LIKED, "All", ...TEMPLATE_CATEGORIES] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={category === cat}
                  onClick={() => setCategory(cat)}
                  className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${
                    category === cat ? "border-[#2563eb] bg-[#2563eb] font-semibold text-white" : "border-border-strong bg-card text-foreground hover:bg-secondary"
                  }`}
                >
                  {cat === MOST_LIKED ? <Heart className="mr-1 inline size-4 -translate-y-px" aria-hidden="true" /> : null}
                  {cat}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {buildTile}

            {regPage
              ? results.map((t) => {
                  const selected = !custom && t.id === current.id;
                  return (
                    <div key={t.id} className={`${CARD} ${selected ? "border-[#2563eb] ring-2 ring-[#2563eb]" : "border-border"}`}>
                      {/* The card holds a live page (with its own buttons), so the click target is an overlay, not a wrapper. */}
                      <button
                        type="button"
                        onClick={() => onPick(t.id)}
                        aria-pressed={selected}
                        aria-label={`Use the ${t.name} design (${LAYOUT_LABELS[t.layout].name})`}
                        className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus:outline-none"
                      />
                      <div className="relative border-b border-border">
                        <LiveThumb webinar={previewWebinar(plain, t.category, t.id)} />
                        {selected ? <InUse /> : null}
                        {t.featured ? (
                          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                            <Heart className="size-4 fill-current" aria-hidden="true" /> {MOST_LIKED}
                          </span>
                        ) : null}
                      </div>
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-base font-semibold">{t.name}</p>
                          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-foreground">{LAYOUT_LABELS[t.layout].name}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                        {category === "All" || category === MOST_LIKED || text.trim() ? <p className="mt-1 text-[11px] text-muted-foreground">{t.category}</p> : null}
                      </div>
                    </div>
                  );
                })
              : null}

            {page === "thanks"
              ? thanksOptions.map((tt) => {
                  const selected = !custom && webinar.thank_you_template === tt.id;
                  return (
                    <div key={`thanks-${tt.id}`} className={`${CARD} ${selected ? "border-[#2563eb] ring-2 ring-[#2563eb]" : "border-border"}`}>
                      <button
                        type="button"
                        onClick={() => onPickThanks(tt.id)}
                        aria-pressed={selected}
                        aria-label={`Use the ${tt.name} design`}
                        className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus:outline-none"
                      />
                      <div className="relative border-b border-border">
                        <LiveThumb webinar={{ ...previewWebinar(plain, current.category, current.id), thank_you_template: tt.id }} thanks />
                        {selected ? <InUse /> : null}
                      </div>
                      <div className="px-4 py-3">
                        <p className="truncate text-base font-semibold">{tt.name}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tt.description}</p>
                      </div>
                    </div>
                  );
                })
              : null}

            {page === "replay" || page === "watch" ? (
              <div className={`${CARD} ${custom ? "border-border" : "border-[#2563eb] ring-2 ring-[#2563eb]"}`}>
                <button
                  type="button"
                  onClick={onStandard}
                  aria-pressed={!custom}
                  aria-label={`Use the standard ${TITLES[page]}`}
                  className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus:outline-none"
                />
                <div className="grid aspect-[1280/819] place-items-center border-b border-border bg-secondary/60 text-sm font-medium text-muted-foreground">
                  Standard page
                </div>
                {custom ? null : <InUse />}
                <div className="px-4 py-3">
                  <p className="text-base font-semibold">Standard</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {page === "watch"
                      ? "Your headline, the countdown or video, and your offer button, in your colours."
                      : "Your recording with your title, presenter and offer, in your colours."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
          {regPage && results.length === 0 ? <p className="py-12 text-center text-base text-muted-foreground">No designs match that word. Try a different word, or pick a category above.</p> : null}
        </div>
      </div>
    </div>
  );
}
