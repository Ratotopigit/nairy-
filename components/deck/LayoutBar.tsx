import { RefreshCw } from "lucide-react";
import type { LayoutVariant, Slide } from "@/lib/deck";
import { cn } from "@/lib/utils";

type Props = {
  slide: Slide;
  onLayout: (l: LayoutVariant) => void;
  onAllLayout: (l: LayoutVariant) => void;
  onRegenerate: () => void;
  regenerating: boolean;
};

const LAYOUTS: LayoutVariant[] = ["A", "B", "C", "D"];

export function LayoutBar({ slide, onLayout, onAllLayout, onRegenerate, regenerating }: Props) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 sm:gap-3 border-t border-border bg-card px-3 sm:px-5 py-2 sm:py-2.5 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-muted-foreground hidden sm:inline">Layout</span>
        <div className="flex gap-1 sm:gap-1.5">
          {LAYOUTS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLayout(l)}
              aria-label={`Layout ${l}`}
              className={cn(
                "h-7 w-9 sm:h-8 sm:w-11 rounded-[6px] border bg-background p-0.5 sm:p-1 transition-colors duration-150",
                slide.layout === l ? "border-accent" : "border-border hover:border-foreground/25",
              )}
            >
              <LayoutGlyph variant={l} active={slide.layout === l} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onAllLayout(slide.layout)}
          className="rounded-[8px] border border-border bg-background px-2.5 py-1 text-[11px] sm:text-[12px] text-muted-foreground transition-colors duration-150 hover:text-foreground shrink-0"
        >
          <span className="hidden sm:inline">Apply to all slides</span>
          <span className="sm:hidden">All slides</span>
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 rounded-[8px] border border-border bg-background px-2.5 py-1 text-[11px] sm:text-[12px] text-foreground transition-colors hover:border-foreground/30 disabled:opacity-45 shrink-0"
        >
          <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${regenerating ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Regenerate this slide</span>
          <span className="sm:hidden">Regenerate</span>
        </button>
      </div>
      <span className="hidden xl:inline ml-auto text-[11.5px] text-muted-foreground shrink-0">
        Click any text on the slide to edit it
      </span>
    </div>
  );
}

function LayoutGlyph({ variant, active }: { variant: LayoutVariant; active: boolean }) {
  const fill = active ? "var(--foreground)" : "var(--muted-foreground)";
  const soft = active ? "var(--muted-foreground)" : "var(--border)";
  return (
    <svg viewBox="0 0 36 22" className="h-full w-full" aria-hidden>
      {variant === "A" ? (
        <>
          <rect x="2" y="4" width="14" height="3" fill={fill} />
          <rect x="2" y="9" width="12" height="2" fill={soft} />
          <rect x="20" y="4" width="14" height="14" fill={soft} />
        </>
      ) : null}
      {variant === "B" ? (
        <>
          <rect x="20" y="4" width="14" height="3" fill={fill} />
          <rect x="20" y="9" width="12" height="2" fill={soft} />
          <rect x="2" y="4" width="14" height="14" fill={soft} />
        </>
      ) : null}
      {variant === "C" ? (
        <>
          <rect x="2" y="2" width="32" height="18" fill={soft} />
          <rect x="4" y="13" width="14" height="3" fill={fill} />
        </>
      ) : null}
      {variant === "D" ? (
        <>
          <rect x="2" y="3" width="16" height="3" fill={fill} />
          <rect x="2" y="10" width="32" height="8" fill={soft} />
        </>
      ) : null}
    </svg>
  );
}
