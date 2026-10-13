"use client";

/**
 * PDF export that looks like the preview, because it IS the preview.
 *
 * Every slide is rendered with the same SlideView the studio shows, one per
 * page at the deck's exact page size, and handed to the browser's print
 * engine ("Save as PDF"). That keeps the real fonts, photo backdrops,
 * overlays, alignment and auto-fit, and the text stays selectable. The old
 * hand-drawn PDF re-implemented each layout in plain Helvetica and never
 * matched.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { SlideView } from "@/components/deck/SlideView";
import type { Palette, RatioId, Slide, StyleSpec } from "@/lib/deck";

/** Page size in inches per ratio (same sizes the .pptx export uses). */
const PAGE_IN: Record<RatioId, { w: number; h: number }> = {
  "16:9": { w: 13.333, h: 7.5 },
  "4:3": { w: 10, h: 7.5 },
  portrait: { w: 7.5, h: 10 },
  square: { w: 9, h: 9 },
};

export type PrintJob = {
  slides: Slide[];
  palette: Palette;
  spec: StyleSpec;
  ratio: RatioId;
  /** The deck-wide image, used by slides that opt in without their own. */
  image: string | null;
  removeBg: boolean;
  logo: string | null;
  /** Becomes the suggested file name in the Save-as-PDF dialog. */
  title: string;
};

export function DeckPrint({ job, onDone }: { job: PrintJob | null; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!job) return;
    let cancelled = false;
    const previousTitle = document.title;

    const finish = () => {
      window.removeEventListener("afterprint", finish);
      document.title = previousTitle;
      if (!cancelled) onDone();
    };

    (async () => {
      // Let the pages mount, then wait for fonts and every picture, so the
      // print preview never shows a half-loaded slide.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const images = Array.from(rootRef.current?.querySelectorAll("img") ?? []);
      await Promise.all([
        document.fonts?.ready.catch(() => undefined),
        ...images.map((img) => img.decode().catch(() => undefined)),
      ]);
      if (cancelled) return;
      document.title = job.title || "presentation";
      window.addEventListener("afterprint", finish);
      window.print();
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", finish);
      document.title = previousTitle;
    };
  }, [job, onDone]);

  if (!job || typeof document === "undefined") return null;
  const page = PAGE_IN[job.ratio];

  return createPortal(
    <div id="deck-print-root" ref={rootRef} aria-hidden="true">
      <style>{`
        #deck-print-root { display: none; }
        @media print {
          @page { size: ${page.w}in ${page.h}in; margin: 0; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          body > *:not(#deck-print-root) { display: none !important; }
          #deck-print-root { display: block; }
          .deck-print-page {
            position: relative;
            width: ${page.w}in;
            height: ${page.h}in;
            overflow: hidden;
            break-after: page;
            page-break-after: always;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .deck-print-page:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>
      {job.slides.map((slide, i) => (
        <div className="deck-print-page" key={slide.id ?? i}>
          <SlideView
            slide={slide}
            palette={job.palette}
            spec={job.spec}
            image={slide.useImage ? (slide.image ?? job.image) : null}
            removeBg={job.removeBg}
            logo={job.logo}
            motion="None"
          />
        </div>
      ))}
    </div>,
    document.body,
  );
}
