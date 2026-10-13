"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import {
  searchTemplates,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
  type WebinarTemplate,
} from "@/lib/webinar-templates";
import { TEMPLATE_FONTS } from "@/lib/webinar-fonts";
import { TemplateArt } from "@/components/webinar/TemplateArt";

const THUMB_SHAPES: Record<WebinarTemplate["imageShape"], string> = {
  circle: "rounded-full aspect-square",
  rounded: "rounded-lg aspect-square",
  square: "aspect-[4/5]",
  blob: "aspect-square [border-radius:42%_58%_63%_37%/41%_44%_56%_59%]",
};

/** A miniature of the page: real colours, type, artwork and layout. */
export function TemplateThumbnail({ template: t }: { template: WebinarTemplate }) {
  const c = t.colors;
  const art = (cls: string) => (
    <div className={`overflow-hidden ${THUMB_SHAPES[t.imageShape]} ${cls}`}>
      <TemplateArt art={t.art} colors={c} className="size-full" still />
    </div>
  );
  const title = (
    <div
      style={{ fontFamily: TEMPLATE_FONTS[t.headingFont], color: c.ink }}
      className={`text-[11px] font-bold leading-[1.05] ${t.uppercaseHeadline ? "uppercase" : ""}`}
    >
      Grow your audience live
    </div>
  );
  const lines = (n: number) => (
    <div className="space-y-1">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="h-[3px] rounded-full" style={{ background: c.muted, opacity: 0.45, width: `${90 - i * 14}%` }} />
      ))}
    </div>
  );
  const card = (
    <div className="space-y-1 rounded-md p-1.5" style={{ background: c.surface, border: `1px solid ${c.line}` }}>
      <div className="h-2 rounded-sm" style={{ background: c.page, border: `1px solid ${c.line}` }} />
      <div className="h-2 rounded-sm" style={{ background: c.page, border: `1px solid ${c.line}` }} />
      <div className="h-2.5 rounded-sm" style={{ background: c.accent }} />
    </div>
  );

  let inner: React.ReactNode;
  switch (t.layout) {
    case "split":
      inner = (
        <div className="grid h-full grid-cols-[1.2fr_0.8fr] gap-2 p-2.5">
          <div className="space-y-1.5 pt-1">{title}{lines(3)}</div>
          <div className="space-y-1.5">{art("mx-auto w-20")}{card}</div>
        </div>
      );
      break;
    case "stage":
      inner = (
        <div className="flex h-full flex-col items-center gap-1.5 p-2.5 text-center">
          {art("w-28 !aspect-[16/9]")}
          {title}
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="size-3.5 rounded-sm" style={{ background: c.surface, border: `1px solid ${c.line}` }} />
            ))}
          </div>
          <div className="mt-auto w-2/3">{card}</div>
        </div>
      );
      break;
    case "editorial":
      inner = (
        <div className="flex h-full flex-col p-2.5">
          <div className="border-b pb-1.5" style={{ borderColor: c.ink }}>{title}</div>
          <div className="mt-1.5 grid flex-1 grid-cols-[1.1fr_0.9fr] gap-2">
            <div className="space-y-1">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-1">
                  <span className="text-[7px] font-bold" style={{ color: c.accent }}>0{n}</span>
                  <div className="h-[3px] flex-1 rounded-full" style={{ background: c.muted, opacity: 0.45 }} />
                </div>
              ))}
            </div>
            <div className="space-y-1">{art("w-16")}{card}</div>
          </div>
        </div>
      );
      break;
    case "spotlight":
      inner = (
        <div className="flex h-full items-end justify-center p-2.5 pt-5">
          <div className="relative w-3/4 rounded-lg px-2 pb-2 pt-9 text-center" style={{ background: c.surface, border: `1px solid ${c.line}` }}>
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">{art("w-14")}</div>
            {title}
            <div className="mt-1.5">{card}</div>
          </div>
        </div>
      );
      break;
    case "band":
      inner = (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2 px-2.5 pb-5 pt-2.5" style={{ background: c.hero }}>
            <div
              style={{ fontFamily: TEMPLATE_FONTS[t.headingFont], color: c.heroInk }}
              className={`text-[11px] font-bold leading-[1.05] ${t.uppercaseHeadline ? "uppercase" : ""}`}
            >
              Grow your audience live
            </div>
            {art("w-16 shrink-0")}
          </div>
          <div className="-mt-3 grid grid-cols-2 gap-2 px-2.5">
            <div className="pt-4">{lines(3)}</div>
            {card}
          </div>
        </div>
      );
      break;
    default:
      inner = (
        <div className="flex h-full flex-col">
          <div className="h-2" style={{ background: c.hero }} />
          <div className="px-2.5 pt-2 text-center">{title}</div>
          <div className="grid flex-1 grid-cols-2 gap-2 p-2.5 pt-1.5">
            <div className="flex flex-col items-center gap-1">{art("w-[4.5rem]")}</div>
            <div className="space-y-1.5">{lines(2)}{card}</div>
          </div>
        </div>
      );
  }

  return (
    <div className="relative aspect-[16/11] w-full overflow-hidden" style={{ background: c.page }}>
      {inner}
    </div>
  );
}

type PickerProps = {
  open: boolean;
  currentId: string;
  onClose: () => void;
  onPick: (id: string) => void;
};

export function TemplatePicker({ open, currentId, onClose, onPick }: PickerProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<TemplateCategory | "All">("All");
  const searchRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchTemplates(text, category), [text, category]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose a template"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl reg-rise sm:rounded-3xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">Choose a template</h2>
            <p className="text-xs text-muted-foreground">Same content, a different look. Switch any time; nothing you wrote is lost.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-xl border border-border hover:bg-secondary">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 border-b border-border px-5 py-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Search: coaching, dark, finance, yoga, launch…"
              className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {(["All", ...TEMPLATE_CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
                  category === cat ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {results.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No templates match that. Try another word.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((t) => {
                const selected = t.id === currentId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onPick(t.id)}
                    className={`group overflow-hidden rounded-2xl border bg-card text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                      selected ? "border-foreground ring-2 ring-foreground" : "border-border"
                    }`}
                  >
                    <div className="relative">
                      <TemplateThumbnail template={t} />
                      {selected ? (
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
                          <Check className="size-3" /> In use
                        </span>
                      ) : null}
                    </div>
                    <div className="border-t border-border px-3.5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{t.name}</p>
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{t.category}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
