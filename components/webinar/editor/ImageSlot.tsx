"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ImagePlus, Loader2, Sparkles, Search, Trash2 } from "lucide-react";
import { ImageError, uploadWebinarImage, type ImageKind } from "@/lib/webinar-images";

type Props = {
  webinarId: string;
  kind: ImageKind;
  label: string;
  /** What this image does on the page, so no control is a mystery. */
  hint: ReactNode;
  url: string;
  focusX?: number;
  focusY?: number;
  onChange: (url: string) => void;
  onFocus?: (x: number, y: number) => void;
  /** Stock photo search (hero only). */
  onFind?: () => void;
  onSuggest?: () => void;
  suggesting?: boolean;
  onError: (message: string) => void;
};

const BTN =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-60";

/**
 * One image the host can upload, replace, remove and re-frame. The crop
 * control is a focal point: click the photo where the important part is, and
 * every template keeps that spot in frame however it crops the image.
 */
export function ImageSlot({ webinarId, kind, label, hint, url, focusX = 50, focusY = 50, onChange, onFocus, onFind, onSuggest, suggesting, onError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState(false);
  const dragging = useRef(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      onChange(await uploadWebinarImage(webinarId, file, kind));
      setBroken(false);
    } catch (e) {
      onError(e instanceof ImageError ? e.message : "The image couldn't be uploaded. Please try again.");
      if (!(e instanceof ImageError)) console.error("image upload failed:", e);
    } finally {
      setBusy(false);
    }
  }

  function setFocusFrom(e: ReactPointerEvent) {
    const el = frameRef.current;
    if (!el || !onFocus) return;
    const r = el.getBoundingClientRect();
    onFocus(
      Math.round(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))),
      Math.round(Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100))),
    );
  }

  const has = Boolean(url) && !broken;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold">{label}</p>
        {has && onFocus ? <span className="text-[11px] text-muted-foreground">Click the photo to set the focus</span> : null}
      </div>
      <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{hint}</p>

      <div className="mt-3">
        {has ? (
          <div
            ref={frameRef}
            className={`relative inline-block max-w-full overflow-hidden rounded-xl border border-border ${
              kind === "logo" ? "bg-[conic-gradient(#eee_25%,#fff_0_50%,#eee_0_75%,#fff_0)] bg-[length:14px_14px]" : "bg-secondary"
            } ${onFocus ? "cursor-crosshair touch-none" : ""}`}
            onPointerDown={(e) => {
              if (!onFocus) return;
              dragging.current = true;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setFocusFrom(e);
            }}
            onPointerMove={(e) => dragging.current && setFocusFrom(e)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${label} preview`}
              onError={() => setBroken(true)}
              draggable={false}
              className={`block h-auto w-auto max-w-full select-none ${kind === "logo" ? "max-h-20 p-2" : "max-h-52"}`}
            />
            {onFocus ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.5)]"
                style={{ left: `${focusX}%`, top: `${focusY}%` }}
              >
                <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
              </span>
            ) : null}
          </div>
        ) : (
          <div className="grid h-24 place-items-center rounded-xl border border-dashed border-border-strong text-xs text-muted-foreground">
            {broken ? "That image couldn't load. Replace it below." : kind === "logo" ? "No logo yet" : "No image yet"}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button type="button" className={BTN} disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
          {has ? "Replace" : "Upload"}
        </button>
        {onFind ? (
          <button type="button" className={BTN} onClick={onFind}>
            <Search className="size-3.5" />
            Find photos
          </button>
        ) : null}
        {onSuggest ? (
          <button type="button" className={BTN} onClick={onSuggest} disabled={suggesting}>
            {suggesting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            Suggest one
          </button>
        ) : null}
        {url ? (
          <button
            type="button"
            className={`${BTN} text-muted-foreground hover:text-red-700`}
            onClick={() => {
              onChange("");
              setBroken(false);
            }}
          >
            <Trash2 className="size-3.5" />
            Remove
          </button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
