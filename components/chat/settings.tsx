import { useRef } from "react";
import { Chip, ChipRow } from "./chip";
import { PALETTES, type PalettePreset } from "@/lib/presentation-brief";
import { cn } from "@/lib/utils";

export type SettingsState = {
  type: string;
  slideCount: number | "Auto";
  ratio: string;
  style: string;
  preset: PalettePreset;
  custom: { primary: string; secondary: string; accent: string; background: string };
  imageName: string | null;
  logoName: string | null;
  removeBackground: boolean;
};

export const DEFAULT_SETTINGS: SettingsState = {
  type: "Sales Deck",
  slideCount: 10,
  ratio: "16:9",
  style: "Modern",
  preset: "Clay",
  custom: { ...PALETTES.Clay },
  imageName: null,
  logoName: null,
  removeBackground: true,
};

const TYPES = ["Company Profile", "Sales Deck", "Pitch Deck", "Proposal", "Marketing", "Report"];
const COUNTS: Array<number | "Auto"> = [5, 8, 10, 12, "Auto"];
const RATIOS = ["16:9", "4:3", "Portrait", "Square"];
const STYLES = ["Modern", "Minimal", "Corporate", "Editorial", "Bold", "Luxury"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function SettingsStep({
  value,
  onChange,
}: {
  value: SettingsState;
  onChange: (v: SettingsState) => void;
}) {
  const set = <K extends keyof SettingsState>(k: K, v: SettingsState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      <Field label="Presentation type">
        <ChipRow>
          {TYPES.map((t) => (
            <Chip key={t} label={t} selected={value.type === t} onClick={() => set("type", t)} />
          ))}
        </ChipRow>
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Slide count">
          <ChipRow>
            {COUNTS.map((c) => (
              <Chip
                key={String(c)}
                label={String(c)}
                selected={value.slideCount === c}
                onClick={() => set("slideCount", c)}
              />
            ))}
          </ChipRow>
        </Field>
        <Field label="Ratio">
          <ChipRow>
            {RATIOS.map((r) => (
              <Chip key={r} label={r} selected={value.ratio === r} onClick={() => set("ratio", r)} />
            ))}
          </ChipRow>
        </Field>
      </div>

      <Field label="Style">
        <ChipRow>
          {STYLES.map((s) => (
            <Chip key={s} label={s} selected={value.style === s} onClick={() => set("style", s)} />
          ))}
        </ChipRow>
      </Field>

      <Field label="Color palette">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PALETTES) as Array<keyof typeof PALETTES>).map((name) => {
            const p = PALETTES[name];
            const selected = value.preset === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onChange({ ...value, preset: name, custom: { ...p } })}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors duration-200",
                  selected
                    ? "border-accent bg-accent-soft text-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="flex gap-1">
                  {[p.primary, p.secondary, p.accent, p.background].map((c) => (
                    <span
                      key={c}
                      className="size-3 rounded-[3px] border border-border"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
                {name}
              </button>
            );
          })}
          <Chip
            label="Custom"
            selected={value.preset === "Custom"}
            onClick={() => set("preset", "Custom")}
          />
        </div>

        {value.preset === "Custom" && (
          <div className="fade-in-up mt-3 grid gap-3 sm:grid-cols-2">
            {(["primary", "secondary", "accent", "background"] as const).map((key) => (
              <div
                key={key}
                className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2"
              >
                <input
                  type="color"
                  aria-label={`${key} color`}
                  value={value.custom[key]}
                  onChange={(e) =>
                    onChange({ ...value, custom: { ...value.custom, [key]: e.target.value } })
                  }
                  className="size-6 cursor-pointer rounded border border-border bg-transparent p-0"
                />
                <span className="w-20 text-xs capitalize text-muted-foreground">{key}</span>
                <input
                  value={value.custom[key]}
                  onChange={(e) =>
                    onChange({ ...value, custom: { ...value.custom, [key]: e.target.value } })
                  }
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            ))}
          </div>
        )}
      </Field>

      <Field label="Do you want to use a photo or logo in the presentation?">
        <div className="grid gap-3 sm:grid-cols-2">
          <Upload
            label="Upload image"
            hint="JPG, PNG"
            accept="image/jpeg,image/png"
            fileName={value.imageName}
            onFile={(n) => set("imageName", n)}
          />
          <Upload
            label="Upload logo"
            hint="PNG, JPG, SVG"
            accept="image/png,image/jpeg,image/svg+xml"
            fileName={value.logoName}
            onFile={(n) => set("logoName", n)}
          />
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
          <span
            role="switch"
            aria-checked={value.removeBackground}
            onClick={() => set("removeBackground", !value.removeBackground)}
            className={cn(
              "relative h-5 w-9 rounded-full border transition-colors duration-200",
              value.removeBackground ? "border-accent bg-accent" : "border-border bg-muted",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-3.5 rounded-full bg-card transition-all duration-200",
                value.removeBackground ? "left-4.5" : "left-0.5",
              )}
            />
          </span>
          Remove image background
        </label>
      </Field>
    </div>
  );
}

function Upload({
  label,
  hint,
  accept,
  fileName,
  onFile,
}: {
  label: string;
  hint: string;
  accept: string;
  fileName: string | null;
  onFile: (name: string | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-md border border-dashed border-border bg-card px-3 py-3">
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0]?.name ?? null)}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm text-foreground">{fileName ?? label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        <button
          type="button"
          onClick={() => (fileName ? onFile(null) : ref.current?.click())}
          className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          {fileName ? "Remove" : "Choose"}
        </button>
      </div>
    </div>
  );
}
