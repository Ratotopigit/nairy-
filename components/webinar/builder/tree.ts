/**
 * Pure edits on a page's block list. A path is [i] for a top-level block or
 * [i, column, j] for a block inside a columns block. A "slot" uses the same
 * shape to mean "insert before this position" (j may equal the list length).
 * Type-only imports, so node --test can load this file directly.
 */
import type { Block, LeafBlock } from "@/lib/page-blocks";

export type Path = [number] | [number, number, number];

export function getAt(blocks: Block[], path: Path): Block | undefined {
  const top = blocks[path[0]];
  if (path.length === 1) return top;
  return top?.type === "columns" ? top.columns[path[1]]?.[path[2]] : undefined;
}

export function findPath(blocks: Block[], id: string): Path | null {
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    if (b.id === id) return [i];
    if (b.type === "columns") {
      for (let c = 0; c < b.columns.length; c += 1) {
        const j = b.columns[c].findIndex((x) => x.id === id);
        if (j >= 0) return [i, c, j];
      }
    }
  }
  return null;
}

/** Returns null when the move is not allowed (columns inside columns). */
export function insertAt(blocks: Block[], slot: Path, block: Block): Block[] | null {
  if (slot.length === 1) return [...blocks.slice(0, slot[0]), block, ...blocks.slice(slot[0])];
  const [i, c, j] = slot;
  const host = blocks[i];
  if (block.type === "columns" || host?.type !== "columns" || !host.columns[c]) return null;
  const columns = host.columns.map((col, k) => (k === c ? [...col.slice(0, j), block as LeafBlock, ...col.slice(j)] : col));
  return blocks.map((b, k) => (k === i ? { ...host, columns } : b));
}

/** Removes the block with this exact object identity, wherever it is. */
export function removeRef(blocks: Block[], ref: Block): Block[] {
  return blocks
    .filter((b) => b !== ref)
    .map((b) => (b.type === "columns" && b.columns.some((col) => col.includes(ref as LeafBlock)) ? { ...b, columns: b.columns.map((col) => col.filter((x) => x !== ref)) } : b));
}

export function updateAt(blocks: Block[], path: Path, patch: Partial<Block>): Block[] {
  const target = getAt(blocks, path);
  if (!target) return blocks;
  const next = { ...target, ...patch } as Block;
  if (path.length === 1) return blocks.map((b, k) => (k === path[0] ? next : b));
  const host = blocks[path[0]];
  if (host.type !== "columns") return blocks;
  const columns = host.columns.map((col, c) => (c === path[1] ? col.map((x, j) => (j === path[2] ? (next as LeafBlock) : x)) : col));
  return blocks.map((b, k) => (k === path[0] ? { ...host, columns } : b));
}

/**
 * Insert a copy at the slot (whose indexes refer to the list before the move),
 * then drop the original by identity, so no index needs adjusting.
 */
export function moveTo(blocks: Block[], from: Path, slot: Path): Block[] | null {
  const block = getAt(blocks, from);
  if (!block) return null;
  const inserted = insertAt(blocks, slot, { ...block } as Block);
  return inserted && removeRef(inserted, block);
}

/** Move up/down by one; at the edge of a column the block steps out of the columns block. */
export function nudge(blocks: Block[], path: Path, dir: -1 | 1): Block[] | null {
  if (path.length === 1) {
    const to = path[0] + dir;
    if (to < 0 || to >= blocks.length) return null;
    return moveTo(blocks, path, [dir === 1 ? to + 1 : to]);
  }
  const [i, c, j] = path;
  const host = blocks[i];
  if (host.type !== "columns") return null;
  const to = j + dir;
  if (to < 0) return moveTo(blocks, path, [i]);
  if (to >= host.columns[c].length) return moveTo(blocks, path, [i + 1]);
  return moveTo(blocks, path, [i, c, dir === 1 ? to + 1 : to]);
}

/** Total blocks, counting the ones inside columns. */
export function slotCount(blocks: Block[], slot: Path): number {
  if (slot.length === 1) return blocks.length;
  const host = blocks[slot[0]];
  return host?.type === "columns" ? host.columns[slot[1]]?.length ?? 0 : 0;
}

/** Same container (top level, or the same column of the same block)? */
export function sameList(a: Path, b: Path): boolean {
  return a.length === b.length && (a.length === 1 || (a[0] === b[0] && a[1] === b[1]));
}
