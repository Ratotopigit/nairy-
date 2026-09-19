import { useRef } from "react";
import { PaletteIcon, Scissors, X } from "lucide-react";
import { FieldLabel, PanelSection } from "./controls";
import { PALETTES, type Palette } from "@/lib/deck";
import { cn } from "@/lib/utils";

export type CustomColors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
};

type Props = {
  image: string | null;
  onImage: (v: string | null) => void;
  logo: string | null;
  onLogo: (v: string | null) => void;
  onExtractPalette: () => void;
  onRemoveBackground: () => void;
  processing: "palette" | "background" | null;
  paletteId: string;
  onPaletteId: (v: string) => void;
  custom: CustomColors;
  onCustom: (c: CustomColors) => void;
  brandNote: string | null;
};

function readFile(file: File, cb: (v: string) => void) {
  const reader = new FileReader();
  reader.onload = () => cb(String(reader.result));
  reader.readAsDataURL(file);
}

export function LeftPanel(p: Props) {
  const imgRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  return (
    <aside className="hidden w-[236px] shrink-0 flex-col overflow-y-auto border-r border-border bg-card lg:flex">
      <PanelSection title="Brand">
        <p className="rounded-[10px] border border-border bg-background px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
          Upload your logo and one key brand photo. Nothing changes automatically: use the buttons
          below when you want to remove a background or generate a colour palette.
        </p>

        <input
          ref={logoRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f, p.onLogo);
          }}
        />
        {p.logo ? (
          <div className="flex items-center justify-between rounded-[10px] border border-border bg-background px-3 py-2">
            <button type="button" onClick={() => logoRef.current?.click()} className="flex min-w-0 items-center gap-2 text-left">
              <img src={p.logo} alt="Logo" className="h-7 w-16 object-contain" />
              <span className="text-[11px] text-muted-foreground">Replace logo</span>
            </button>
            <button
              type="button"
              onClick={() => p.onLogo(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            className="w-full rounded-[10px] border border-dashed border-border bg-background py-5 text-[12px] text-muted-foreground transition-colors duration-150 hover:border-foreground/25 hover:text-foreground"
          >
            Upload logo
          </button>
        )}


        <input
          ref={imgRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f, p.onImage);
          }}
        />
        {p.image ? (
          <div className="relative overflow-hidden rounded-[10px] border border-border">
            <button type="button" onClick={() => imgRef.current?.click()} className="block w-full">
              <img src={p.image} alt="Uploaded brand" className="h-24 w-full object-cover" />
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-card/90 px-2 py-1 text-[10px] text-foreground">Replace photo</span>
            </button>
            <button
              type="button"
              onClick={() => p.onImage(null)}
              className="absolute right-1.5 top-1.5 rounded-md border border-border bg-card p-1 text-muted-foreground transition-colors duration-150 hover:text-foreground"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" strokeWidth={1.75} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imgRef.current?.click()}
            className="w-full rounded-[10px] border border-dashed border-border bg-background py-5 text-[12px] text-muted-foreground transition-colors duration-150 hover:border-foreground/25 hover:text-foreground"
          >
            Upload a photo for your deck
            <div className="mt-1 text-[11px] text-muted-foreground/70">
              Then choose whether to generate its palette
            </div>

          </button>
        )}

        {p.image || p.logo ? (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={p.onExtractPalette}
            disabled={p.processing !== null}
            className="flex items-center justify-center gap-2 rounded-[10px] bg-foreground px-3 py-2 text-[12px] font-medium text-background disabled:opacity-45"
          >
            <PaletteIcon className="h-3.5 w-3.5" />
            {p.processing === "palette" ? "Reading colours..." : "Generate palette from upload"}
          </button>
          {p.image ? (
            <button
              type="button"
              onClick={p.onRemoveBackground}
              disabled={p.processing !== null}
              className="flex items-center justify-center gap-2 rounded-[10px] border border-border bg-background px-3 py-2 text-[12px] text-foreground disabled:opacity-45"
            >
              <Scissors className="h-3.5 w-3.5" />
              {p.processing === "background" ? "Removing background..." : "Remove photo background"}
            </button>
          ) : null}
        </div>
        ) : null}

        {p.brandNote ? (
          <div className="space-y-1.5 rounded-[10px] border border-accent bg-background px-2.5 py-2">
            <div className="flex items-center gap-2">
              <Swatches
                colors={[
                  p.custom.primary,
                  p.custom.secondary,
                  p.custom.accent,
                  p.custom.background,
                ]}
              />
              <span className="text-[12px] text-foreground">Your brand palette</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{p.brandNote}</p>
          </div>
        ) : null}

      </PanelSection>

      <PanelSection title="Colour">
        <div className="space-y-1">
          {PALETTES.map((pal) => (
            <PaletteRow
              key={pal.id}
              palette={pal}
              active={p.paletteId === pal.id}
              onClick={() => p.onPaletteId(pal.id)}
            />
          ))}
          <button
            type="button"
            onClick={() => p.onPaletteId("custom")}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2 py-1.5 text-left transition-colors duration-150 hover:bg-secondary",
              p.paletteId === "custom" && "border-accent",
            )}
          >
            <Swatches
              colors={[p.custom.primary, p.custom.secondary, p.custom.accent, p.custom.background]}
            />
            <span className="text-[13px] text-foreground">Custom</span>
          </button>
        </div>

        {p.paletteId === "custom" ? (
          <div className="space-y-2 rounded-[10px] border border-border bg-background p-2.5">
            <FieldLabel>Your colours</FieldLabel>
            {(["primary", "secondary", "accent", "background"] as const).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <input
                  type="color"
                  value={p.custom[k]}
                  onChange={(e) => p.onCustom({ ...p.custom, [k]: e.target.value })}
                  className="h-6 w-6 cursor-pointer rounded-[6px] border border-border bg-transparent p-0"
                  aria-label={k}
                />
                <span className="w-[70px] text-[12px] capitalize text-muted-foreground">{k}</span>
                <input
                  value={p.custom[k]}
                  onChange={(e) => p.onCustom({ ...p.custom, [k]: e.target.value })}
                  className="w-full rounded-[6px] border border-border bg-card px-2 py-1 text-[12px] uppercase text-foreground outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        ) : null}
      </PanelSection>
    </aside>
  );
}

function Swatches({ colors }: { colors: string[] }) {
  return (
    <span className="flex overflow-hidden rounded-[5px] border border-border">
      {colors.map((c, i) => (
        <span key={i} style={{ background: c }} className="h-4 w-4" />
      ))}
    </span>
  );
}

function PaletteRow({
  palette,
  active,
  onClick,
}: {
  palette: Palette;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[10px] border border-transparent px-2 py-1.5 text-left transition-colors duration-150 hover:bg-secondary",
        active && "border-accent",
      )}
    >
      <Swatches colors={[palette.primary, palette.secondary, palette.accent, palette.background]} />
      <span className="text-[13px] text-foreground">{palette.name}</span>
    </button>
  );
}
