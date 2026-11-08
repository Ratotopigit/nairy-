"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Download, ExternalLink, LayoutTemplate, Loader2, PencilLine, RotateCcw } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { TemplatePicker } from "@/components/webinar/TemplatePicker";
import { LiveThumb } from "@/components/webinar/LiveThumb";
import { PageBuilder } from "@/components/webinar/builder/PageBuilder";
import { WatchHowWhen, WatchPanel } from "@/components/webinar/editor/WatchPanel";
import { Divider, Section } from "@/components/webinar/editor/controls";
import type { Block, PageId } from "@/lib/page-blocks";
import { SetupPanel } from "@/components/webinar/editor/SetupPanel";
import { AiWritePanel } from "@/components/webinar/editor/AiWritePanel";
import { BrandPanel, ContentPanel, ImagesPanel, TextPanel } from "@/components/webinar/editor/EditorPanels";
import { ImagePicker } from "@/components/webinar/editor/ImagePicker";
import { PreviewPane, type Device, type Screen } from "@/components/webinar/editor/PreviewPane";
import { getTemplate, THANK_YOU_TEMPLATES } from "@/lib/webinar-templates";
import { moveInlineImagesToStorage } from "@/lib/webinar-images";
import { BRAND_IMAGE_FIELDS, brandPatch, loadBrandKit, type BrandKit } from "@/lib/brand-kit";
import { hasPlaceholderContent, previewWebinar } from "@/lib/webinar-preview";
import {
  getPrivate,
  getWebinar,
  isValidJoinUrl,
  isValidPaymentUrl,
  isValidVideoUrl,
  listRegistrants,
  publicPath,
  registrantsCsv,
  registrationUrl,
  savePrivate,
  saveWebinar,
  sessionPhase,
  WEBINAR_LIMITS,
  type Registrant,
  type Webinar,
} from "@/lib/webinars";

/** The account holder's name, for the readable link (/<name>/<title>-<id>). */
function hostName(): string {
  const user = auth.currentUser;
  return user?.displayName?.trim() || user?.email?.split("@")[0] || "";
}

type SaveState = "idle" | "saving" | "saved" | "error";
type PanelId = "content" | "text" | "images";

const STEPS = [
  { label: "Details", short: "Details", intro: "Choose who can attend and how it runs, then add your business name and logo." },
  { label: "Registration page", short: "Page", intro: "Pick a design, then fill in your headline, date and photos. The preview shows what visitors will see." },
  { label: "Watch room & replay", short: "Watch", intro: "Choose how people watch and when, then how the watch room and replay look." },
  { label: "Share & sign-ups", short: "Share", intro: "Copy your link and share it. Everyone who signs up appears in the list below." },
];

/** A builder page needs a form block somewhere (columns included) to take sign-ups. */
function hasFormBlock(blocks: Block[]): boolean {
  return blocks.some((b) => b.type === "form" || (b.type === "columns" && b.columns.some((c) => c.some((x) => x.type === "form"))));
}

