"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, ImagePlus, Loader2, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { Field, INPUT } from "@/components/webinar/editor/controls";
import { isHex } from "@/lib/color";
import { BLOCK_LIMITS, createBlock, safeHttpsUrl, type Block, type BlockStyle, type LeafBlock, type PageId } from "@/lib/page-blocks";
import { ImageError, uploadWebinarImage, type ImageKind } from "@/lib/webinar-images";
import { isValidVideoUrl, type Webinar } from "@/lib/webinars";
import { blockLabel } from "./Palette";

type Patch = (patch: Partial<Block>, field: string) => void;

const BTN =
  "inline-flex items-center gap-1.5 min-h-11 rounded-xl border border-border-strong bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb] disabled:opacity-50";

export function Inspector({
  block,
  webinar,
  page,
  drawerOpen,
  onPatch,
  onClose,
  onError,
}: {
  block: Block;
  webinar: Webinar;
  page: PageId;
  /** Below md the inspector is an overlay drawer, shown only while this is on. */
  drawerOpen: boolean;
  /** `field` groups keystrokes into one undo step. */
  onPatch: Patch;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const set = (field: string, value: unknown) => onPatch({ [field]: value } as Partial<Block>, `${block.id}:${field}`);
  const style = (patch: Partial<BlockStyle>, field: string) => onPatch({ style: { ...block.style, ...patch } }, `${block.id}:style.${field}`);

  return (
    <aside
      aria-label={`${blockLabel(block.type)} settings`}
      className={`${drawerOpen ? "flex" : "hidden"} absolute inset-y-0 right-0 z-40 w-80 max-w-[85vw] shrink-0 flex-col overflow-y-auto border-l border-border bg-card shadow-xl md:static md:z-auto md:flex md:max-w-none md:shadow-none`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">{blockLabel(block.type)}</h2>
        <button type="button" onClick={onClose} aria-label="Close block settings" title="Close block settings" className="grid size-11 place-items-center rounded-md hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb]">
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-4 p-4">
        <Fields block={block} webinar={webinar} page={page} set={set} onPatch={onPatch} onError={onError} />
        <hr className="border-border" />
        <h3 className="text-base font-semibold">Look</h3>
        <div>
          <p className="text-sm font-semibold">Align</p>
          <div className="mt-1.5 inline-flex rounded-lg border border-border p-0.5" role="group" aria-label="Align">
            {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([a, Icon]) => (
              <button
                key={a}
                type="button"
                aria-label={`Align ${a}`}
                title={`Align ${a}`}
                aria-pressed={block.style.align === a}
                onClick={() => style({ align: a }, "align")}
                className={`grid size-10 place-items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb] ${block.style.align === a ? "bg-[#2563eb] text-white" : "hover:bg-secondary"}`}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
        <ColorRow label="Background" value={block.style.bg} onChange={(v) => style({ bg: v }, "bg")} />
        <ColorRow label="Text colour" value={block.style.color} onChange={(v) => style({ color: v }, "color")} />
        <Range label="Padding" unit="px" min={0} max={160} step={4} value={block.style.pad} onChange={(v) => style({ pad: v }, "pad")} />
      </div>
    </aside>
  );
}

function Fields({ block, webinar, page, set, onPatch, onError }: { block: Block; webinar: Webinar; page: PageId; set: (field: string, value: unknown) => void; onPatch: Patch; onError: (m: string) => void }) {
  switch (block.type) {
    case "heading":
      return (
        <>
          <Field label="Heading">
            <textarea value={block.text} maxLength={BLOCK_LIMITS.heading} rows={2} onChange={(e) => set("text", e.target.value)} className={`${INPUT} resize-none`} />
          </Field>
          <Field label="Size">
            <select value={block.level} onChange={(e) => set("level", Number(e.target.value))} className={INPUT}>
              <option value={1}>Large (H1)</option>
              <option value={2}>Medium (H2)</option>
              <option value={3}>Small (H3)</option>
            </select>
          </Field>
        </>
      );
    case "text":
      return (
        <Field label="Text" hint={`${block.text.length} / ${BLOCK_LIMITS.text}`}>
          <textarea value={block.text} maxLength={BLOCK_LIMITS.text} rows={6} onChange={(e) => set("text", e.target.value)} className={`${INPUT} resize-y`} />
        </Field>
      );
    case "image":
      return (
        <>
          <ImageField webinarId={webinar.id} kind="hero" label="Image" url={block.url} onChange={(v) => set("url", v)} onError={onError} />
          <Field label="Description for screen readers">
            <input value={block.alt} maxLength={BLOCK_LIMITS.alt} onChange={(e) => set("alt", e.target.value)} className={INPUT} />
          </Field>
          <Range label="Width" unit="%" min={20} max={100} step={5} value={block.width} onChange={(v) => set("width", v)} />
        </>
      );
    case "video":
      return (
        <>
          <Field label="Video" hint={block.source === "custom" ? undefined : `Uses the ${block.source === "replay" ? "replay link" : "video link"} from the webinar's settings.`}>
            <select value={block.source} onChange={(e) => set("source", e.target.value)} className={INPUT}>
              <option value="webinar">The webinar's video</option>
              <option value="replay">The replay</option>
              <option value="custom">Another video</option>
            </select>
          </Field>
          {block.source === "custom" ? (
            <UrlField
              label="YouTube or Vimeo link"
              value={block.url}
              check={isValidVideoUrl}
              error="Paste a YouTube or Vimeo link."
              onChange={(v) => set("url", v)}
            />
          ) : null}
        </>
      );
    case "button":
      return (
        <>
          <Field label="Label">
            <input value={block.label} maxLength={BLOCK_LIMITS.label} onChange={(e) => set("label", e.target.value)} className={INPUT} />
          </Field>
          <Field label="When clicked" hint={block.action === "payment" ? "Opens the payment link from the webinar's settings." : undefined}>
            <select value={block.action} onChange={(e) => set("action", e.target.value)} className={INPUT}>
              {/* Only the registration page has a form; an old block keeps its value visible. */}
              {page === "registration" || block.action === "form" ? <option value="form">Scroll to the sign-up form</option> : null}
              <option value="payment">Open the payment page</option>
              <option value="link">Open a link</option>
            </select>
          </Field>
          {block.action === "link" ? <UrlField label="Link" value={block.href} onChange={(v) => set("href", v)} /> : null}
        </>
      );
    case "form":
      return (
        <Field label="Button label" hint="Paid webinars show the checkout button here instead of the form.">
          <input value={block.button} maxLength={BLOCK_LIMITS.label} onChange={(e) => set("button", e.target.value)} className={INPUT} />
        </Field>
      );
    case "timer":
      return (
        <>
          <Field label="Label">
            <input value={block.label} maxLength={BLOCK_LIMITS.label} onChange={(e) => set("label", e.target.value)} className={INPUT} />
          </Field>
          <Field label="Count down to">
            <select value={block.target} onChange={(e) => set("target", e.target.value)} className={INPUT}>
              <option value="session">The next session</option>
              <option value="replay-expiry">When the replay closes</option>
              <option value="custom">A date I choose</option>
            </select>
          </Field>
          {block.target === "custom" ? (
            <Field label="Date and time" hint="In your computer's time zone.">
              <input
                type="datetime-local"
                value={toLocalInput(block.date)}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  set("date", e.target.value && !Number.isNaN(d.getTime()) ? d.toISOString() : "");
                }}
                className={INPUT}
              />
            </Field>
          ) : null}
        </>
      );
    case "presenter":
      return (
        <>
          <p className="text-[11px] leading-4 text-muted-foreground">Leave a field empty to use the presenter details from the webinar&apos;s settings.</p>
          <Field label="Name">
            <input value={block.name} placeholder={webinar.presenter_name} maxLength={BLOCK_LIMITS.name} onChange={(e) => set("name", e.target.value)} className={INPUT} />
          </Field>
          <Field label="Title">
            <input value={block.title} placeholder={webinar.presenter_title} maxLength={BLOCK_LIMITS.name} onChange={(e) => set("title", e.target.value)} className={INPUT} />
          </Field>
          <Field label="Bio">
            <textarea value={block.bio} placeholder={webinar.host_bio} maxLength={BLOCK_LIMITS.bio} rows={4} onChange={(e) => set("bio", e.target.value)} className={`${INPUT} resize-y`} />
          </Field>
          <ImageField webinarId={webinar.id} kind="portrait" label="Photo" url={block.photo} onChange={(v) => set("photo", v)} onError={onError} />
        </>
      );
    case "list":
      return (
        <>
          <Field label="Marker">
            <select value={block.marker} onChange={(e) => set("marker", e.target.value)} className={INPUT}>
              <option value="tick">Ticks</option>
              <option value="number">Numbers</option>
              <option value="dot">Bullets</option>
            </select>
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Items</legend>
            {block.items.map((item, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  value={item}
                  aria-label={`Item ${i + 1}`}
                  maxLength={BLOCK_LIMITS.listItem}
                  onChange={(e) => set("items", block.items.map((x, k) => (k === i ? e.target.value : x)))}
                  className={INPUT}
                />
                <button
                  type="button"
                  aria-label={`Remove item ${i + 1}`}
                  title="Remove this item"
                  onClick={() => onPatch({ items: block.items.filter((_, k) => k !== i) } as Partial<Block>, "")}
                  className="grid size-11 shrink-0 place-items-center rounded-xl border border-border hover:bg-secondary hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb]"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className={BTN}
              disabled={block.items.length >= BLOCK_LIMITS.listItems}
              onClick={() => onPatch({ items: [...block.items, "New point"] } as Partial<Block>, "")}
            >
              <Plus className="size-3.5" /> Add item
            </button>
          </fieldset>
        </>
      );
    case "spacer":
      return <Range label="Height" unit="px" min={4} max={400} step={4} value={block.height} onChange={(v) => set("height", v)} />;
    case "divider":
      return <p className="text-xs text-muted-foreground">A thin line between sections.</p>;
    case "html":
      return (
        <>
          <Field label="HTML code" hint="Runs in an isolated frame on the page, so it can't read the page or your visitors' sign-ups.">
            <textarea
              value={block.code}
              maxLength={BLOCK_LIMITS.html}
              rows={10}
              spellCheck={false}
              onChange={(e) => set("code", e.target.value)}
              className={`${INPUT} resize-y font-mono text-xs`}
            />
          </Field>
          <Range label="Frame height" unit="px" min={40} max={2000} step={10} value={block.height} onChange={(v) => set("height", v)} />
        </>
      );
    case "session-link":
    case "share":
    case "calendar":
      return (
        <Field label="Label">
          <input value={block.label} maxLength={BLOCK_LIMITS.label} onChange={(e) => set("label", e.target.value)} className={INPUT} />
        </Field>
      );
    case "watch-player":
      return (
        <p className="text-sm text-muted-foreground">
          Shows the countdown before you start, the join button while you are live, or your recorded video. Change the waiting message and video link in the Watch room step.
        </p>
      );
    case "columns": {
      const n = block.columns.length;
      const setCount = (count: number) => {
        if (count > n) {
          onPatch({ columns: [...block.columns, ...Array.from({ length: count - n }, () => [createBlock("text") as LeafBlock])] } as Partial<Block>, "");
        } else {
          // Blocks in removed columns move to the last remaining one rather than being lost.
          const kept = block.columns.slice(0, count);
          kept[count - 1] = [...kept[count - 1], ...block.columns.slice(count).flat()];
          onPatch({ columns: kept } as Partial<Block>, "");
        }
      };
      const fits = (count: number) => count >= n || block.columns.slice(count - 1).flat().length <= BLOCK_LIMITS.blocksPerColumn;
      return (
        <div>
          <p className="text-sm font-semibold">Number of columns</p>
          <div className="mt-1.5 inline-flex rounded-lg border border-border p-0.5" role="group" aria-label="Number of columns">
            {Array.from({ length: BLOCK_LIMITS.columns }, (_, k) => k + 1).map((count) => (
              <button
                key={count}
                type="button"
                aria-pressed={n === count}
                disabled={!fits(count)}
                onClick={() => count !== n && setCount(count)}
                className={`h-10 min-w-11 rounded-md px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb] disabled:opacity-40 ${n === count ? "bg-[#2563eb] text-white" : "hover:bg-secondary"}`}
              >
                {count}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            Drag blocks into a column, or select a block inside one and click a block on the left to add it after. Columns sit side by side on wide screens.
          </p>
        </div>
      );
    }
  }
}

// ── Controls ──────────────────────────────────────────────────────────────

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function Range({ label, unit, min, max, step, value, onChange }: { label: string; unit: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label} right={<span className="text-[11px] tabular-nums text-muted-foreground">{value}{unit}</span>}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#2563eb]" />
    </Field>
  );
}

/** "" = the theme's own colour. */
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="flex items-center gap-2">
      <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border-strong focus-within:outline focus-within:outline-2 focus-within:outline-[#2563eb]" style={{ background: value || "transparent" }}>
        <input type="color" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value.toLowerCase())} aria-label={label} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </label>
      <span className="min-w-0 flex-1 text-sm font-semibold">
        {label}
        {value ? null : <span className="block text-[11px] font-normal text-muted-foreground">Theme colour</span>}
      </span>
      <input
        value={draft}
        placeholder="#"
        onChange={(e) => {
          const v = e.target.value && !e.target.value.startsWith("#") ? `#${e.target.value}` : e.target.value;
          setDraft(v);
          if (isHex(v)) onChange(v.toLowerCase());
        }}
        onBlur={() => setDraft(value)}
        maxLength={7}
        spellCheck={false}
        aria-label={`${label} hex code`}
        className="h-11 w-[6rem] rounded-lg border border-border-strong bg-card px-2 font-mono text-sm uppercase outline-none focus:border-primary"
      />
      <button
        type="button"
        onClick={() => onChange("")}
        disabled={!value}
        aria-label={`Reset ${label} to the theme colour`}
        title="Use the theme colour"
        className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb]"
      >
        <RotateCcw className="size-3.5" />
      </button>
    </div>
  );
}

/** Saves only an empty value or a valid https link; anything else stays a local draft with an error. */
function UrlField({ label, value, onChange, check, error = "Use a full link starting with https://" }: { label: string; value: string; onChange: (v: string) => void; check?: (url: string) => boolean; error?: string }) {
  const [draft, setDraft] = useState(value);
  // Keep the typed text while it means the stored (normalised) link; follow undo and uploads otherwise.
  useEffect(() => setDraft((d) => ((d.trim() ? safeHttpsUrl(d) : "") === value ? d : value)), [value]);
  const ok = (v: string) => !v.trim() || (Boolean(safeHttpsUrl(v)) && (!check || check(v.trim())));
  const bad = !ok(draft);
  const id = useId();
  return (
    <Field label={label} hint={bad ? error : undefined} hintId={id}>
      <input
        value={draft}
        inputMode="url"
        placeholder="https://"
        maxLength={BLOCK_LIMITS.url}
        aria-invalid={bad}
        aria-describedby={bad ? id : undefined}
        onChange={(e) => {
          setDraft(e.target.value);
          if (ok(e.target.value)) onChange(e.target.value.trim() ? safeHttpsUrl(e.target.value) : "");
        }}
        className={`${INPUT} ${bad ? "border-red-500" : ""}`}
      />
    </Field>
  );
}

/** Upload to the host's Storage (same helper and folder as the editor's ImageSlot) or paste an https link. */
function ImageField({ webinarId, kind, label, url, onChange, onError }: { webinarId: string; kind: ImageKind; label: string; url: string; onChange: (v: string) => void; onError: (m: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      onChange(await uploadWebinarImage(webinarId, file, kind));
    } catch (e) {
      onError(e instanceof ImageError ? e.message : "The image couldn't be uploaded. Please try again.");
      if (!(e instanceof ImageError)) console.error("image upload failed:", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="max-h-36 rounded-lg border border-border object-contain" />
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={BTN} disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
          {url ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        </button>
        {url ? (
          <button type="button" className={`${BTN} text-muted-foreground hover:text-red-700`} onClick={() => onChange("")}>
            <Trash2 className="size-3.5" /> Remove
          </button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          aria-label={`Upload ${label.toLowerCase()}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>
      <UrlField label={`Or paste a ${label.toLowerCase()} link`} value={url} onChange={onChange} />
    </div>
  );
}
