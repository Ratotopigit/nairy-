"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, Download, ExternalLink, Loader2, PencilLine, RotateCcw } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { TemplatePicker } from "@/components/webinar/TemplatePicker";
import { SetupPanel } from "@/components/webinar/editor/SetupPanel";
import { BrandPanel, ContentPanel, ImagesPanel, LayoutPanel, TextPanel } from "@/components/webinar/editor/EditorPanels";
import { ImagePicker } from "@/components/webinar/editor/ImagePicker";
import { PreviewPane, type Device, type Screen } from "@/components/webinar/editor/PreviewPane";
import { getTemplate } from "@/lib/webinar-templates";
import { moveInlineImagesToStorage } from "@/lib/webinar-images";
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
type PanelId = "content" | "text" | "images" | "layout";

const STEPS = [
  { label: "Details", short: "Details" },
  { label: "Registration page", short: "Register" },
  { label: "Thank-you page", short: "Thank-you" },
  { label: "Share & registrants", short: "Share" },
];

const PANELS: { id: PanelId; label: string }[] = [
  { id: "layout", label: "Template" },
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
  const [panel, setPanel] = useState<PanelId>("layout");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [screen, setScreen] = useState<Screen>("form");
  const [device, setDevice] = useState<Device>("desktop");
  const [registrants, setRegistrants] = useState<Registrant[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [photoMode, setPhotoMode] = useState<"search" | "suggest" | null>(null);
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
        setNotice("Registrants couldn't be loaded. Check your connection and try again.");
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
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadState === "missing" || !webinar || !shown) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="font-medium">Webinar not found</p>
        <p className="mt-1 text-sm text-muted-foreground">It may have been deleted, or it belongs to another account.</p>
        <Link href="/provider/webinars" className="mt-5 inline-block text-sm underline underline-offset-4">
          Back to webinars
        </Link>
      </div>
    );
  }

  // The preview follows the step: the sign-up form, then the thank-you page.
  const setStep = (n: number) => {
    setStepState(n);
    setScreen(n === 3 ? "thanks" : "form");
    window.scrollTo({ top: 0 });
  };

  const update = <K extends keyof Webinar>(key: K, value: Webinar[K]) =>
    setWebinar((current) => (current ? { ...current, [key]: value } : current));

  const published = webinar.status === "published";
  const template = getTemplate(webinar.template_id);
  // The Training template has many more editable lines; their own tab holds them.
  const usesText = template.layout === "training";
  const panels = PANELS.filter((p) => p.id !== "text" || usesText);
  const activePanel = panels.some((p) => p.id === panel) ? panel : "layout";
  const panelIndex = panels.findIndex((p) => p.id === activePanel);
  const nextPanel = step === 2 ? panels[panelIndex + 1] : undefined;
  const openPanel = (id: PanelId) => {
    setPanel(id);
    window.scrollTo({ top: 0 });
  };
  // Next and Back walk through the Registration page sections before changing step.
  const goNext = () => {
    if (nextPanel) return openPanel(nextPanel.id);
    if (step === 1) setPanel(panels[0].id);
    setStep(step + 1);
  };
  const goBack = () => {
    if (step === 2 && panelIndex > 0) return openPanel(panels[panelIndex - 1].id);
    if (step === 3) setPanel(panels[panels.length - 1].id);
    setStep(step - 1);
  };
  const phase = sessionPhase(webinar);
  // What the link will be after the next save, so it updates as they type.
  const shareUrl = registrationUrl({ id: webinar.id, public_path: publicPath(webinar, hostName()) });
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
      setStep(1);
      return;
    }
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

  const saveLabel = saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Not saved" : "";

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/provider/webinars"
          aria-label="Back to webinars"
          className="grid size-9 place-items-center rounded-xl border border-border bg-card transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="size-4" />
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
        <span className={`text-xs ${saveState === "error" ? "text-red-700" : "text-muted-foreground"}`} role={saveState === "error" ? "alert" : "status"}>
          {saveState === "saving" ? <Loader2 className="mr-1 inline size-3 animate-spin" /> : null}
          {saveState === "saved" ? <Check className="mr-1 inline size-3" /> : null}
          {saveLabel}
        </span>
        <button
          type="button"
          onClick={togglePublish}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
            published ? "border border-border bg-card text-foreground hover:bg-secondary" : "bg-foreground text-background hover:opacity-90"
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
          <span className="font-medium text-emerald-800">Live</span>
          <code className="min-w-0 flex-1 truncate text-xs text-emerald-900/80">{shareUrl}</code>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 shadow-sm transition hover:bg-emerald-100"
          >
            <Copy className="size-3.5" />
            {copied ? "Copied" : "Copy link"}
          </button>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-emerald-900 shadow-sm transition hover:bg-emerald-100"
          >
            <ExternalLink className="size-3.5" />
            Open
          </a>
        </div>
      ) : null}

      {phase === "ended" || phase === "closed" ? (
        <div className="reg-rise mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <RotateCcw className="size-4 shrink-0" />
          <p className="min-w-0 flex-1">
            {phase === "closed" ? "This session finished over a week ago, so the public page is now hidden. " : "This session has ended and registration is closed. "}
            Pick a new date in the Registration page step to run it again. The same link keeps working.
          </p>
        </div>
      ) : null}

      {notice ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {notice}
        </p>
      ) : null}

      {/* Stepper */}
      <div className="mt-5 flex flex-col gap-2 border-b border-border pb-3 sm:flex-row sm:items-center">
        <nav aria-label="Webinar steps" className="grid w-full min-w-0 grid-cols-4 gap-1 sm:flex-1">
          {STEPS.map((st, i) => (
            <button
              key={st.label}
              type="button"
              onClick={() => setStep(i + 1)}
              aria-current={step === i + 1 ? "step" : undefined}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-1.5 py-2 text-xs transition-colors sm:text-sm ${
                step === i + 1 ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <span className="shrink-0 font-semibold">{i + 1}</span>
              <span className="truncate xl:hidden">{st.short}</span>
              <span className="hidden truncate xl:inline">{st.label}</span>
            </button>
          ))}
        </nav>
        {step < 4 ? (
          <div className="flex shrink-0 self-end rounded-lg border border-border p-0.5 sm:self-auto xl:hidden">
            {(["edit", "preview"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setMobileView(v)}
                className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${mobileView === v ? "bg-foreground text-background" : "text-muted-foreground"}`}
              >
                {v}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <h2 ref={stepHeadingRef} tabIndex={-1} className="mt-5 text-lg font-semibold tracking-[-0.01em] outline-none">
        {STEPS[step - 1].label}
      </h2>

      {step < 4 ? (
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
                <BrandPanel {...panelProps} onError={setNotice} />
              </div>
            ) : null}

            {step === 2 ? (
              <>
                <div role="tablist" aria-label="Registration page sections" className="sticky top-[65px] z-10 -mx-1 md:top-0 mb-5 flex gap-1 rounded-xl border border-border bg-background/95 p-1 backdrop-blur">
                  {panels.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={activePanel === p.id}
                      onClick={() => setPanel(p.id)}
                      className={`flex-1 rounded-lg px-2 py-2 text-sm transition-colors ${
                        activePanel === p.id ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {activePanel === "content" ? (
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
                ) : null}
                {activePanel === "text" ? <TextPanel {...panelProps} /> : null}
                {activePanel === "images" ? (
                  <ImagesPanel
                    {...panelProps}
                    onFind={() => setPhotoMode("search")}
                    onSuggest={() => setPhotoMode("suggest")}
                    suggesting={false}
                    onError={setNotice}
                  />
                ) : null}
                {activePanel === "layout" ? <LayoutPanel {...panelProps} onBrowse={() => setPickerOpen(true)} /> : null}
              </>
            ) : null}

            {step === 3 && webinar.access_type === "paid" ? (
              <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                <p className="font-medium">Paid webinars have no thank-you page here</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Buyers go straight to your payment link, so nobody signs up on this page. What they see after paying, and how they get access, is set in your
                  checkout (Stripe, PayPal or similar). The preview shows your public page.
                </p>
              </div>
            ) : null}

            {step === 3 && webinar.access_type !== "paid" ? (
              <div className="space-y-6">
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
                <LayoutPanel {...panelProps} thanks />
                {webinar.thank_you_template === "training" ? <TextPanel {...panelProps} thanks /> : null}
              </div>
            ) : null}

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 1}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-secondary disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Next: {nextPanel?.label ?? STEPS[step].label}
              </button>
            </div>
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

          <TemplatePicker
            open={pickerOpen}
            webinar={webinar}
            onClose={() => setPickerOpen(false)}
            onPick={(templateId) => {
              // Content, brand, colours, fonts and images all stay; only the design changes.
              update("template_id", templateId);
              // The Training page comes with its matching thank-you page; change it in the Thank-you page step.
              if (getTemplate(templateId).layout === "training" && !webinar.thank_you_template) update("thank_you_template", "training");
              setPickerOpen(false);
            }}
            onPickThanks={(id) => {
              update("thank_you_template", id);
              // It only shows after sign-up, so jump the preview to it.
              setScreen("thanks");
              setMobileView("preview");
              setPickerOpen(false);
            }}
          />
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
      ) : (
        <div className="mt-5">
          <div className="rounded-2xl border border-border bg-card p-4 text-sm">
            <p className="font-medium">{published && storedStatus === "published" ? "Your webinar is live" : "Not published yet"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {!published ? "Press Publish at the top, then this link starts working." : webinar.access_type === "paid" ? "Share this link to sell tickets." : "Share this link to get registrations."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary/60 px-3 py-2 text-xs">{shareUrl}</code>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs transition-colors hover:bg-secondary"
              >
                <Copy className="size-3.5" />
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {registrants === null ? "Loading…" : `${registrants.length} registrant${registrants.length === 1 ? "" : "s"}`}
            </p>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!registrants?.length}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <Download className="size-4" />
              Export CSV
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
            {registrants === null ? (
              <div className="grid h-32 place-items-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : registrants.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-muted-foreground">
                {webinar.access_type === "paid"
                  ? "Buyers don't appear here. You'll find them in your checkout (Stripe, PayPal or similar)."
                  : published
                    ? "No registrations yet. Share your link to start getting them."
                    : "Publish this webinar to start taking registrations."}
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Name</th>
                    <th className="px-5 py-2.5 font-medium">Email</th>
                    <th className="hidden px-5 py-2.5 font-medium sm:table-cell">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {registrants.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">{r.name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{r.email}</td>
                      <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">{r.created_at ? r.created_at.toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-6 border-t border-border pt-4">
            <button type="button" onClick={() => setStep(3)} className="rounded-xl border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-secondary">
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WebinarEditPage() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}
