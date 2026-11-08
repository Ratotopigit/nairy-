"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, Eye, EyeOff, LayoutTemplate, Monitor, PanelLeftClose, PanelLeftOpen, PanelRight, Redo2, Settings, Smartphone, Undo2, X } from "lucide-react";
import { allLeaves, BLOCK_CATALOG, BLOCK_LIMITS, coerceBlocks, createBlock, newBlockId, starterBlocks, STORED_PAGES_MAX_BYTES, storedPagesBytes, type Block, type BlockType, type PageId } from "@/lib/page-blocks";
import type { Webinar } from "@/lib/webinars";
import { Canvas, type BlockAction } from "./Canvas";
import { Inspector } from "./Inspector";
import { Palette } from "./Palette";
import { fillFromWebinar, templatesFor } from "./templates";
import { findPath, getAt, insertAt, moveTo, nudge, removeRef, sameList, slotCount, updateAt, type Path } from "./tree";
import { useHistory } from "./useHistory";

type Props = {
  webinar: Webinar;
  page: PageId;
  open: boolean;
  /** Called with the new blocks on every change; the editor's autosave persists them. */
  onChange: (blocks: Block[]) => void;
  onClose: () => void;
  /** Surface upload or other errors in the editor's notice bar. */
  onError?: (message: string) => void;
};

const PAGE_NAMES: Record<PageId, string> = { registration: "registration page", thanks: "thank-you page", replay: "replay page", watch: "watch room" };

const BAR_BTN =
  "inline-flex h-11 items-center gap-1.5 rounded-lg border border-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb] disabled:opacity-40 disabled:hover:bg-transparent";

/** Below Tailwind's md the palette and inspector are overlay drawers. */
const wide = () => window.matchMedia("(min-width: 768px)").matches;

const htmlIn = (blocks: Block[]) => allLeaves(blocks).filter((b) => b.type === "html").length;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export function PageBuilder(props: Props) {
  if (!props.open) return null;
  // Remounted on every open, so the history starts fresh from the stored page.
  return <Builder key={props.page} {...props} />;
}

/** New ids for a copy (and for every block inside a copied columns block). */
function cloneBlock(b: Block): Block {
  return b.type === "columns"
    ? { ...b, id: newBlockId(), columns: b.columns.map((c) => c.map((x) => ({ ...x, id: newBlockId() }))) }
    : { ...b, id: newBlockId() };
}

