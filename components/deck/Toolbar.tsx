import { Download, FileText, History, Plus } from "lucide-react";
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
  onExportPdf: () => void;
  onHistory: () => void;
  onNew: () => void;
};

export function Toolbar({ ratio, onRatio, style, onStyle, motion, onMotion, generating, hasContent, onGenerate, onExport, onExportPdf, onHistory, onNew }: Props) {
  return (
    <header className="flex h-14 sm:h-16 min-w-0 shrink-0 items-center justify-between gap-2 sm:gap-4 border-b border-border bg-card px-3 sm:px-5 overflow-x-auto no-scrollbar">
      <div className="hidden shrink-0 text-[12px] font-medium uppercase tracking-[0.28em] text-foreground lg:block">
        PPTX Builder
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3 shrink-0">
        <Seg>
          {RATIOS.map((r) => (
            <SegItem key={r.id} active={ratio === r.id} onClick={() => onRatio(r.id)}>
              {r.label}
            </SegItem>
          ))}
        </Seg>

        <div className="hidden md:block">
          <Seg>
            {STYLES.map((s) => (
              <SegItem key={s.id} active={style === s.id} onClick={() => onStyle(s.id)}>
                {s.label}
              </SegItem>
            ))}
          </Seg>
        </div>

        <div className="hidden sm:block">
          <Seg>
            {MOTIONS.map((item) => (
              <SegItem key={item} active={motion === item} onClick={() => onMotion(item)}>
                {item}
              </SegItem>
            ))}
          </Seg>
        </div>

        <div className="hidden sm:block mx-1 h-6 w-px bg-border shrink-0" />

        <button
          type="button"
          onClick={onNew}
          title="Start a new presentation"
          className="flex items-center gap-1 sm:gap-1.5 rounded-[10px] border border-border bg-card px-2.5 sm:px-3 py-1.5 text-xs sm:text-[13px] text-foreground transition-colors duration-150 hover:bg-secondary shrink-0"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">New</span>
        </button>

        <button
          type="button"
          onClick={onHistory}
          title="Open a past presentation"
          className="flex items-center gap-1 sm:gap-1.5 rounded-[10px] border border-border bg-card px-2.5 sm:px-3 py-1.5 text-xs sm:text-[13px] text-foreground transition-colors duration-150 hover:bg-secondary shrink-0"
        >
          <History className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">History</span>
        </button>

        <button
          type="button"
          onClick={onExport}
          disabled={!hasContent}
          className="flex items-center gap-1 sm:gap-1.5 rounded-[10px] border border-border bg-card px-2.5 sm:px-3 py-1.5 text-xs sm:text-[13px] text-foreground transition-colors duration-150 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35 shrink-0"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Export .pptx</span>
          <span className="sm:hidden">PPTX</span>
        </button>

        <button
          type="button"
          onClick={onExportPdf}
          disabled={!hasContent}
          title="Download the deck as a PDF"
          className="flex items-center gap-1 sm:gap-1.5 rounded-[10px] border border-border bg-card px-2.5 sm:px-3 py-1.5 text-xs sm:text-[13px] text-foreground transition-colors duration-150 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35 shrink-0"
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Export PDF</span>
          <span className="sm:hidden">PDF</span>
        </button>

        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={generating}
          className={`relative overflow-hidden rounded-[10px] bg-foreground px-3 sm:px-4 py-1.5 text-xs sm:text-[13px] font-medium text-background transition-opacity duration-150 hover:opacity-90 disabled:opacity-75 shrink-0 ${generating ? "generation-button" : ""}`}
        >
          {generating ? "Generating…" : "Generate"}
        </button>
      </div>
    </header>
  );
}
