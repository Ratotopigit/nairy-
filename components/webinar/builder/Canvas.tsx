"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";
import { BlockPage } from "@/components/webinar/blocks/BlockPage";
import type { Block, PageId } from "@/lib/page-blocks";
import type { Webinar } from "@/lib/webinars";
import { blockLabel, DRAG_MIME } from "./Palette";
import type { Path } from "./tree";

export type BlockAction = "up" | "down" | "duplicate" | "delete";

/** Where the pointer would drop, and which marker shows it. */
type Target = { slot: Path; mark: string };

const WIDTH = { desktop: 1200, mobile: 390 } as const;
const ACCENT = "#2563eb";

const TOOL =
  "grid size-9 place-items-center rounded-md text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-40";

export function Canvas({
  webinar,
  page,
  blocks,
  selectedId,
  preview,
  device,
  dragging,
  canDrop,
  onSelect,
  onDrop,
  onAction,
  onMoveStart,
  onDragEnd,
}: {
  webinar: Webinar;
  page: PageId;
  blocks: Block[];
  selectedId: string | null;
  preview: boolean;
  device: keyof typeof WIDTH;
  /** What is being dragged right now, if anything ("columns" matters: it can't go into a column). */
  dragging: { type: Block["type"] } | null;
  canDrop: (slot: Path) => boolean;
  onSelect: (id: string | null) => void;
  onDrop: (slot: Path) => void;
  onAction: (path: Path, action: BlockAction) => void;
  onMoveStart: (id: string, type: Block["type"]) => void;
  onDragEnd: () => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(1200);
  const [height, setHeight] = useState(0);
  const [target, setTarget] = useState<Target | null>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const ro = new ResizeObserver(() => {
      setAvail(outer.clientWidth - 48);
      setHeight(inner.offsetHeight);
    });
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!dragging) setTarget(null);
  }, [dragging]);

  const width = WIDTH[device];
  const scale = Math.min(1, Math.max(0.2, avail / width));

  /** Offer a slot while dragging over something; refuse (no preventDefault) if it can't go there. */
  function over(e: DragEvent, slot: Path, mark: string) {
    e.stopPropagation();
    if (!dragging) return;
    if (canDrop(slot)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === "copy" ? "copy" : "move";
      if (target?.mark !== mark) setTarget({ slot, mark });
    } else if (target) setTarget(null);
  }

  const line = (edge: "top" | "bottom") => (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 z-20 h-1 rounded-full ${edge === "top" ? "-top-0.5" : "-bottom-0.5"}`}
      style={{ background: ACCENT }}
    />
  );

  function wrap(block: Block, path: Path, node: ReactNode): ReactNode {
    const selected = block.id === selectedId;
    const label = blockLabel(block.type);
    const last: Path = path.length === 1 ? [path[0] + 1] : [path[0], path[1], path[2] + 1];
    return (
      <div
        key={block.id}
        data-builder-block=""
        tabIndex={0}
        role="group"
        aria-label={`${label} block${selected ? ", selected" : ""}`}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData(DRAG_MIME, block.id);
          e.dataTransfer.effectAllowed = "move";
          onMoveStart(block.id, block.type);
        }}
        onDragEnd={(e) => {
          e.stopPropagation();
          onDragEnd();
        }}
        onDragOver={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const before = e.clientY < r.top + r.height / 2;
          over(e, before ? path : last, `${block.id}:${before ? "top" : "bottom"}`);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id);
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(block.id);
          } else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
            e.preventDefault();
            onAction(path, e.key === "ArrowUp" ? "up" : "down");
          } else if (e.key === "Delete") {
            e.preventDefault();
            onAction(path, "delete");
          }
        }}
        className={`relative cursor-pointer outline-offset-[-2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb] ${
          selected ? "outline outline-2 outline-[#2563eb]" : "hover:outline hover:outline-1 hover:outline-dashed hover:outline-[#2563eb]/60"
        }`}
      >
        {target?.mark === `${block.id}:top` ? line("top") : null}
        {node}
        {target?.mark === `${block.id}:bottom` ? line("bottom") : null}

        {selected ? (
          <div className="absolute left-0 top-0 z-30 flex items-center gap-0.5 rounded-br-lg px-1 py-0.5 text-white shadow" style={{ background: ACCENT }}>
            <span className="px-1.5 text-[11px] font-semibold">{label}</span>
            <button type="button" className={TOOL} aria-label="Move up (Alt+Up)" title="Move up" onClick={(e) => (e.stopPropagation(), onAction(path, "up"))}>
              <ArrowUp className="size-4" aria-hidden="true" />
            </button>
            <button type="button" className={TOOL} aria-label="Move down (Alt+Down)" title="Move down" onClick={(e) => (e.stopPropagation(), onAction(path, "down"))}>
              <ArrowDown className="size-4" aria-hidden="true" />
            </button>
            <button type="button" className={TOOL} aria-label="Duplicate" title="Duplicate" onClick={(e) => (e.stopPropagation(), onAction(path, "duplicate"))}>
              <Copy className="size-4" aria-hidden="true" />
            </button>
            <button type="button" className={TOOL} aria-label="Delete" title="Delete" onClick={(e) => (e.stopPropagation(), onAction(path, "delete"))}>
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {/* Explicit "into this column" targets while dragging, so empty columns can be filled too. */}
        {block.type === "columns" && dragging && dragging.type !== "columns" ? (
          <div className="relative z-20 grid gap-2 p-2" style={{ gridTemplateColumns: `repeat(${block.columns.length}, minmax(0, 1fr))` }}>
            {block.columns.map((col, c) => {
              const mark = `${block.id}:col${c}`;
              return (
                <div
                  key={c}
                  onDragOver={(e) => over(e, [path[0], c, col.length], mark)}
                  className={`grid h-12 place-items-center rounded-lg border-2 border-dashed text-xs font-medium ${
                    target?.mark === mark ? "border-[#2563eb] bg-[#2563eb]/10 text-[#2563eb]" : "border-border bg-card/80 text-muted-foreground"
                  }`}
                >
                  Add to column {c + 1}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={outerRef}
      className="min-w-0 flex-1 overflow-auto bg-secondary/50 p-6"
      onClick={() => onSelect(null)}
      onDragOver={() => target && setTarget(null)}
      onDrop={(e) => {
        e.preventDefault();
        if (target) onDrop(target.slot);
        setTarget(null);
      }}
    >
      <div className="mx-auto" style={{ width: width * scale, height: height * scale }}>
        <div
          ref={innerRef}
          className="origin-top-left overflow-hidden rounded-xl border border-border bg-background shadow-sm"
          style={{ width, transform: `scale(${scale})` }}
          // The canvas is a preview: links and forms must not navigate away from the builder.
          onClickCapture={(e) => (e.target as Element).closest("a") && e.preventDefault()}
          onSubmitCapture={(e) => e.preventDefault()}
        >
          <BlockPage webinar={webinar} page={page} blocks={blocks} mode="preview" wrap={preview ? undefined : wrap} />
          {preview ? null : (
            <div
              onDragOver={(e) => over(e, [blocks.length], "end")}
              className={`m-4 grid place-items-center rounded-xl border-2 border-dashed text-sm ${blocks.length ? "h-20" : "h-60"} ${
                target?.mark === "end" ? "border-[#2563eb] bg-[#2563eb]/10 text-[#2563eb]" : "border-border text-muted-foreground"
              }`}
            >
              {blocks.length ? "Drop a block here to add it at the end" : "Drag a block here, or click one on the left to add it"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