function Builder({ webinar, page, onChange, onClose, onError }: Props) {
  const stored = webinar.pages[page];
  const history = useHistory<Block[]>(stored?.length ? stored : coerceBlocks(fillFromWebinar(starterBlocks(page), webinar, page)));
  const blocks = history.present;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ type: BlockType; id?: string } | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [preview, setPreview] = useState(false);
  const [panel, setPanel] = useState(() => typeof window === "undefined" || wide());
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [dialog, setDialog] = useState<"templates" | "settings" | null>(null);
  const [status, setStatus] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const edited = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const allowed = new Set(BLOCK_CATALOG.filter((c) => c.pages.includes(page)).map((c) => c.type));
  const pageFull = blocks.length >= BLOCK_LIMITS.blocksPerPage;
  const selectedPath = selectedId ? findPath(blocks, selectedId) : null;
  const selected = selectedPath ? getAt(blocks, selectedPath) : undefined;
  const htmlCount = htmlIn(blocks);

  const announce = (message: string) => setStatus((s) => (s === message ? `${message}.` : message));

  /** The only way blocks change: bounded by coerceBlocks, recorded for undo, then handed to autosave. */
  function commit(next: Block[], message = "", mergeKey = ""): boolean {
    const clean = coerceBlocks(next);
    // The whole webinar is one Firestore document (1 MiB max), so the pages stay well under it.
    if (storedPagesBytes({ ...webinar.pages, [page]: clean }) > STORED_PAGES_MAX_BYTES) {
      onError?.("That change would make this webinar's pages too big to save. Remove some blocks or shorten the HTML or text first.");
      return false;
    }
    edited.current = true;
    history.set(clean, mergeKey);
    onChange(clean);
    if (message) announce(message);
    return true;
  }

  function undo() {
    const s = history.undo();
    if (s) ((edited.current = true), onChange(s), announce("Undone"));
  }
  function redo() {
    const s = history.redo();
    if (s) ((edited.current = true), onChange(s), announce("Redone"));
  }

  /** Done or Escape. An empty page opens showing starter blocks; keep them even if the host changed nothing. */
  function close() {
    if (!stored?.length && !edited.current) onChange(blocks);
    onClose();
  }

  const roomAt = (slot: Path) => slotCount(blocks, slot) < (slot.length === 1 ? BLOCK_LIMITS.blocksPerPage : BLOCK_LIMITS.blocksPerColumn);

  /** Where a clicked tile lands: after the selected block (inside its column if it's in one), else at the end. */
  function appendSlot(type: BlockType): Path {
    if (!selectedPath) return [blocks.length];
    return selectedPath.length === 3 && type !== "columns" ? [selectedPath[0], selectedPath[1], selectedPath[2] + 1] : [selectedPath[0] + 1];
  }

  /** Fits somewhere on the page: the palette disables only tiles that don't. */
  const canAdd = (type: BlockType) =>
    allowed.has(type) &&
    !(type === "html" && htmlCount >= BLOCK_LIMITS.htmlPerPage) &&
    (!pageFull || (type !== "columns" && blocks.some((b) => b.type === "columns" && b.columns.some((c) => c.length < BLOCK_LIMITS.blocksPerColumn))));

  /** Can the current drag land at this slot? */
  function canDrop(slot: Path): boolean {
    if (!dragging) return false;
    const from = dragging.id ? findPath(blocks, dragging.id) : null;
    if (slot.length === 3 && dragging.type === "columns") return false;
    if (!from && dragging.type === "html" && htmlCount >= BLOCK_LIMITS.htmlPerPage) return false;
    // Moving within the same list never changes its size.
    if (from && sameList(from, slot)) return true;
    const max = slot.length === 1 ? BLOCK_LIMITS.blocksPerPage : BLOCK_LIMITS.blocksPerColumn;
    return slotCount(blocks, slot) < max;
  }

  function dropAt(slot: Path) {
    const drag = dragging;
    setDragging(null);
    if (!drag || !canDrop(slot)) return;
    if (drag.id) {
      const from = findPath(blocks, drag.id);
      const next = from && moveTo(blocks, from, slot);
      if (next) commit(next, "Moved");
      return;
    }
    const block = createBlock(drag.type, page);
    const next = insertAt(blocks, slot, block);
    if (next && commit(next, "Block added")) setSelectedId(block.id);
  }

  function append(type: BlockType) {
    const slot = appendSlot(type);
    if (!canAdd(type) || !roomAt(slot)) {
      announce(type === "html" && htmlCount >= BLOCK_LIMITS.htmlPerPage ? "A page can hold 3 HTML blocks" : slot.length === 1 ? "This page is full" : "This column is full");
      return;
    }
    const block = createBlock(type, page);
    const next = insertAt(blocks, slot, block);
    if (next && commit(next, "Block added")) {
      setSelectedId(block.id);
      // On a phone the palette covers the canvas; get it out of the way.
      if (!wide()) setPanel(false);
    }
  }

  function act(path: Path, action: BlockAction) {
    const block = getAt(blocks, path);
    if (!block) return;
    if (action === "delete") {
      commit(removeRef(blocks, block), "Deleted");
      setSelectedId(null);
      // Keep keyboard users inside the builder rather than on <body>.
      rootRef.current?.focus();
    } else if (action === "duplicate") {
      if (!roomAt(path)) return announce("No room for a copy here");
      if (htmlCount + htmlIn([block]) > BLOCK_LIMITS.htmlPerPage) return announce("A page can hold 3 HTML blocks");
      const copy = cloneBlock(block);
      const slot: Path = path.length === 1 ? [path[0] + 1] : [path[0], path[1], path[2] + 1];
      const next = insertAt(blocks, slot, copy);
      if (next && commit(next, "Duplicated")) setSelectedId(copy.id);
    } else {
      const next = nudge(blocks, path, action === "up" ? -1 : 1);
      if (next && (path.length === 1 || next.length <= BLOCK_LIMITS.blocksPerPage)) {
        if (commit(next, "Moved")) setSelectedId(block.id);
      } else announce("Can't move it further");
    }
  }

  function applyTemplate(make: () => Block[]) {
    if (blocks.length && !window.confirm("Replace everything on this page with the new layout? You can undo this.")) return;
    if (!commit(fillFromWebinar(make(), webinar, page), "Layout replaced")) return;
    setSelectedId(null);
    setDialog(null);
  }

  function backToTemplate() {
    if (!window.confirm(`Go back to the template for the ${PAGE_NAMES[page]}? The blocks you built here are removed.`)) return;
    onChange([]);
    onClose();
  }

  // Focus: move in on open, restore on close.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    return () => before?.focus?.();
  }, []);

  useEffect(() => {
    if (dialog) dialogRef.current?.focus();
  }, [dialog]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      // Escape in a field (a select's dropdown, an IME) belongs to the field, not the builder.
      if (!dialog && (e.target as HTMLElement).matches("input, textarea, select")) return;
      e.preventDefault();
      if (dialog) setDialog(null);
      else if (preview) setPreview(false);
      else if (!wide() && (panel || (inspectorOpen && selected))) (setPanel(false), setInspectorOpen(false));
      else close();
      return;
    }
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (e.key === "Tab") {
      // Trap focus in the builder, or in the open dialog.
      const box = dialog ? dialogRef.current : rootRef.current;
      const items = box ? Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null) : [];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && (at === first || at === box)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      } else if (box && !box.contains(at)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Page builder: ${PAGE_NAMES[page]}`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[70] flex flex-col bg-background text-foreground outline-none"
    >
      <header className="flex flex-wrap items-center gap-1 border-b border-border bg-card px-3 py-2">
        <h2 className="mr-auto truncate px-1 text-base font-semibold">Edit the {PAGE_NAMES[page]}</h2>
        {preview ? null : (
          <>
            <button
              type="button"
              className={BAR_BTN}
              onClick={() => {
                if (!panel && !wide()) setInspectorOpen(false);
                setPanel(!panel);
              }}
              aria-pressed={!panel}
              title={panel ? "Hide the list of blocks" : "Show the list of blocks"}
            >
              {panel ? <PanelLeftClose className="size-5" aria-hidden="true" /> : <PanelLeftOpen className="size-5" aria-hidden="true" />}
              {panel ? "Hide blocks" : "Blocks"}
            </button>
            <button type="button" className={BAR_BTN} onClick={() => setDialog("templates")} title="Start again from a ready-made layout">
              <LayoutTemplate className="size-5" aria-hidden="true" /> <span className="hidden sm:inline">Layouts</span>
              <span className="sr-only sm:hidden">Layouts</span>
            </button>
            <button type="button" className={BAR_BTN} onClick={() => setDialog("settings")} title="Page settings">
              <Settings className="size-5" aria-hidden="true" /> <span className="hidden sm:inline">Settings</span>
              <span className="sr-only sm:hidden">Settings</span>
            </button>
            <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
            <button type="button" className={BAR_BTN} onClick={undo} disabled={!history.canUndo} aria-label="Undo (Ctrl+Z)" title="Undo your last change (Ctrl+Z)">
              <Undo2 className="size-5" aria-hidden="true" />
              <span className="hidden sm:inline" aria-hidden="true">Undo</span>
            </button>
            <button type="button" className={BAR_BTN} onClick={redo} disabled={!history.canRedo} aria-label="Redo (Ctrl+Shift+Z)" title="Redo (Ctrl+Shift+Z)">
              <Redo2 className="size-5" aria-hidden="true" />
              <span className="hidden sm:inline" aria-hidden="true">Redo</span>
            </button>
          </>
        )}
        <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
        <div className="inline-flex rounded-lg border border-border p-0.5" role="group" aria-label="Page width">
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              aria-label={d === "desktop" ? "Desktop width" : "Phone width"}
              title={d === "desktop" ? "See it on a computer screen" : "See it on a phone"}
              onClick={() => setDevice(d)}
              className={`inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb] ${device === d ? "bg-[#2563eb] text-white" : "hover:bg-secondary"}`}
            >
              {d === "desktop" ? <Monitor className="size-5" aria-hidden="true" /> : <Smartphone className="size-5" aria-hidden="true" />}
              <span className="hidden sm:inline" aria-hidden="true">{d === "desktop" ? "Desktop" : "Phone"}</span>
            </button>
          ))}
        </div>
        <button type="button" className={BAR_BTN} onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
          {preview ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />} {preview ? "Back to editing" : "Preview"}
        </button>
        {preview ? null : (
          <button
            type="button"
            className={`${BAR_BTN} md:hidden`}
            disabled={!selected}
            aria-pressed={inspectorOpen && Boolean(selected)}
            onClick={() => {
              if (!inspectorOpen) setPanel(false);
              setInspectorOpen(!inspectorOpen);
            }}
          >
            <PanelRight className="size-5" aria-hidden="true" />
            Edit block
          </button>
        )}
        <button type="button" onClick={close} title="Close the builder. Your changes are saved." className="ml-1 inline-flex h-11 items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 text-base font-semibold text-white hover:bg-[#1d4ed8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]">
          <Check className="size-5" aria-hidden="true" /> Done
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {panel && !preview ? (
          <Palette
            page={page}
            full={pageFull}
            canAdd={canAdd}
            onAdd={append}
            onDragStart={(type) => setDragging({ type })}
            onDragEnd={() => setDragging(null)}
          />
        ) : null}
        <Canvas
          webinar={webinar}
          page={page}
          blocks={blocks}
          selectedId={preview ? null : selectedId}
          preview={preview}
          device={device}
          dragging={dragging}
          canDrop={canDrop}
          onSelect={setSelectedId}
          onDrop={dropAt}
          onAction={act}
          onMoveStart={(id, type) => setDragging({ id, type })}
          onDragEnd={() => setDragging(null)}
        />
        {selected && selectedPath && !preview ? (
          <Inspector
            key={selected.id}
            block={selected}
            webinar={webinar}
            page={page}
            drawerOpen={inspectorOpen}
            onPatch={(patch, field) => commit(updateAt(blocks, selectedPath, patch), "", field)}
            onClose={() => setSelectedId(null)}
            onError={(m) => onError?.(m)}
          />
        ) : null}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      {dialog ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={() => setDialog(null)}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="builder-dialog-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl outline-none"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="builder-dialog-title" className="text-lg font-semibold">
                {dialog === "templates" ? "Ready-made layouts" : "Page settings"}
              </h2>
              <button type="button" onClick={() => setDialog(null)} aria-label="Close" title="Close" className="grid size-11 place-items-center rounded-lg hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb]">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            {dialog === "templates" ? (
              <TemplateList page={page} onPick={applyTemplate} />
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">
                  This {PAGE_NAMES[page]} is built from blocks. Going back to the template shows the design you picked in the editor, with its text and images, and removes these blocks.
                </p>
                <button
                  type="button"
                  onClick={backToTemplate}
                  className="inline-flex min-h-11 items-center rounded-xl border border-border-strong px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb]"
                >
                  Use template instead
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TemplateList({ page, onPick }: { page: PageId; onPick: (make: () => Block[]) => void }): ReactNode {
  return (
    <ul className="mt-3 grid gap-2">
      {templatesFor(page).map((t) => (
        <li key={t.name}>
          <button
            type="button"
            onClick={() => onPick(t.make)}
            className="min-h-14 w-full rounded-xl border border-border-strong bg-card px-4 py-3 text-left transition-colors hover:border-[#2563eb]/60 hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb]"
          >
            <span className="block text-sm font-semibold">{t.name}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{t.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
