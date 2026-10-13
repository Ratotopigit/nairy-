"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { LiveThumb } from "@/components/webinar/LiveThumb";
import { previewWebinar } from "@/lib/webinar-preview";
import {
  getTemplate,
  LAYOUT_LABELS,
  searchTemplates,
  TEMPLATE_CATEGORIES,
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
};

export function TemplatePicker({ open, webinar, onClose, onPick }: Props) {
  const current = getTemplate(webinar.template_id);
  const [category, setCategory] = useState<TemplateCategory | "All">(current.category);
  const [text, setText] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCategory(getTemplate(webinar.template_id).category);
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
    () => (text.trim() ? searchTemplates(text, category) : category === "All" ? searchTemplates("", "All") : templatesInCategory(category)),
    [text, category],
  );

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
            {(["All", ...TEMPLATE_CATEGORIES] as const).map((cat) => (
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
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {results.length === 0 ? (
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
                    </div>
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{t.name}</p>
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{LAYOUT_LABELS[t.layout].name}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{t.description}</p>
                      {category === "All" || text.trim() ? <p className="mt-1 text-[11px] text-muted-foreground">{t.category}</p> : null}
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
