"use client";

import { Check, Pipette } from "lucide-react";
import { isHexColor, readableInk, THEME_SWATCHES } from "@/lib/webinar-templates";

type Props = {
  label: string;
  hint: string;
  /** "" = the template's own colour. */
  value: string;
  templateDefault: string;
  onChange: (value: string) => void;
};

/** A row of curated swatches, a custom colour, and "template default". */
export function ThemeColorField({ label, hint, value, templateDefault, onChange }: Props) {
  const current = isHexColor(value) ? value : templateDefault;
  const swatch = (color: string, title: string, active: boolean, onClick: () => void) => (
    <button
      key={title}
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      style={{ background: color }}
      className={`grid size-7 place-items-center rounded-full border border-black/10 transition hover:scale-110 ${
        active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
      }`}
    >
      {active ? <Check className="size-3.5" style={{ color: readableInk(color) }} strokeWidth={3} /> : null}
    </button>
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[11px] text-muted-foreground">{hint}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {swatch(templateDefault, "Template colour", !value, () => onChange(""))}
        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
        {THEME_SWATCHES.filter((c) => c.toLowerCase() !== templateDefault.toLowerCase()).map((c) =>
          swatch(c, c, value.toLowerCase() === c, () => onChange(c)),
        )}
        <label
          title="Any colour"
          className={`relative grid size-7 cursor-pointer place-items-center rounded-full border border-dashed border-border-strong transition hover:scale-110 ${
            value && !THEME_SWATCHES.includes(value.toLowerCase() as (typeof THEME_SWATCHES)[number])
              ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
              : ""
          }`}
          style={
            value && !THEME_SWATCHES.includes(value.toLowerCase() as (typeof THEME_SWATCHES)[number])
              ? { background: value }
              : undefined
          }
        >
          <Pipette className="size-3.5 text-muted-foreground" />
          <input
            type="color"
            value={current}
            onChange={(e) => onChange(e.target.value.toLowerCase())}
            aria-label={`${label}: any colour`}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}
