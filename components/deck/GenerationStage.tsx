import { Check, FileText, Layers3, Palette, PanelTop } from "lucide-react";
import { GENERATION_STEPS } from "@/lib/deck";

const ICONS = [FileText, Layers3, Palette, PanelTop];

export function GenerationStage({ step, slideCount }: { step: number; slideCount: number }) {
  const activeStep = Math.min(Math.max(step, 0), GENERATION_STEPS.length - 1);
  const progress = ((activeStep + 1) / GENERATION_STEPS.length) * 100;

  return (
    <section
      role="status"
      aria-live="polite"
      className="generation-stage relative w-full max-w-4xl overflow-hidden rounded-[28px] border border-border bg-card px-6 py-8 shadow-[0_28px_90px_rgba(29,42,39,0.10)] sm:px-10 sm:py-10"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-secondary">
        <span
          className="block h-full bg-accent transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Building {slideCount} pages
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl">
            Turning your brief into a coherent presentation.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            The structure, slide rhythm, brand system, and closing sequence are being prepared together.
          </p>

          <div className="mt-8 grid gap-2">
            {GENERATION_STEPS.map((label, index) => {
              const Icon = ICONS[index]!;
              const complete = index < activeStep;
              const active = index === activeStep;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-500 ${
                    active
                      ? "translate-x-1 border-accent bg-accent-soft text-foreground"
                      : complete
                        ? "border-transparent text-foreground"
                        : "border-transparent text-muted-foreground/65"
                  }`}
                >
                  <span className={`grid size-8 place-items-center rounded-lg ${active ? "bg-accent text-accent-foreground" : "bg-secondary"}`}>
                    {complete ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                  {active ? <span className="generation-working ml-auto font-mono text-[10px] uppercase tracking-[0.14em]">In progress</span> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="generation-stack relative mx-auto h-[260px] w-full max-w-[320px]" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="generation-sheet absolute inset-x-0 mx-auto h-[190px] w-[280px] overflow-hidden rounded-2xl border border-border bg-[#fffefb] shadow-[0_18px_45px_rgba(29,42,39,0.12)]"
              style={{
                top: `${index * 24}px`,
                transform: `scale(${1 - index * 0.045})`,
                zIndex: 3 - index,
                animationDelay: `${index * 140}ms`,
              }}
            >
              <div className="generation-scan absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              <div className="grid h-full grid-cols-[1.1fr_0.9fr] gap-4 p-5">
                <div className="space-y-3">
                  <div className="h-2 w-14 rounded-full bg-[#b95f35]/70" />
                  <div className="h-5 w-full rounded-md bg-[#1d2a27]/85" />
                  <div className="h-5 w-4/5 rounded-md bg-[#1d2a27]/85" />
                  <div className="mt-5 h-2 w-full rounded-full bg-[#ddd7ca]" />
                  <div className="h-2 w-3/4 rounded-full bg-[#ddd7ca]" />
                </div>
                <div className="rounded-xl bg-[#d5e0d7] p-3">
                  <div className="h-full rounded-lg border border-[#1f4d3d]/15 bg-[#f4f1e8]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
