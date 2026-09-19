"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { listDeckHistory, type DeckSummary } from "@/lib/deck-history";

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenDeck: (projectId: string) => void;
  currentProjectId?: string;
};

/** Short, human relative time — exact dates are noise in a recents list. */
function whenLabel(iso: string) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString();
}

export function DeckHistory({ open, onClose, onOpenDeck, currentProjectId }: Props) {
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  const load = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setDecks([]);
      setState("error");
      return;
    }
    setState("loading");
    try {
      setDecks(await listDeckHistory(user.uid));
      setState("idle");
    } catch {
      setState("error");
    }
  }, []);

  // Loaded on open rather than on mount, so the list is fresh every time and
  // costs nothing for someone who never opens it.
  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[10vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[70vh] w-full max-w-lg overflow-hidden rounded-[12px] border border-border bg-card shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Past presentations"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-[12px] font-medium uppercase tracking-[0.22em] text-foreground">
            Past presentations
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history"
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[calc(70vh-53px)] overflow-y-auto">
          {state === "loading" ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading your presentations…</p>
          ) : state === "error" ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Could not load your presentations. Check you are still signed in, then try again.
            </p>
          ) : decks.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No saved presentations yet. Generate one and it will show up here.
            </p>
          ) : (
            <ul>
              {decks.map((deck) => (
                <li key={deck.projectId}>
                  <button
                    type="button"
                    onClick={() => onOpenDeck(deck.projectId)}
                    className="flex w-full items-baseline justify-between gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground">{deck.title}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {deck.slideCount} slide{deck.slideCount === 1 ? "" : "s"}
                        {deck.purpose ? ` · ${deck.purpose}` : ""}
                        {deck.projectId === currentProjectId ? " · open now" : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {whenLabel(deck.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
