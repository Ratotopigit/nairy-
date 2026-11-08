"use client";

import { useRef, useState } from "react";

const MAX = 100;

/**
 * Undo/redo stack. `set` with the same `mergeKey` as the previous change
 * replaces it instead of stacking, so typing a sentence is one undo step.
 * Methods return the new present so the caller can emit it synchronously.
 */
export function useHistory<T>(initial: T) {
  const h = useRef({ past: [] as T[], present: initial, future: [] as T[], key: "" });
  const [, render] = useState(0);
  const tick = () => render((n) => n + 1);

  return {
    present: h.current.present,
    canUndo: h.current.past.length > 0,
    canRedo: h.current.future.length > 0,
    set(next: T, mergeKey = "") {
      const s = h.current;
      const merge = mergeKey !== "" && mergeKey === s.key;
      h.current = { past: merge ? s.past : [...s.past, s.present].slice(-MAX), present: next, future: [], key: mergeKey };
      tick();
      return next;
    },
    undo(): T | null {
      const s = h.current;
      if (!s.past.length) return null;
      h.current = { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future], key: "" };
      tick();
      return h.current.present;
    },
    redo(): T | null {
      const s = h.current;
      if (!s.future.length) return null;
      h.current = { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1), key: "" };
      tick();
      return h.current.present;
    },
  };
}
