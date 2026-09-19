import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { GeneratedPresentation } from "@/lib/presentation-brief";

export const GENERATION_STEPS = [
  "Understanding your business",
  "Creating presentation structure",
  "Writing slide content",
  "Selecting layouts",
  "Applying visual style",
  "Preparing presentation",
];

export function GenerationProgress({ done }: { done: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (done) {
      setIndex(GENERATION_STEPS.length);
      return;
    }
    const id = setInterval(
      () => setIndex((i) => Math.min(i + 1, GENERATION_STEPS.length - 1)),
      900,
    );
    return () => clearInterval(id);
  }, [done]);

  return (
    <div className="space-y-2.5">
      {GENERATION_STEPS.map((label, i) => {
        const complete = i < index;
        const active = i === index && !done;
        return (
          <div key={label} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "size-1.5 rounded-full transition-colors duration-200",
                complete ? "bg-foreground" : active ? "bg-accent" : "bg-border",
              )}
            />
            <span
              className={cn(
                "transition-colors duration-200",
                complete || active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ResultCard({
  result,
  onRegenerate,
}: {
  result: GeneratedPresentation;
  onRegenerate: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-medium tracking-tight text-foreground">{result.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {result.slideCount} slides · {result.ratio} · {result.style}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={result.openUrl ?? "#"}
          className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-colors duration-200 hover:bg-foreground/90"
        >
          Open presentation
        </a>
        <a
          href={result.downloadUrl ?? "#"}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground transition-colors duration-200 hover:border-foreground/30"
        >
          Download .pptx
        </a>
        <button
          type="button"
          onClick={onRegenerate}
          className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}
