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
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-border bg-card px-5 py-2.5">
      <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Layout</span>
      <div className="flex gap-1.5">
        {LAYOUTS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onLayout(l)}
            aria-label={`Layout ${l}`}
            className={cn(
              "h-8 w-11 rounded-[6px] border bg-background p-1 transition-colors duration-150",
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
        className="rounded-[8px] border border-border bg-background px-3 py-1.5 text-[12px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
      >
        Apply to all slides
      </button>
      <button
        type="button"
        onClick={onRegenerate}
        disabled={regenerating}
        className="flex items-center gap-1.5 rounded-[8px] border border-border bg-background px-3 py-1.5 text-[12px] text-foreground transition-colors hover:border-foreground/30 disabled:opacity-45"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
        Regenerate this slide
      </button>
      <span className="ml-auto text-[11.5px] text-muted-foreground">
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