/** One page card in the Register and Watch steps: preview, which design it uses, actions. */
function PageCard({
  title,
  design,
  active,
  onFocus,
  children,
  action,
}: {
  title: string;
  design?: string;
  active?: boolean;
  onFocus?: () => void;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      onClick={onFocus}
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card transition-colors ${
        active ? "border-[#2563eb] ring-1 ring-[#2563eb]" : "border-border hover:border-foreground/30"
      }`}
    >
      <div className="flex-1">{children}</div>
      <div className="space-y-2.5 border-t border-border p-3">
        <div>
          <h3 className="text-base font-semibold">
            {/* Keyboard route to focusing the card (it picks the settings and preview below). */}
            {onFocus ? (
              <button type="button" aria-pressed={active} className="text-left outline-none focus-visible:underline">
                {title}
              </button>
            ) : (
              title
            )}
          </h3>
          {design ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              Design: <span className="font-medium text-foreground">{design}</span>
            </p>
          ) : null}
        </div>
        {action}
      </div>
    </section>
  );
}

const PRIMARY = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]";

const SECONDARY = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-strong bg-card px-3 py-2.5 text-sm font-medium transition-colors hover:bg-secondary";

const PANELS: { id: PanelId; label: string }[] = [
  { id: "content", label: "Content" },
  { id: "text", label: "Page text" },
  { id: "images", label: "Images" },
];

function Editor() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "missing" | "ready">("loading");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // What is actually stored. The public page only works once this says
  // "published", so the Live link is shown from it, not from the editor's state.
  const [storedStatus, setStoredStatus] = useState<"draft" | "published">("draft");
  const urgentSave = useRef(false);
  // Steps 1-4. ?tab=registrants lets the morning summary email link straight to step 4.
  const [step, setStepState] = useState(params.get("tab") === "registrants" ? 4 : 1);
  const [panel, setPanel] = useState<PanelId>("content");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [screen, setScreen] = useState<Screen>("form");
  const [device, setDevice] = useState<Device>("desktop");
  const [registrants, setRegistrants] = useState<Registrant[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Which page's "Change design" picker is open.
  const [pickerPage, setPickerPage] = useState<PageId | null>(null);
  const [photoMode, setPhotoMode] = useState<"search" | "suggest" | null>(null);
  const [builderPage, setBuilderPage] = useState<PageId | null>(null);
  // Brand & Files, offered for empty fields only. Never applied without a click here: the webinar may be live.
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [brandOffer, setBrandOffer] = useState(true);
  // The join link lives in a private document, saved on its own.
  const [joinUrl, setJoinUrl] = useState("");
  // Host's private notes ("what is this one for?"), saved with the join link.
  const [notes, setNotes] = useState("");
  const [joinState, setJoinState] = useState<SaveState>("idle");
  // What the private document holds, so loading it never writes and any real change does.
  const savedPrivateRef = useRef({ join_url: "", notes: "" });
  const loadedRef = useRef(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const stepMovedRef = useRef(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!id) {
      setLoadState("missing");
      return;
    }
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      const found = await getWebinar(id);
      if (!found || found.owner_id !== user.uid) {
        setLoadState("missing");
        return;
      }
      setWebinar(found);
      setStoredStatus(found.status);
      void loadBrandKit(user.uid).then(setBrandKit);
      setLoadState("ready");
      // Pictures saved before Storage was in use sit inside the document as
      // data URLs. Move them into Storage now; the autosave then saves the
      // short download URLs. Each field is only replaced if it still holds the
      // old value, so an edit made meanwhile is never overwritten.
      if ([found.image_url, found.portrait_url, found.logo_url].some((u) => u.startsWith("data:image/"))) {
        void moveInlineImagesToStorage(found.id, found).then((moved) => {
          if (!Object.keys(moved).length) return;
          setWebinar((current) =>
            current
              ? {
                  ...current,
                  image_url: moved.image_url && current.image_url === found.image_url ? moved.image_url : current.image_url,
                  portrait_url: moved.portrait_url && current.portrait_url === found.portrait_url ? moved.portrait_url : current.portrait_url,
                  logo_url: moved.logo_url && current.logo_url === found.logo_url ? moved.logo_url : current.logo_url,
                }
              : current,
          );
        });
      }
      try {
        const saved = await getPrivate(found.id);
        savedPrivateRef.current = { join_url: saved.join_url, notes: saved.notes };
        setJoinUrl(saved.join_url);
        setNotes(saved.notes);
      } catch (e) {
        // Rules not published yet, or offline: the field still works and
        // saving reports the problem.
        console.warn("join link load failed:", e);
      }
    });
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (loadState !== "ready" || !webinar) return;
    const last = savedPrivateRef.current;
    const joinValid = isValidJoinUrl(joinUrl.trim());
    // An automated webinar hides the link, so a bad one there can't be fixed and must not block notes.
    if (!joinValid && webinar.delivery_type !== "automated") {
      setJoinState("idle");
      return;
    }
    const next = { join_url: joinValid ? joinUrl.trim() : last.join_url, notes: notes.trim() };
    if (next.join_url === last.join_url && next.notes === last.notes) {
      setJoinState("idle");
      return;
    }
    setJoinState("saving");
    const timer = window.setTimeout(() => {
      savePrivate(webinar.id, next)
        .then(() => {
          savedPrivateRef.current = next;
          setJoinState("saved");
        })
        .catch((e: unknown) => {
          console.error("private details save failed:", e);
          setJoinState("error");
        });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [joinUrl, notes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave, debounced. The first render after load is skipped so opening a
  // webinar never writes to it.
  useEffect(() => {
    if (!webinar) return;
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    setSaveState("saving");
    // Publishing and unpublishing save at once; typing waits for a pause.
    const delay = urgentSave.current ? 0 : 700;
    urgentSave.current = false;
    const timer = window.setTimeout(() => {
      saveWebinar(webinar, hostName())
        .then(() => {
          setSaveState("saved");
          setStoredStatus(webinar.status);
        })
        .catch((e) => {
          console.error("webinar save failed:", e);
          setSaveState("error");
        });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [webinar]);

  useEffect(() => {
    if (step !== 4 || !webinar) return;
    // No reset to null here: a revisit keeps the last list on screen while it refreshes.
    listRegistrants(webinar.id)
      .then(setRegistrants)
      .catch((e) => {
        console.error("registrants load failed:", e);
        setRegistrants([]);
        setNotice("The sign-up list couldn't be loaded. Check your internet connection and try again.");
      });
  }, [step, webinar?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard and screen-reader users land on the new step, not on a button it replaced.
  useEffect(() => {
    if (stepMovedRef.current) stepHeadingRef.current?.focus({ preventScroll: true });
    stepMovedRef.current = true;
  }, [step]);

  // A brand-new webinar still has placeholder text; the preview shows sample
  // copy in the template's category until the host writes their own.
  const shown = useMemo(
    () => (webinar ? previewWebinar(webinar, getTemplate(webinar.template_id).category, webinar.template_id) : null),
    [webinar],
  );

  if (loadState === "loading") {
    return (
      <div className="easy-read grid min-h-[50vh] place-items-center content-center gap-3 text-muted-foreground" role="status">
        <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        <p className="text-base">Opening your webinar…</p>
      </div>
    );
  }

  if (loadState === "missing" || !webinar || !shown) {
    return (
      <div className="easy-read mx-auto max-w-md py-20 text-center">
        <p className="text-xl font-semibold">We couldn&apos;t find this webinar</p>
        <p className="mt-2 text-base text-muted-foreground">It may have been deleted, or you may be signed in to a different account.</p>
        <Link
          href="/provider/webinars"
          className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-base font-semibold text-white hover:bg-[#1d4ed8]"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          Back to your webinars
        </Link>
      </div>
    );
  }

  // Each step opens on the sign-up page; the thank-you card switches the preview to "thanks".
  const setStep = (n: number) => {
    setStepState(n);
    setScreen("form");
    window.scrollTo({ top: 0 });
  };

  const update = <K extends keyof Webinar>(key: K, value: Webinar[K]) =>
    setWebinar((current) => (current ? { ...current, [key]: value } : current));
  // Re-checked against the latest webinar, so a field typed meanwhile is kept; autosave picks it up.
  const applyBrandKit = () => {
    if (brandKit) setWebinar((current) => (current ? { ...current, ...brandPatch(current, brandKit) } : current));
    setBrandOffer(false);
  };
  const brandFill = brandKit ? brandPatch(webinar, brandKit) : {};
  const brandImages = BRAND_IMAGE_FIELDS.filter((key) => key in brandFill).map((key) => BRAND_LABELS[key]);

  const published = webinar.status === "published";
  const template = getTemplate(webinar.template_id);
  const paid = webinar.access_type === "paid";
  // An empty page means the chosen template is used (lib/page-blocks.ts).
  const regBlocks = webinar.pages.registration ?? [];
  const regCustom = regBlocks.length > 0;
  const thanksCustom = (webinar.pages.thanks ?? []).length > 0;
  const replayCustom = (webinar.pages.replay ?? []).length > 0;
  const watchCustom = (webinar.pages.watch ?? []).length > 0;
  // The preview's screen doubles as which Register card is focused.
  const focusThanks = screen === "thanks" && !paid;
  // The Training designs have many more editable lines; their own tab holds them while that design is in use.
  const usesText = focusThanks ? !thanksCustom && webinar.thank_you_template === "training" : !regCustom && template.layout === "training";
  const panels = PANELS.filter((p) => p.id !== "text" || usesText);
  const activePanel = panels.some((p) => p.id === panel) ? panel : "content";
  /** Picking a design for a custom page removes its blocks, after asking. False = they said no. */
  const replaceCustom = (page: PageId, what: string) => {
    if (!(webinar.pages[page] ?? []).length) return true;
    if (!window.confirm(`Replace your custom page with ${what}? The blocks you built are removed.`)) return false;
    setWebinar((current) => (current ? { ...current, pages: { ...current.pages, [page]: [] } } : current));
    return true;
  };
  const thanksName = THANK_YOU_TEMPLATES.find((t) => t.id === webinar.thank_you_template)?.name ?? "Simple confirmation";
  const goNext = () => setStep(step + 1);
  const goBack = () => setStep(step - 1);
  const phase = sessionPhase(webinar);
  // What the link will be after the next save, so it updates as they type.
  const shareUrl = registrationUrl({ id: webinar.id, public_path: publicPath(webinar, hostName()) });
  const live = published && storedStatus === "published";
  const viewUrl = (view: "watch" | "replay") => `${shareUrl}${shareUrl.includes("?") ? "&" : "?"}view=${view}`;
  const joinInvalid = !isValidJoinUrl(joinUrl.trim());
  const sample = hasPlaceholderContent(webinar);
  const panelProps = { w: webinar, update, notify: setNotice };

  function togglePublish() {
    if (!webinar) return;
    if (!published && hasPlaceholderContent(webinar)) {
      setNotice("Write your own headline before publishing. The page is showing sample text.");
      setPanel("content");
      setMobileView("edit");
      setStep(2);
      return;
    }
    const w = webinar;
    const missing =
      w.access_type === "paid" && !isValidPaymentUrl(w.payment_url)
        ? "Add a valid payment link (starting with https://) before publishing."
        : w.delivery_type === "automated" && w.access_type !== "paid" && !isValidVideoUrl(w.video_url)
          ? "Add a valid video link (starting with https://) before publishing."
          : null;
    if (!published && missing) {
      setNotice(missing);
      setMobileView("edit");
      // The payment link is in step 1, the video link in step 3.
      setStep(w.access_type === "paid" ? 1 : 3);
      return;
    }
    if (!published && !paid && regCustom && !hasFormBlock(regBlocks) && !window.confirm("Your page has no sign-up form. Publish anyway?")) return;
    setNotice(null);
    urgentSave.current = true;
    update("status", published ? "draft" : "published");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setNotice("Couldn't copy the link. Your browser blocked clipboard access.");
    }
  }

  function downloadCsv() {
    if (!registrants) return;
    const url = URL.createObjectURL(new Blob([registrantsCsv(registrants)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${webinar!.name.replace(/[^\w-]+/g, "-").toLowerCase() || "webinar"}-registrants.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /** Card buttons: every page changes design the same way; a custom page can also be edited. */
  const designActions = (page: PageId, custom: boolean) => (
    <div className="grid gap-2">
      <button type="button" onClick={() => setPickerPage(page)} className={PRIMARY}>
        <LayoutTemplate className="size-4" />
        Change design
      </button>
      {custom ? (
        <button type="button" onClick={() => setBuilderPage(page)} className={SECONDARY}>
          <PencilLine className="size-4" />
          Edit page
        </button>
      ) : null}
    </div>
  );

  const saveLabel = saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : saveState === "error" ? "Not saved. Check your internet connection." : "";

  const stepNav = (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      {step > 1 ? (
        <button
          type="button"
          onClick={goBack}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border-strong bg-card px-5 py-3 text-base font-medium transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={goNext}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
      >
        Next: {STEPS[step]?.label}
        <ArrowRight className="size-5" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <div className="easy-read mx-auto w-full max-w-[1500px]">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/provider/webinars"
          aria-label="Back to your webinars"
          title="Back to your webinars"
          className="grid size-11 place-items-center rounded-xl border border-border-strong bg-card transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </Link>
        <label className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1 transition-colors focus-within:bg-secondary/60 hover:bg-secondary/60">
          <input
            value={webinar.name}
            onChange={(e) => update("name", e.target.value)}
            maxLength={WEBINAR_LIMITS.name}
            placeholder="Name this webinar"
            aria-label="Webinar name (only you see it)"
            title="Click to rename. Only you see this name."
            className="min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-[-0.02em] outline-none placeholder:text-muted-foreground sm:text-2xl"
          />
          <PencilLine className="size-4 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100" />
        </label>
        <span className={`text-sm ${saveState === "error" ? "font-medium text-red-700" : "text-muted-foreground"}`} role={saveState === "error" ? "alert" : "status"}>
          {saveState === "saving" ? <Loader2 className="mr-1 inline size-4 animate-spin" aria-hidden="true" /> : null}
          {saveState === "saved" ? <Check className="mr-1 inline size-4" aria-hidden="true" /> : null}
          {saveLabel}
        </span>
        <button
          type="button"
          onClick={togglePublish}
          title={published ? "Take the page offline" : "Put the page online so people can sign up"}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-base font-semibold transition ${
            published ? "border border-border-strong bg-card text-foreground hover:bg-secondary" : "bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
          }`}
        >
          {published ? "Unpublish" : "Publish"}
        </button>
      </div>

      {published && storedStatus !== "published" ? (
        <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          {saveState === "error"
            ? "Couldn't publish. Check your connection and try again; the page isn't live yet."
            : "Publishing… the link goes live in a moment."}
        </p>
      ) : null}

      {published && storedStatus === "published" ? (
        <div className="reg-rise mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-sm">
          <span className="font-semibold text-emerald-800">Published. Your page is online:</span>
          <code className="min-w-0 flex-1 truncate text-sm text-emerald-900">{shareUrl}</code>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100"
          >
            <Copy className="size-4" aria-hidden="true" />
            {copied ? "Copied" : "Copy link"}
          </button>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            title="Open your page in a new tab"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            View page
          </a>
        </div>
      ) : null}

      {phase === "ended" || phase === "closed" ? (
        <div className="reg-rise mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <RotateCcw className="size-4 shrink-0" />
          <p className="min-w-0 flex-1">
            {phase === "closed" ? "This session finished over a week ago, so the public page is now hidden. " : "This session has ended and registration is closed. "}
            Pick a new date in step 2, Registration page, to run it again. The same link keeps working.
          </p>
        </div>
      ) : null}

      {notice ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {notice}
        </p>
      ) : null}

      {/* Stepper */}
      <div className="mt-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
        <nav aria-label="Webinar steps" className="grid w-full min-w-0 grid-cols-4 gap-1.5 sm:flex-1">
          {STEPS.map((st, i) => {
            const current = step === i + 1;
            return (
              <button
                key={st.label}
                type="button"
                onClick={() => setStep(i + 1)}
                aria-current={current ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${st.label}`}
                title={`Step ${i + 1}: ${st.label}`}
                className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-1.5 text-sm transition-colors lg:flex-row lg:gap-2 lg:px-3 ${
                  current ? "border-[#2563eb] bg-[#2563eb] font-semibold text-white" : "border-border bg-card text-foreground hover:border-[#2563eb]/50 hover:bg-secondary"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${current ? "bg-white text-[#2563eb]" : "bg-[#eaf1fd] text-[#2563eb]"}`}
                >
                  {i + 1}
                </span>
                <span aria-hidden="true" className="max-w-full truncate lg:hidden">{st.short}</span>
                <span aria-hidden="true" className="hidden truncate lg:inline">{st.label}</span>
              </button>
            );
          })}
        </nav>
        {step < 3 ? (
          <div role="group" aria-label="Show" className="flex shrink-0 self-stretch rounded-xl border border-border-strong bg-card p-1 sm:self-auto xl:hidden">
            {(["edit", "preview"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setMobileView(v)}
                aria-pressed={mobileView === v}
                className={`min-h-11 flex-1 rounded-lg px-4 text-sm font-medium transition-colors ${mobileView === v ? "bg-[#2563eb] text-white" : "text-foreground hover:bg-secondary"}`}
              >
                {v === "edit" ? "Edit" : "Preview"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-5 text-2xl font-semibold tracking-[-0.01em] outline-none">
        <span className="text-[#2563eb]">Step {step} of 4:</span> {STEPS[step - 1].label}
      </h2>
      <p className="mt-1 max-w-3xl text-base text-muted-foreground">{STEPS[step - 1].intro}</p>

      {step < 3 ? (
        <div className="mt-4 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          {/* Editing column */}
          <div className={`min-w-0 ${mobileView === "preview" ? "hidden xl:block" : ""}`}>
            {step === 1 ? (
              <div className="space-y-6">
                <label className="block text-sm">
                  <span className="font-medium">Webinar name</span>
                  <span className="block text-xs text-muted-foreground">Only you see this name.</span>
                  <input
                    value={webinar.name}
                    onChange={(e) => update("name", e.target.value)}
                    maxLength={WEBINAR_LIMITS.name}
                    placeholder="Name this webinar"
                    className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-foreground"
                  />
                </label>
                <SetupPanel w={webinar} update={update} />
                <AiWritePanel w={webinar} setWebinar={setWebinar} auto={params.get("new") === "1"} />
                {brandOffer && brandImages.length ? (
                  <div role="region" aria-label="Brand & Files" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#2563eb]/30 bg-[#2563eb]/5 px-4 py-3 text-sm">
                    <p className="min-w-0 flex-1">
                      Use your Brand &amp; Files: {brandImages.join(", ")}
                      {Object.keys(brandFill).length > brandImages.length ? " and brand details" : ""}?
                    </p>
                    <button type="button" onClick={applyBrandKit} className="min-h-11 rounded-xl bg-[#2563eb] px-4 py-2 font-semibold text-white hover:bg-[#1d4ed8]">
                      Use them
                    </button>
                    <button type="button" onClick={() => setBrandOffer(false)} className="min-h-11 rounded-xl border border-border-strong bg-card px-4 py-2 font-medium text-foreground hover:bg-secondary">
                      Not now
                    </button>
                  </div>
                ) : Object.keys(brandFill).length ? (
                  <button type="button" onClick={applyBrandKit} className="min-h-11 text-sm font-semibold text-[#2563eb] underline underline-offset-2">
                    Refresh from Brand &amp; Files
                  </button>
                ) : null}
                <BrandPanel {...panelProps} onError={setNotice} />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <PageCard
                    title="Registration page"
                    design={regCustom ? "Custom page" : template.name}
                    active={!focusThanks}
                    onFocus={() => setScreen("form")}
                    action={designActions("registration", regCustom)}
                  >
                    <LiveThumb webinar={shown} />
                  </PageCard>
                  <PageCard
                    title="Thank-you page"
                    design={paid ? undefined : thanksCustom ? "Custom page" : thanksName}
                    active={focusThanks}
                    onFocus={paid ? undefined : () => setScreen("thanks")}
                    action={paid ? null : designActions("thanks", thanksCustom)}
                  >
                    {paid ? (
                      <div className="p-4 text-sm">
                        <p className="font-medium">Paid webinars have no thank-you page here</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Buyers go straight to your payment link, so nobody signs up on this page. What they see after paying, and how they get access, is set in
                          your checkout (Stripe, PayPal or similar). The preview shows your public page.
                        </p>
                      </div>
                    ) : (
                      <LiveThumb webinar={shown} thanks />
                    )}
                  </PageCard>
                </div>

                <section>
                  <h3 className="text-lg font-semibold">Page details</h3>
                  <p className="mb-3 mt-0.5 text-sm text-muted-foreground">Your headline, date, photos and meeting link. Every design uses these.</p>
                  <div role="tablist" aria-label="Page details" className="sticky top-[65px] z-10 -mx-1 md:top-0 mb-5 flex gap-1 rounded-xl border border-border bg-background/95 p-1 backdrop-blur">
                    {panels.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="tab"
                        aria-selected={activePanel === p.id}
                        onClick={() => setPanel(p.id)}
                        className={`min-h-11 flex-1 rounded-lg px-2 py-2 text-sm transition-colors ${
                          activePanel === p.id ? "bg-[#2563eb] font-semibold text-white" : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {activePanel === "content" ? (
                    <div className="space-y-6">
                      {focusThanks && !thanksCustom ? (
                        <label className="block text-sm">
                          <span className="font-medium">Thank-you message</span>
                          <span className="block text-xs text-muted-foreground">Shown after someone registers, under “You're registered!”.</span>
                          <textarea
                            value={webinar.thank_you_message}
                            onChange={(e) => update("thank_you_message", e.target.value)}
                            rows={2}
                            maxLength={300}
                            className="mt-2 w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-foreground"
                          />
                        </label>
                      ) : null}
                      <ContentPanel
                        {...panelProps}
                        joinUrl={joinUrl}
                        setJoinUrl={setJoinUrl}
                        notes={notes}
                        setNotes={setNotes}
                        joinInvalid={joinInvalid}
                        joinState={joinState}
                        timezone={timezone}
                      />
                    </div>
                  ) : null}
                  {activePanel === "text" ? <TextPanel {...panelProps} thanks={focusThanks} /> : null}
                  {activePanel === "images" ? (
                    <ImagesPanel
                      {...panelProps}
                      onFind={() => setPhotoMode("search")}
                      onSuggest={() => setPhotoMode("suggest")}
                      suggesting={false}
                      onError={setNotice}
                    />
                  ) : null}
                </section>
              </div>
            ) : null}

            {stepNav}
          </div>

          {/* Live preview: the exact component visitors get. */}
          <div className={`min-w-0 ${mobileView === "edit" ? "hidden xl:block" : ""}`}>
            <div className="xl:sticky xl:top-4">
              <PreviewPane
                webinar={shown}
                device={device}
                onDevice={setDevice}
                screen={screen}
                onScreen={setScreen}
                publicUrl={published && storedStatus === "published" ? shareUrl : null}
                notice={sample ? "Showing sample text for this kind of business until you write your own headline." : undefined}
              />
            </div>
          </div>

          <ImagePicker
            open={photoMode !== null}
            webinarId={webinar.id}
            mode={photoMode ?? "search"}
            context={{ title: webinar.title, subtitle: webinar.subtitle, category: template.category }}
            onClose={() => setPhotoMode(null)}
            onPicked={(url) => {
              update("image_url", url);
              update("image_focus_x", 50);
              update("image_focus_y", 50);
            }}
          />
        </div>
      ) : step === 3 ? (
        <div className="mt-4 max-w-3xl space-y-7">
          <WatchHowWhen
            w={webinar}
            update={update}
            joinUrl={joinUrl}
            setJoinUrl={setJoinUrl}
            joinInvalid={joinInvalid}
            joinState={joinState}
            timezone={timezone}
          />
          <Divider />
          <Section title="What people see" hint="Pick a design for each page, the same way as your registration page.">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    view: "watch",
                    title: "Watch room",
                    custom: watchCustom,
                    text: "Where people watch: a countdown before you start, then your join link or video, and your offer button.",
                  },
                  {
                    view: "replay",
                    title: "Replay page",
                    custom: replayCustom,
                    text: "The recording for anyone who missed it, open for as long as you choose.",
                  },
                ] as const
              ).map((c) => (
                <PageCard
                  key={c.view}
                  title={c.title}
                  design={c.custom ? "Custom page" : "Standard"}
                  action={
                    <div className="grid gap-2">
                      {designActions(c.view, c.custom)}
                      {live ? (
                        <a href={viewUrl(c.view)} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
                          <ExternalLink className="size-4" aria-hidden="true" />
                          View
                        </a>
                      ) : null}
                    </div>
                  }
                >
                  <p className="p-4 text-sm leading-6 text-muted-foreground">{c.text}</p>
                </PageCard>
              ))}
            </div>
            {live ? null : <p className="text-sm text-muted-foreground">Publish your webinar to open these pages.</p>}
          </Section>
          <Divider />
          <WatchPanel w={webinar} update={update} />
          {stepNav}
        </div>
      ) : (
        <div className="mt-5">
          <div className="rounded-2xl border border-border bg-card p-5 text-base">
            <p className="text-lg font-semibold">{published && storedStatus === "published" ? "Your webinar is published" : "Not published yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {!published ? "Press the blue Publish button at the top. Then this link starts working." : webinar.access_type === "paid" ? "Share this link to sell tickets." : "Share this link so people can sign up."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary/60 px-3 py-2.5 text-sm">{shareUrl}</code>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-2 text-base font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
              >
                <Copy className="size-5" aria-hidden="true" />
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {registrants === null ? "Loading the list…" : `${registrants.length} ${registrants.length === 1 ? "person has" : "people have"} signed up`}
            </p>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!registrants?.length}
              title="Download the list as a spreadsheet file (CSV)"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-strong bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <Download className="size-4" aria-hidden="true" />
              Download list
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
            {registrants === null ? (
              <div className="grid h-32 place-items-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            ) : registrants.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                {webinar.access_type === "paid"
                  ? "Buyers don't appear here. You'll find them in your checkout (Stripe, PayPal or similar)."
                  : published
                    ? "Nobody has signed up yet. Share your link to get your first sign-ups."
                    : "Publish this webinar, then people can start signing up."}
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Name</th>
                    <th className="px-5 py-2.5 font-medium">Email</th>
                    <th className="hidden px-5 py-2.5 font-medium sm:table-cell">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {registrants.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">{r.name}</td>
                      <td className="break-all px-5 py-3 text-muted-foreground">{r.email}</td>
                      <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">{r.created_at ? r.created_at.toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-6 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border-strong bg-card px-5 py-3 text-base font-medium transition-colors hover:bg-secondary"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
              Back
            </button>
          </div>
        </div>
      )}

      <TemplatePicker
        open={pickerPage !== null}
        webinar={webinar}
        page={pickerPage ?? "registration"}
        onClose={() => setPickerPage(null)}
        onBuild={() => {
          setBuilderPage(pickerPage);
          setPickerPage(null);
        }}
        onPick={(templateId) => {
          if (!replaceCustom("registration", "this design")) return;
          // Content, brand, colours, fonts and images all stay; only the design changes.
          update("template_id", templateId);
          // The Training page comes with its matching thank-you page; change it on the Thank-you card.
          if (getTemplate(templateId).layout === "training" && !webinar.thank_you_template) update("thank_you_template", "training");
          setPickerPage(null);
        }}
        onPickThanks={(id) => {
          if (!replaceCustom("thanks", "this design")) return;
          update("thank_you_template", id);
          // It only shows after sign-up, so jump the preview to it.
          setScreen("thanks");
          setMobileView("preview");
          setPickerPage(null);
        }}
        onStandard={() => {
          if (pickerPage && replaceCustom(pickerPage, "the standard page")) setPickerPage(null);
        }}
      />
      <PageBuilder
        webinar={webinar}
        page={builderPage ?? "registration"}
        open={builderPage !== null}
        onChange={(blocks: Block[]) => {
          if (!builderPage) return;
          // Functional update so quick successive edits never drop one.
          setWebinar((current) => (current ? { ...current, pages: { ...current.pages, [builderPage]: blocks } } : current));
        }}
        onClose={() => setBuilderPage(null)}
        onError={setNotice}
      />
    </div>
  );
}

const BRAND_LABELS: Record<string, string> = { logo_url: "logo", image_url: "photo", portrait_url: "portrait" };

export default function WebinarEditPage() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}
