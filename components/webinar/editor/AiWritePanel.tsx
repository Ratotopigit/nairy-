"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import type { Webinar } from "@/lib/webinars";
import { copyPatch, hasSampleCopy, writeWebinarCopy, type WebinarCopy } from "@/lib/webinar-ai";
import { COPY_FIELDS, type CopyField } from "@/lib/webinar-copy";

const LABELS: Record<CopyField, string> = {
  title: "Headline",
  subtitle: "Subtitle",
  bullets: "What they'll learn",
  cta_label: "Button text",
  presenter_title: "Your title",
  host_bio: "Bio",
  social_proof: "Social proof",
  thank_you_message: "Thank-you message",
};

type State =
  | { kind: "idle" }
  | { kind: "running"; auto: boolean }
  | { kind: "preview"; copy: WebinarCopy; picked: Set<CopyField> }
  | { kind: "error"; message: string; auto: boolean }
  | { kind: "applied" };

const BTN = "min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50";

export function AiWritePanel({ w, setWebinar, auto }: { w: Webinar; setWebinar: Dispatch<SetStateAction<Webinar | null>>; auto: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const started = useRef(false);

  async function run(isAuto: boolean) {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setState({ kind: "error", message: "You need to be signed in to write with AI.", auto: isAuto });
      return;
    }
    setState({ kind: "running", auto: isAuto });
    try {
      const copy = await writeWebinarCopy(w, uid);
      if (isAuto) {
        // Re-checked against the latest webinar, so anything typed while the AI worked is kept.
        setWebinar((cur) => (cur ? { ...cur, ...copyPatch(cur, copy, { onlyEmpty: true }) } : cur));
        setState({ kind: "applied" });
      } else {
        const fields = COPY_FIELDS.filter((k) => (k === "bullets" ? copy.bullets.length > 0 : Boolean(copy[k])));
        setState({ kind: "preview", copy, picked: new Set(fields) });
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      // Workflow and network errors are technical; only the sign-in ones tell the host something they can act on.
      const message = /sign(ed)? in/i.test(raw) ? raw : "The AI couldn't write your page just now. Check your internet connection and try again.";
      setState({ kind: "error", message, auto: isAuto });
    }
  }

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    const key = `ai-write:${w.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked: the ref still stops a second run in this mount.
    }
    if (hasSampleCopy(w)) void run(true);
    // Once per mount by design; `w` is read at start only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, w.id]);

  function apply(copy: WebinarCopy, picked: Set<CopyField>) {
    setWebinar((cur) => {
      if (!cur) return cur;
      const patch = copyPatch(cur, copy, { onlyEmpty: false });
      const chosen = Object.fromEntries(Object.entries(patch).filter(([k]) => picked.has(k as CopyField)));
      return { ...cur, ...chosen };
    });
    setState({ kind: "idle" });
  }

  const running = state.kind === "running";

  return (
    <section aria-label="Write my page with AI" className="rounded-xl border border-[#2563eb]/30 bg-[#2563eb]/5 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold">Write my page with AI</h3>
          <p className="text-sm text-muted-foreground">The AI writes your headline and text from your Brand &amp; Files. You can edit it after.</p>
        </div>
        {state.kind === "idle" || state.kind === "applied" ? (
          <button type="button" onClick={() => void run(false)} className={`${BTN} inline-flex items-center gap-1.5 bg-[#2563eb] text-white hover:bg-[#1d4ed8]`}>
            <Sparkles className="size-4" aria-hidden />
            Write with AI
          </button>
        ) : null}
      </div>

      {running ? (
        <p role="status" className="mt-3 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
          {state.auto ? "Writing your page from your brand." : "Writing from your Brand & Files."} This can take up to a minute; you can keep editing.
        </p>
      ) : null}

      {state.kind === "applied" ? (
        <div role="status" className="mt-3 flex items-start gap-2 rounded-lg bg-card px-3 py-2">
          <p className="flex-1">We wrote your page from your brand. Edit anything.</p>
          <button type="button" aria-label="Close this message" title="Close this message" onClick={() => setState({ kind: "idle" })} className="-m-2 grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-foreground">
            <X className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
          <p className="min-w-0 flex-1">{state.message}</p>
          <button type="button" onClick={() => void run(false)} className={`${BTN} border border-red-300 bg-white`}>
            Try again
          </button>
          <button type="button" aria-label="Close this message" title="Close this message" onClick={() => setState({ kind: "idle" })} className="grid size-11 shrink-0 place-items-center rounded-lg">
            <X className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}

      {state.kind === "preview" ? (
        <div className="mt-3 space-y-3">
          <ul className="space-y-2">
            {COPY_FIELDS.filter((k) => (k === "bullets" ? state.copy.bullets.length > 0 : Boolean(state.copy[k]))).map((k) => (
              <li key={k}>
                <label className="flex cursor-pointer gap-3 rounded-lg bg-card px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                    checked={state.picked.has(k)}
                    onChange={(e) => {
                      const picked = new Set(state.picked);
                      if (e.target.checked) picked.add(k);
                      else picked.delete(k);
                      setState({ ...state, picked });
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-muted-foreground">{LABELS[k]}</span>
                    {k === "bullets" ? (
                      <ul className="list-disc pl-4">
                        {state.copy.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="block">{state.copy[k]}</span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!state.picked.size}
              onClick={() => apply(state.copy, state.picked)}
              className={`${BTN} bg-[#2563eb] text-white hover:bg-[#1d4ed8]`}
            >
              Use this
            </button>
            <button type="button" onClick={() => void run(false)} className={`${BTN} border border-border bg-card`}>
              Try again
            </button>
            <button type="button" onClick={() => setState({ kind: "idle" })} className={`${BTN} text-muted-foreground hover:text-foreground`}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
