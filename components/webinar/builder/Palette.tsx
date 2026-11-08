"use client";

import {
  CalendarPlus,
  ClipboardList,
  Code,
  Columns3,
  Heading,
  Image as ImageIcon,
  Link2,
  List,
  Minus,
  MousePointerClick,
  MonitorPlay,
  MoveVertical,
  Share2,
  Timer,
  Type,
  UserRound,
  Video,
  type LucideIcon,
} from "lucide-react";
import { BLOCK_CATALOG, type BlockType, type PageId } from "@/lib/page-blocks";

export const BLOCK_ICONS: Record<BlockType, LucideIcon> = {
  columns: Columns3,
  heading: Heading,
  text: Type,
  image: ImageIcon,
  form: ClipboardList,
  timer: Timer,
  video: Video,
  button: MousePointerClick,
  presenter: UserRound,
  list: List,
  "session-link": Link2,
  share: Share2,
  calendar: CalendarPlus,
  spacer: MoveVertical,
  divider: Minus,
  html: Code,
  "watch-player": MonitorPlay,
};

export const blockLabel = (type: BlockType) => BLOCK_CATALOG.find((c) => c.type === type)?.label ?? type;

/** Data type for drags that start in the builder, so other drops ignore them. */
export const DRAG_MIME = "application/x-webinar-block";

export function Palette({
  page,
  full,
  canAdd,
  onAdd,
  onDragStart,
  onDragEnd,
}: {
  page: PageId;
  /** The page holds the maximum number of blocks. */
  full: boolean;
  /** False only when this type fits nowhere on the page (no room left, HTML cap). */
  canAdd: (type: BlockType) => boolean;
  onAdd: (type: BlockType) => void;
  onDragStart: (type: BlockType) => void;
  onDragEnd: () => void;
}) {
  const items = BLOCK_CATALOG.filter((c) => c.pages.includes(page));
  return (
    <aside
      aria-label="Blocks"
      className="absolute inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] shrink-0 flex-col overflow-y-auto border-r border-border bg-card p-4 shadow-xl md:static md:z-auto md:max-w-none md:shadow-none"
    >
      <h2 className="text-lg font-semibold">Blocks</h2>
      <p className="mt-1 text-sm text-muted-foreground">Drag a block onto the page, or click it to add.</p>
      {full ? <p className="mt-2 text-sm text-red-700">This page is full. Delete a block to add a new one.</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map(({ type, label }) => {
          const Icon = BLOCK_ICONS[type];
          const off = !canAdd(type);
          return (
            <button
              key={type}
              type="button"
              disabled={off}
              draggable={!off}
              onClick={() => onAdd(type)}
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_MIME, type);
                e.dataTransfer.effectAllowed = "copy";
                onDragStart(type);
              }}
              onDragEnd={onDragEnd}
              className="flex min-h-[88px] cursor-grab flex-col items-center justify-center gap-2 rounded-xl border border-border-strong bg-card px-2 py-3 text-center text-sm font-medium transition-colors hover:border-[#2563eb]/50 hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon className="size-6 text-[#2563eb]" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
