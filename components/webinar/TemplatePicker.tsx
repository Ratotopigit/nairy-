"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Heart, Search, X } from "lucide-react";
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

type Props = {
  open: boolean;
  /** The webinar being edited: every thumbnail shows ITS content, images and colours. */
  webinar: Webinar;
  onClose: () => void;
  onPick: (templateId: string) => void;
  /** A full thank-you page, used after sign-up with any registration template. */
  onPickThanks: (id: "training") => void;
};

const MOST_LIKED = "Most liked";
type Tab = TemplateCategory | "All" | typeof MOST_LIKED;

export function TemplatePicker({ open, webinar, onClose, onPick, onPickThanks }: Props) {
  const current = getTemplate(webinar.template_id);
  const [category, setCategory] = useState<Tab>(MOST_LIKED);
  const [text, setText] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCategory(MOST_LIKED);
    setText("");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
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

  const thanks = useMemo(() => {
    if (category !== MOST_LIKED) return [];
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    return THANK_YOU_TEMPLATES.filter((tt) => words.every((w) => `${tt.name} ${tt.description} thank you page training`.toLowerCase().includes(w)));
  }, [text, category]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose a template"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:h-[90vh] sm:rounded-3xl"
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">Choose a template</h2>
            <p className="text-xs text-muted-foreground">
              Each one shows your own content. Switch any time; nothing you wrote, uploaded or customised is lost.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-xl border border-border hover:bg-secondary">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 border-b border-border px-5 py-3 sm:px-6">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search by industry, style or colour: coaching, clinic, minimal, dark…"
              className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
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
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                  category === cat ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat === MOST_LIKED ? <Heart className="mr-1 inline size-3 -translate-y-px" /> : null}
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {results.length + thanks.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">No templates match that. Try another word.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((t) => {
                const selected = t.id === current.id;
                return (
                  <div
                    key={t.id}
                    className={`group relative overflow-hidden rounded-2xl border bg-card text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foreground ${
                      selected ? "border-foreground ring-2 ring-foreground" : "border-border"
                    }`}
                  >
                    {/* The card holds a live page (with its own buttons), so the click target is an overlay, not a wrapper. */}
                    <button
                      type="button"
                      onClick={() => onPick(t.id)}
                      aria-pressed={selected}
                      aria-label={`Use the ${t.name} template (${LAYOUT_LABELS[t.layout].name})`}
                      className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus:outline-none"
                    />
                    <div className="relative border-b border-border">
                      <LiveThumb webinar={previewWebinar(webinar, t.category, t.id)} />
                      {selected ? (
                        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">
                          <Check className="size-3" /> In use
                        </span>
                      ) : null}
                      {t.featured ? (
                        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
                          <Heart className="size-3 fill-current" /> {MOST_LIKED}
                        </span>
                      ) : null}
                    </div>
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{t.name}</p>
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{LAYOUT_LABELS[t.layout].name}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{t.description}</p>
                      {category === "All" || category === MOST_LIKED || text.trim() ?<p className="mt-1 text-[11px] text-muted-foreground">{t.category}</p> : null}
                    </div>
                  </div>
                );
              })}
              {thanks.map((tt) => {
                const selected = webinar.thank_you_template === tt.id;
                return (
                  <div
                    key={`thanks-${tt.id}`}
                    className={`group relative overflow-hidden rounded-2xl border bg-card text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foreground ${
                      selected ? "border-foreground ring-2 ring-foreground" : "border-border"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onPickThanks(tt.id)}
                      aria-pressed={selected}
                      aria-label={`Use the ${tt.name} after sign-up`}
                      className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus:outline-none"
                    />
                    <div className="relative border-b border-border">
                      <LiveThumb webinar={{ ...previewWebinar(webinar, "Marketing", "training-midnight"), thank_you_template: tt.id }} thanks />
                      {selected ? (
                        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">
                          <Check className="size-3" /> In use
                        </span>
                      ) : null}
                      <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
                        <Heart className="size-3 fill-current" /> {MOST_LIKED}
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{tt.name}</p>
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">Thank-you page</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{tt.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
