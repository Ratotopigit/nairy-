"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { ACCESS_OPTIONS, ChoiceGroup, DELIVERY_OPTIONS } from "@/components/webinar/editor/SetupPanel";
import { WEBINAR_LIMITS, type Webinar } from "@/lib/webinars";

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; notes: string; access_type: Webinar["access_type"]; delivery_type: Webinar["delivery_type"] }) => void;
};

/**
 * Asks for a name (and optionally what it's about) before a webinar exists,
 * so nobody ends up with a list of "Untitled webinar"s.
 */
export function NewWebinarDialog({ open, busy, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [access, setAccess] = useState<Webinar["access_type"]>("free");
  const [delivery, setDelivery] = useState<Webinar["delivery_type"]>("live");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setNotes("");
    setAccess("free");
    setDelivery("live");
    const t = window.setTimeout(() => nameRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={() => !busy && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-webinar-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onCreate({ name: name.trim(), notes: notes.trim(), access_type: access, delivery_type: delivery });
        }}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-background p-6 shadow-2xl reg-rise sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="new-webinar-title" className="text-lg font-semibold tracking-[-0.02em]">Create a webinar</h2>
            <p className="mt-1 text-base text-muted-foreground">Answer three quick questions. You can change everything later.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" title="Close" className="grid size-11 shrink-0 place-items-center rounded-xl border border-border hover:bg-secondary">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-base font-semibold">Webinar name</span>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={WEBINAR_LIMITS.name}
            required
            placeholder="e.g. October AI marketing masterclass"
            className="mt-1.5 min-h-12 w-full rounded-xl border border-border-strong bg-card px-3.5 py-2.5 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Only you see this name in your list. It is also used as your first page headline, which you can change.
          </span>
        </label>

        <div className="mt-4 space-y-4">
          <ChoiceGroup legend="Free or paid" value={access} options={ACCESS_OPTIONS} onChange={setAccess} />
          <ChoiceGroup legend="Live or automated" value={delivery} options={DELIVERY_OPTIONS} onChange={setDelivery} />
        </div>

        <label className="mt-4 block">
          <span className="text-base font-semibold">
            What&apos;s it about? <span className="font-normal text-muted-foreground">(optional, only you see this)</span>
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={WEBINAR_LIMITS.notes}
            rows={3}
            placeholder="Who it's for, what you're selling at the end, anything you want to remember"
            className="mt-1.5 w-full resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-12 rounded-xl border border-border-strong px-5 py-3 text-base font-medium transition-colors hover:bg-secondary">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1d4ed8] disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Create webinar
          </button>
        </div>
      </form>
    </div>
  );
}
