"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  ImagePlus,
  Link2,
  Loader2,
  Lock,
  Palette,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { auth, storage } from "@/lib/firebase/config";
import { RegistrationPage } from "@/components/webinar/RegistrationPage";
import { TemplatePicker, TemplateThumbnail } from "@/components/webinar/TemplatePicker";
import { getTemplate, themedColors } from "@/lib/webinar-templates";
import { ThemeColorField } from "@/components/webinar/ThemeColorField";
import {
  DURATION_OPTIONS,
  getJoinUrl,
  getWebinar,
  isValidJoinUrl,
  listRegistrants,
  publicPath,
  registrantsCsv,
  registrationUrl,
  saveJoinUrl,
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

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const h = minutes / 60;
  return `${h} hour${h === 1 ? "" : "s"}`;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const INPUT =
  "w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

/** ISO instant -> the value a datetime-local input expects, in local time. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function Editor() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "missing" | "ready">("loading");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // ?tab=registrants lets the morning summary email link straight to the list.
  const [tab, setTab] = useState<"page" | "registrants">(
    params.get("tab") === "registrants" ? "registrants" : "page",
  );
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [registrants, setRegistrants] = useState<Registrant[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // The join link lives in a private document, saved on its own.
  const [joinUrl, setJoinUrl] = useState("");
  const [joinState, setJoinState] = useState<SaveState>("idle");
  const joinLoadedRef = useRef(false);
  const loadedRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
      setLoadState("ready");
      try {
        setJoinUrl(await getJoinUrl(found.id));
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
    if (!joinLoadedRef.current) {
      joinLoadedRef.current = true;
      return;
    }
    if (!isValidJoinUrl(joinUrl.trim())) {
      setJoinState("idle");
      return;
    }
    setJoinState("saving");
    const timer = window.setTimeout(() => {
      saveJoinUrl(webinar.id, joinUrl)
        .then(() => setJoinState("saved"))
        .catch((e) => {
          console.error("join link save failed:", e);
          setJoinState("error");
        });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [joinUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave, debounced. The first render after load is skipped so opening a
  // webinar never writes to it.
  useEffect(() => {
    if (!webinar) return;
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      saveWebinar(webinar, hostName())
        .then(() => setSaveState("saved"))
        .catch((e) => {
          console.error("webinar save failed:", e);
          setSaveState("error");
        });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [webinar]);

  useEffect(() => {
    if (tab !== "registrants" || !webinar) return;
    setRegistrants(null);
    listRegistrants(webinar.id)
      .then(setRegistrants)
      .catch((e) => {
        console.error("registrants load failed:", e);
        setRegistrants([]);
        setNotice("Registrants couldn't be loaded. Check your connection and try again.");
      });
  }, [tab, webinar?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadState === "loading") {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadState === "missing" || !webinar) {
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

  const update = <K extends keyof Webinar>(key: K, value: Webinar[K]) =>
    setWebinar((current) => (current ? { ...current, [key]: value } : current));

  const published = webinar.status === "published";
  const template = getTemplate(webinar.template_id);
  const phase = sessionPhase(webinar);
  // What the link will be after the next save, so it updates as they type.
  const shareUrl = registrationUrl({ id: webinar.id, public_path: publicPath(webinar, hostName()) });
  const joinInvalid = !isValidJoinUrl(joinUrl.trim());

  function togglePublish() {
    if (!webinar) return;
    if (!published && !webinar.title.trim()) {
      setNotice("Add a headline before publishing.");
      return;
    }
    setNotice(null);
    update("status", published ? "draft" : "published");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setNotice("Couldn't copy the link — your browser blocked clipboard access.");
    }
  }

  async function uploadImage(file: File) {
    const user = auth.currentUser;
    if (!user || !webinar) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setNotice("That image is over 8 MB. Please use a smaller one.");
      return;
    }
    setUploading(true);
    setNotice(null);
    try {
      // Stored under the owner's folder (the storage rules require that). The
      // download URL carries an access token, so visitors can still see it.
      const path = `${user.uid}/webinars/${webinar.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file, { contentType: file.type });
      update("image_url", await getDownloadURL(fileRef));
    } catch (e) {
      console.error("image upload failed:", e);
      setNotice("The image couldn't be uploaded. Please try again.");
    } finally {
      setUploading(false);
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

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Not saved" : "";

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/provider/webinars"
          aria-label="Back to webinars"
          className="grid size-9 place-items-center rounded-xl border border-border bg-card transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <input
          value={webinar.name}
          onChange={(e) => update("name", e.target.value)}
          aria-label="Internal webinar name"
          className="min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-[-0.02em] outline-none sm:text-2xl"
        />
        <span
          className={`text-xs ${saveState === "error" ? "text-red-700" : "text-muted-foreground"}`}
          role={saveState === "error" ? "alert" : "status"}
        >
          {saveState === "saving" ? <Loader2 className="mr-1 inline size-3 animate-spin" /> : null}
          {saveState === "saved" ? <Check className="mr-1 inline size-3" /> : null}
          {saveLabel}
        </span>
        <button
          type="button"
          onClick={togglePublish}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
            published
              ? "border border-border bg-card text-foreground hover:bg-secondary"
              : "bg-foreground text-background hover:opacity-90"
          }`}
        >
          {published ? "Unpublish" : "Publish"}
        </button>
      </div>

      {published ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-sm reg-rise">
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
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 reg-rise">
          <RotateCcw className="size-4 shrink-0" />
          <p className="min-w-0 flex-1">
            {phase === "closed"
              ? "This session finished over a week ago, so the public page is now hidden. "
              : "This session has ended and registration is closed. "}
            Pick a new date below to run it again. The same link keeps working.
          </p>
        </div>
      ) : null}

      {notice ? (
        <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {notice}
        </p>
      ) : null}

      {/* Tabs */}
      <div className="mt-5 flex items-center gap-1 border-b border-border">
        {(["page", "registrants"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              tab === key
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "page" ? "Registration page" : "Registrants"}
          </button>
        ))}
        {tab === "page" ? (
          <div className="ml-auto flex rounded-lg border border-border p-0.5 lg:hidden">
            {(["edit", "preview"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setMobileView(v)}
                className={`rounded-md px-3 py-1 text-xs capitalize transition-colors ${
                  mobileView === v ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {tab === "page" ? (
        <div className="mt-5 grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
          {/* Form */}
          <div className={`space-y-5 ${mobileView === "preview" ? "hidden lg:block" : ""}`}>
            <div>
              <span className="text-xs font-medium">Template</span>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-1.5 flex w-full items-center gap-3 rounded-xl border border-border bg-card p-2 text-left transition hover:bg-secondary"
              >
                <div className="w-24 shrink-0 overflow-hidden rounded-lg border border-border">
                  <TemplateThumbnail template={{ ...template, colors: themedColors(template, webinar) }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{template.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{template.category}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs">
                  <Palette className="size-3.5" />
                  Change
                </span>
              </button>
            </div>

            <div className="space-y-4 rounded-xl border border-border bg-card/60 p-3.5">
              <ThemeColorField
                label="Button colour"
                hint="The register button"
                value={webinar.theme_accent}
                templateDefault={template.colors.accent}
                onChange={(v) => update("theme_accent", v)}
              />
              <ThemeColorField
                label="Brand colour"
                hint="Badges, ticks, banner, artwork"
                value={webinar.theme_brand}
                templateDefault={template.colors.hero}
                onChange={(v) => update("theme_brand", v)}
              />
            </div>

            <Field label="Headline">
              <textarea
                value={webinar.title}
                onChange={(e) => update("title", e.target.value)}
                maxLength={WEBINAR_LIMITS.title}
                rows={2}
                className={`${INPUT} resize-none`}
              />
            </Field>

            <Field label="Subheadline">
              <textarea
                value={webinar.subtitle}
                onChange={(e) => update("subtitle", e.target.value)}
                maxLength={WEBINAR_LIMITS.subtitle}
                rows={3}
                className={`${INPUT} resize-none`}
              />
            </Field>

            <Field label="Session date and time" hint={`In your timezone (${timezone}). Visitors see it in theirs.`}>
              <input
                type="datetime-local"
                value={toLocalInput(webinar.next_session_at)}
                onChange={(e) =>
                  update("next_session_at", e.target.value ? new Date(e.target.value).toISOString() : "")
                }
                className={INPUT}
              />
            </Field>

            <Field label="Session length" hint="The page shows “Live now” during the session and “Ended” after it.">
              <select
                value={webinar.duration_minutes}
                onChange={(e) => update("duration_minutes", Number(e.target.value))}
                className={INPUT}
              >
                {DURATION_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {durationLabel(m)}
                  </option>
                ))}
              </select>
            </Field>

            <div>
              <span className="flex items-center gap-1.5 text-xs font-medium">
                Session link
                <Lock className="size-3 text-muted-foreground" />
              </span>
              <div className="relative mt-1.5">
                <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={joinUrl}
                  onChange={(e) => setJoinUrl(e.target.value)}
                  maxLength={WEBINAR_LIMITS.joinUrl}
                  inputMode="url"
                  placeholder="Paste your Zoom, Google Meet or Teams link"
                  aria-invalid={joinInvalid}
                  className={`${INPUT} pl-10 ${joinInvalid ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
                />
              </div>
              <span
                className={`mt-1 block text-[11px] ${joinInvalid || joinState === "error" ? "text-red-700" : "text-muted-foreground"}`}
                role={joinState === "error" ? "alert" : undefined}
              >
                {joinInvalid
                  ? "That doesn't look like a link. It should start with https://"
                  : joinState === "error"
                    ? "The link couldn't be saved. Check your connection, or that the latest database rules are published."
                    : joinState === "saving"
                      ? "Saving…"
                      : "Private. Never shown on the page; only emailed to people who register, inside their calendar invite."}
              </span>
            </div>

            <div>
              <span className="text-xs font-medium">What they&apos;ll learn</span>
              <div className="mt-1.5 space-y-2">
                {webinar.bullets.map((bullet, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={bullet}
                      maxLength={WEBINAR_LIMITS.bullet}
                      onChange={(e) =>
                        update(
                          "bullets",
                          webinar.bullets.map((b, j) => (j === i ? e.target.value : b)),
                        )
                      }
                      className={INPUT}
                    />
                    <button
                      type="button"
                      onClick={() => update("bullets", webinar.bullets.filter((_, j) => j !== i))}
                      aria-label="Remove point"
                      className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-secondary"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
                {webinar.bullets.length < WEBINAR_LIMITS.bullets ? (
                  <button
                    type="button"
                    onClick={() => update("bullets", [...webinar.bullets, ""])}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Plus className="size-3.5" />
                    Add a point
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Presenter">
                <input
                  value={webinar.presenter_name}
                  onChange={(e) => update("presenter_name", e.target.value)}
                  placeholder="Nyrie Roos"
                  className={INPUT}
                />
              </Field>
              <Field label="Presenter title">
                <input
                  value={webinar.presenter_title}
                  onChange={(e) => update("presenter_title", e.target.value)}
                  placeholder="Founder"
                  className={INPUT}
                />
              </Field>
            </div>

            <Field label="Image">
              <div className="flex items-center gap-3">
                {webinar.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={webinar.image_url} alt="" className="size-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="size-14 shrink-0 rounded-full bg-secondary" />
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                  {webinar.image_url ? "Replace" : "Upload"}
                </button>
                {webinar.image_url ? (
                  <button
                    type="button"
                    onClick={() => update("image_url", "")}
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadImage(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </Field>

            <Field label="Button text">
              <input
                value={webinar.cta_label}
                onChange={(e) => update("cta_label", e.target.value)}
                maxLength={40}
                className={INPUT}
              />
            </Field>

            <Field label="Thank-you message" hint="Shown after someone registers.">
              <textarea
                value={webinar.thank_you_message}
                onChange={(e) => update("thank_you_message", e.target.value)}
                rows={2}
                className={`${INPUT} resize-none`}
              />
            </Field>
          </div>

          {/* Live preview: the exact component visitors get. */}
          <div className={mobileView === "edit" ? "hidden lg:block" : ""}>
            <div className="sticky top-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-border bg-secondary/60 px-3 py-2">
                <span className="size-2.5 rounded-full bg-[#ddd7ca]" />
                <span className="size-2.5 rounded-full bg-[#ddd7ca]" />
                <span className="size-2.5 rounded-full bg-[#ddd7ca]" />
                <span className="ml-2 truncate text-[11px] text-muted-foreground">Preview — registering here does not save</span>
              </div>
              <div className="max-h-[calc(100vh-220px)] overflow-y-auto">
                <RegistrationPage key={webinar.template_id} webinar={webinar} mode="preview" />
              </div>
            </div>
          </div>
          <TemplatePicker
            open={pickerOpen}
            currentId={template.id}
            onClose={() => setPickerOpen(false)}
            onPick={(templateId) => {
              // A new template starts with its own designed colours.
              setWebinar((current) =>
                current ? { ...current, template_id: templateId, theme_accent: "", theme_brand: "" } : current,
              );
              setPickerOpen(false);
            }}
          />
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {registrants === null
                ? "Loading…"
                : `${registrants.length} registrant${registrants.length === 1 ? "" : "s"}`}
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
                {published ? "No registrations yet. Share your link to start getting them." : "Publish this webinar to start taking registrations."}
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
                      <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                        {r.created_at ? r.created_at.toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
