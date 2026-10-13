"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import {
  ImageError,
  importPhoto,
  searchPhotos,
  suggestPhotos,
  type StockPhoto,
} from "@/lib/webinar-images";
import type { TemplateCategory } from "@/lib/webinar-templates";

type Props = {
  open: boolean;
  webinarId: string;
  /** "suggest" runs searches built from the page's own words on open. */
  mode: "search" | "suggest";
  context: { title: string; subtitle: string; category: TemplateCategory };
  onClose: () => void;
  /** Called with the URL of the copy now stored in the host's own storage. */
  onPicked: (url: string) => void;
};

function friendly(e: unknown): string {
  if (e instanceof ImageError) return e.message;
  const message = e instanceof Error ? e.message : "";
  if (/not published|404|webhook.*not registered/i.test(message)) {
    return "Photo search isn't switched on yet. You can still upload your own image.";
  }
  return "We couldn't reach the photo library just now. Check your connection and try again, or upload your own image.";
}

export function ImagePicker({ open, webinarId, mode, context, onClose, onPicked }: Props) {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<StockPhoto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedQueries, setUsedQueries] = useState<string[]>([]);
  const [importing, setImporting] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const run = useRef(0);

  const runSearch = useCallback(async (q: string) => {
    const ticket = ++run.current;
    setLoading(true);
    setError(null);
    setPhotos(null);
    try {
      const found = await searchPhotos(q, "horizontal");
      if (ticket !== run.current) return;
      setPhotos(found);
      setUsedQueries([q]);
    } catch (e) {
      if (ticket !== run.current) return;
      console.error("photo search failed:", e);
      setError(friendly(e));
      setPhotos([]);
    } finally {
      if (ticket === run.current) setLoading(false);
    }
  }, []);

  const runSuggest = useCallback(async () => {
    const ticket = ++run.current;
    setLoading(true);
    setError(null);
    setPhotos(null);
    try {
      const { photos: found, queries } = await suggestPhotos(context);
      if (ticket !== run.current) return;
      setPhotos(found);
      setUsedQueries(queries);
      setQuery(queries[0] ?? "");
    } catch (e) {
      if (ticket !== run.current) return;
      console.error("photo suggestions failed:", e);
      setError(friendly(e));
      setPhotos([]);
    } finally {
      if (ticket === run.current) setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    if (!open) return;
    setImporting(null);
    setHidden(new Set());
    setError(null);
    setPhotos(null);
    setUsedQueries([]);
    if (mode === "suggest") {
      void runSuggest();
    } else {
      setQuery("");
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && importing === null && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Runs when the dialog opens; the callbacks it uses are stable per open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  async function choose(photo: StockPhoto) {
    if (importing !== null) return;
    setImporting(photo.id);
    setError(null);
    try {
      onPicked(await importPhoto(webinarId, photo, "hero"));
      onClose();
    } catch (e) {
      console.error("photo import failed:", e);
      setError(friendly(e));
    } finally {
      setImporting(null);
    }
  }

  if (!open) return null;
  const visible = (photos ?? []).filter((p) => !hidden.has(p.id));

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 sm:items-center sm:p-6" onClick={() => importing === null && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Find a photo"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">{mode === "suggest" ? "Suggested photos" : "Find a photo"}</h2>
            <p className="text-xs text-muted-foreground">
              {mode === "suggest" && usedQueries.length
                ? `Based on your page: ${usedQueries.join(" · ")}`
                : "Choose one and it's saved to your account and shown on your page straight away."}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={importing !== null} aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-xl border border-border hover:bg-secondary">
            <X className="size-4" />
          </button>
        </div>

        <form
          className="flex gap-2 border-b border-border px-5 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) void runSearch(query);
          }}
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search photos</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={100}
              placeholder="Try: team meeting, yoga studio, modern office…"
              className="w-full rounded-xl border border-input bg-card py-2.5 pl-10 pr-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <button type="submit" disabled={loading || !query.trim()} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50">
            Search
          </button>
          {mode === "search" ? null : (
            <button type="button" onClick={() => void runSuggest()} disabled={loading} className="hidden rounded-xl border border-border px-3.5 py-2.5 text-sm transition-colors hover:bg-secondary sm:block">
              More ideas
            </button>
          )}
        </form>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error ? (
            <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Loading photos">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="aspect-[3/2] animate-pulse rounded-xl bg-secondary" />
              ))}
            </div>
          ) : photos === null ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Type what the photo should show, then press Search.</p>
          ) : visible.length === 0 && !error ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No photos found</p>
              <p className="mt-1">Try a simpler or more general word, like &ldquo;office&rdquo; instead of &ldquo;open-plan startup office&rdquo;.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visible.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void choose(p)}
                  disabled={importing !== null}
                  className="group relative overflow-hidden rounded-xl border border-border bg-secondary text-left outline-none transition focus-visible:ring-2 focus-visible:ring-foreground disabled:cursor-wait"
                  title={p.tags}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.preview}
                    alt={p.tags ? `Photo: ${p.tags}` : "Stock photo"}
                    loading="lazy"
                    onError={() => setHidden((s) => new Set(s).add(p.id))}
                    className="aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-2 pt-6 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    Photo by {p.user || "Pixabay"}
                  </span>
                  {importing === p.id ? (
                    <span className="absolute inset-0 grid place-items-center bg-background/70">
                      <Loader2 className="size-5 animate-spin" />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-[11px] text-muted-foreground">
          <span>
            Photos from{" "}
            <a href="https://pixabay.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              Pixabay
            </a>
            , free for commercial use. A copy is saved to your account.
          </span>
        </div>
      </div>
    </div>
  );
}
