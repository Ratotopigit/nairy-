"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, History, MoreHorizontal, Plus } from "lucide-react";
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

const ACTION_CLASS =
  "flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 py-1.5 text-[13px] text-foreground transition-colors duration-150 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35 shrink-0";

export function Toolbar({
  ratio, onRatio, style, onStyle, motion, onMotion,
  generating, hasContent, onGenerate, onExport, onExportPdf, onHistory, onNew,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape. Without this the sheet stays open behind
  // whatever the user taps next, which on a phone reads as a stuck overlay.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const run = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:h-16 sm:gap-3 sm:px-5">
      <div className="hidden shrink-0 text-[12px] font-medium uppercase tracking-[0.28em] text-foreground lg:block">
        PPTX Builder
      </div>

      {/* Theme controls scroll; the actions beside them must not. */}
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto no-scrollbar sm:gap-3">
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

        <div className="hidden lg:block">
          <Seg>
            {MOTIONS.map((item) => (
              <SegItem key={item} active={motion === item} onClick={() => onMotion(item)}>
                {item}
              </SegItem>
            ))}
          </Seg>
        </div>
      </div>

      <div className="hidden h-6 w-px shrink-0 bg-border lg:block" />

      {/* Secondary actions, inline only when there is room for them. */}
      <div className="hidden shrink-0 items-center gap-2 lg:flex">
        <button type="button" onClick={onNew} title="Start a new presentation" className={ACTION_CLASS}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          New
        </button>
        <button type="button" onClick={onHistory} title="Open a past presentation" className={ACTION_CLASS}>
          <History className="h-3.5 w-3.5" strokeWidth={1.75} />
          History
        </button>
        <button type="button" onClick={onExport} disabled={!hasContent} className={ACTION_CLASS}>
          <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
          .pptx
        </button>
        <button type="button" onClick={onExportPdf} disabled={!hasContent} title="Download the deck as a PDF" className={ACTION_CLASS}>
          <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
          PDF
        </button>
      </div>

      {/* Below lg the same actions live in a menu, so Generate always stays
          on screen instead of being pushed off the end of a scrolling row. */}
      <div ref={menuRef} className="relative shrink-0 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="More actions"
          className={ACTION_CLASS}
        >
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
        </button>

        {menuOpen ? (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 origin-top-right rounded-xl border border-border bg-card p-1 shadow-lg animate-[fadeInUp_140ms_ease-out_both]"
          >
            <MenuItem icon={<Plus className="h-4 w-4" strokeWidth={1.75} />} onClick={run(onNew)}>
              New presentation
            </MenuItem>
            <MenuItem icon={<History className="h-4 w-4" strokeWidth={1.75} />} onClick={run(onHistory)}>
              History
            </MenuItem>
            <MenuItem icon={<Download className="h-4 w-4" strokeWidth={1.75} />} onClick={run(onExport)} disabled={!hasContent}>
              Export .pptx
            </MenuItem>
            <MenuItem icon={<FileText className="h-4 w-4" strokeWidth={1.75} />} onClick={run(onExportPdf)} disabled={!hasContent}>
              Export PDF
            </MenuItem>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => void onGenerate()}
        disabled={generating}
        className={`relative shrink-0 overflow-hidden rounded-[10px] bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity duration-150 hover:opacity-90 disabled:opacity-75 sm:px-4 sm:text-[13px] ${generating ? "generation-button" : ""}`}
      >
        {generating ? "Generating…" : "Generate"}
      </button>
    </header>
  );
}

function MenuItem({
  icon, children, onClick, disabled,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-foreground transition-colors duration-150 hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35"
    >
      {icon}
      {children}
    </button>
  );
}
