import { Download } from "lucide-react";
import { Seg, SegItem } from "./controls";
import { MOTIONS, RATIOS, STYLES, type Motion, type RatioId, type StyleId } from "@/lib/deck";

type Props = {
  ratio: RatioId;
  onRatio: (r: RatioId) => void;
  style: StyleId;
  onStyle: (s: StyleId) => void;
  motion: Motion;
  onMotion: (motion: Motion) => void;
  generating: boolean;
  hasContent: boolean;
  onGenerate: () => void | Promise<void>;
  onExport: () => void;
};

export function Toolbar({ ratio, onRatio, style, onStyle, motion, onMotion, generating, hasContent, onGenerate, onExport }: Props) {
  return (
    <header className="flex h-16 min-w-0 shrink-0 items-center gap-4 border-b border-border bg-card px-3 sm:px-5">
      <div className="hidden shrink-0 text-[12px] font-medium uppercase tracking-[0.28em] text-foreground lg:block">
        PPTX Builder
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-3 overflow-x-auto">
        <Seg>
          {RATIOS.map((r) => (
            <SegItem key={r.id} active={ratio === r.id} onClick={() => onRatio(r.id)}>
              {r.label}
            </SegItem>
          ))}
        </Seg>

        <Seg>
          {STYLES.map((s) => (
            <SegItem key={s.id} active={style === s.id} onClick={() => onStyle(s.id)}>
              {s.label}
            </SegItem>
          ))}
        </Seg>

        <Seg>
          {MOTIONS.map((item) => (
            <SegItem key={item} active={motion === item} onClick={() => onMotion(item)}>
              {item}
            </SegItem>
          ))}
        </Seg>

        <div className="mx-1 h-6 w-px bg-border" />

        <button
          type="button"
          onClick={onExport}
          disabled={!hasContent}
          className="flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 py-1.5 text-[13px] text-foreground transition-colors duration-150 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
          Export .pptx
        </button>

        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={generating}
          className={`relative overflow-hidden rounded-[10px] bg-foreground px-4 py-1.5 text-[13px] font-medium text-background transition-opacity duration-150 hover:opacity-90 disabled:opacity-75 ${generating ? "generation-button" : ""}`}
        >
          {generating ? "Generating…" : "Generate"}
        </button>
      </div>
    </header>
  );
}
