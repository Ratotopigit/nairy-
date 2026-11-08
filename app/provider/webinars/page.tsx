"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, Plus, RotateCcw, Trash2, Users } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { brandPatch, loadBrandKit } from "@/lib/brand-kit";
import { NewWebinarDialog } from "@/components/webinar/NewWebinarDialog";
import { RegistrantsBoard } from "@/components/webinar/RegistrantsBoard";
import {
  countRegistrations,
  createWebinar,
  deleteWebinar,
  emptyWebinar,
  getPrivate,
  listWebinars,
  registrationUrl,
  sessionPhase,
  type SessionPhase,
  type Webinar,
} from "@/lib/webinars";

function sessionSummary(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "No session scheduled";
  const label = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return date.getTime() < Date.now() ? `Last session ${label}` : `Next session ${label}`;
}

/** The chip on each row: publishing state first, then where the session is. */
function statusChip(webinar: Webinar, phase: SessionPhase): { label: string; className: string } {
  if (webinar.status !== "published") return { label: "Draft", className: "bg-secondary text-muted-foreground" };
  switch (phase) {
    case "live":
      return { label: "Live now", className: "bg-red-50 text-red-700" };
    case "upcoming":
      return { label: "Upcoming", className: "bg-emerald-50 text-emerald-700" };
    case "ended":
      return { label: "Ended", className: "bg-amber-50 text-amber-800" };
    case "closed":
      return { label: "Finished", className: "bg-secondary text-muted-foreground" };
    default:
      return { label: "Published", className: "bg-emerald-50 text-emerald-700" };
  }
}

const CARD_BTN =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-strong bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary";

function Webinars() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"webinars" | "registrants">(params.get("tab") === "registrants" ? "registrants" : "webinars");
  const [webinars, setWebinars] = useState<Webinar[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [registrantsOpened, setRegistrantsOpened] = useState(tab === "registrants");
  if (tab === "registrants" && !registrantsOpened) setRegistrantsOpened(true);
  // Webinar pre-selected on the Registrants tab (from a card, or ?w= in the URL).
  const [focusWebinar, setFocusWebinar] = useState<string | undefined>(params.get("w") ?? undefined);
  // History = sessions that finished over a week ago (their page is hidden).
  const [view, setView] = useState<"active" | "history">("active");
  const isHistory = (w: Webinar) => sessionPhase(w) === "closed";
  const historyCount = webinars?.filter(isHistory).length ?? 0;
  const activeCount = (webinars?.length ?? 0) - historyCount;
  const shown = (webinars ?? []).filter((w) => (view === "history" ? isHistory(w) : !isHistory(w)));

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const rows = await listWebinars(user.uid);
        setWebinars(rows);
        // Counts and notes load after the list so the page is usable at once.
        const [countEntries, noteEntries] = await Promise.all([
          Promise.all(rows.map(async (w) => [w.id, await countRegistrations(w.id)] as const)),
          Promise.all(rows.map(async (w) => [w.id, (await getPrivate(w.id).catch(() => null))?.notes ?? ""] as const)),
        ]);
        setCounts(Object.fromEntries(countEntries));
        setNotes(Object.fromEntries(noteEntries));
      } catch (e) {
        console.error("webinar list failed:", e);
        setError("Your webinars couldn't be loaded. Check your connection and refresh.");
        setWebinars([]);
      }
    });
    return unsubscribe;
  }, []);

  // The home page links here with ?new=1: open the dialog once, then drop the param.
  useEffect(() => {
    if (params.get("new") !== "1") return;
    setDialogOpen(true);
    window.history.replaceState(null, "", window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const closeDialog = useCallback(() => setDialogOpen(false), []);

  async function handleCreate(input: Parameters<typeof createWebinar>[1]) {
    const user = auth.currentUser;
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      const id = await createWebinar(user.uid, input);
      // Fill the new webinar from Brand & Files. Best effort, capped at 3s so a slow
      // load never holds up the editor; awaited so the editor loads the filled version.
      const fill = loadBrandKit(user.uid).then((kit) => {
        const patch = brandPatch(emptyWebinar(user.uid), kit);
        return Object.keys(patch).length ? updateDoc(doc(db, "webinars", id), patch) : undefined;
      });
      await Promise.race([fill, new Promise((r) => setTimeout(r, 3000))]).catch((e) => console.warn("brand kit fill failed:", e));
      router.push(`/provider/webinars/edit?id=${id}&new=1`);
    } catch (e) {
      console.error("create webinar failed:", e);
      setError("A new webinar couldn't be created. Please try again.");
      setCreating(false);
      setDialogOpen(false);
    }
  }

  async function handleDelete(webinar: Webinar) {
    if (!window.confirm(`Delete "${webinar.name}"? Its registration link will stop working.`)) return;
    try {
      await deleteWebinar(webinar.id);
      setWebinars((rows) => rows?.filter((w) => w.id !== webinar.id) ?? null);
    } catch (e) {
      console.error("delete webinar failed:", e);
      setError("That webinar couldn't be deleted. Please try again.");
    }
  }

  async function handleCopy(webinar: Webinar) {
    try {
      await navigator.clipboard.writeText(registrationUrl(webinar));
      setCopied(webinar.id);
      window.setTimeout(() => setCopied((c) => (c === webinar.id ? null : c)), 1600);
    } catch {
      setError("Couldn't copy the link — your browser blocked clipboard access.");
    }
  }

  function switchTab(next: "webinars" | "registrants") {
    setTab(next);
    setFocusWebinar(undefined);
    window.history.replaceState(null, "", next === "registrants" ? "?tab=registrants" : window.location.pathname);
  }

  return (
    <div className={`easy-read mx-auto w-full ${tab === "registrants" ? "max-w-6xl" : "max-w-4xl"}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Webinars</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Your webinars, and everyone who signed up for them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
        >
          <Plus className="size-5" aria-hidden="true" />
          Create webinar
        </button>
      </div>

      <div className="mt-5 flex items-center gap-1 border-b border-border">
        {(["webinars", "registrants"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTab(key)}
            aria-pressed={tab === key}
            className={`-mb-px min-h-11 border-b-[3px] px-3 py-2.5 text-base transition-colors ${
              tab === key ? "border-[#2563eb] font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "webinars" ? "Your webinars" : "People who signed up"}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Stays mounted once opened, so filters and loaded rows survive a tab switch. */}
      {registrantsOpened ? (
        <div className="mt-5" hidden={tab !== "registrants"}>
          {webinars === null ? (
            <div className="grid h-40 place-items-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RegistrantsBoard key={focusWebinar ?? "all"} webinars={webinars} initialWebinarId={focusWebinar} />
          )}
        </div>
      ) : null}
      {tab === "registrants" ? null : (
        <div className="mt-5 space-y-3">
          {webinars !== null && webinars.length > 0 ? (
            <div className="flex gap-1">
              {(["active", "history"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  aria-pressed={view === key}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm transition-colors ${
                    view === key ? "border-[#2563eb] bg-[#2563eb] font-semibold text-white" : "border-border-strong bg-card text-foreground hover:bg-secondary"
                  }`}
                >
                  {key === "active" ? `Current (${activeCount})` : `Past (${historyCount})`}
                </button>
              ))}
            </div>
          ) : null}
          {webinars === null ? (
            [0, 1, 2].map((i) => <div key={i} aria-hidden="true" className="h-[120px] rounded-2xl border border-border bg-card/70" />)
          ) : webinars.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong bg-card/60 px-6 py-14 text-center">
              <p className="text-xl font-semibold tracking-[-0.02em]">You don&apos;t have any webinars yet</p>
              <p className="mx-auto mt-1 max-w-sm text-base text-muted-foreground">
                Give it a name, choose free or paid, then make the page people sign up on. It takes a few minutes.
              </p>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#2563eb] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
              >
                <Plus className="size-5" aria-hidden="true" />
                Create your first webinar
              </button>
            </div>
          ) : shown.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-strong bg-card/60 px-6 py-10 text-center text-base text-muted-foreground">
              {view === "history"
                ? "Nothing here yet. Webinars move here a week after their session ends. Open one and pick a new date to run it again."
                : "No current webinars. Open one from Past and pick a new date to run it again, or create a new one."}
            </p>
          ) : (
            shown.map((webinar) => {
              const count = counts[webinar.id];
              const published = webinar.status === "published";
              const phase = sessionPhase(webinar);
              const chip = statusChip(webinar, phase);
              const finished = phase === "ended" || phase === "closed";
              const note = notes[webinar.id];
              return (
                <div
                  key={webinar.id}
                  className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_10px_30px_-20px_rgba(15,31,58,0.35)] sm:flex-row sm:items-center"
                >
                  <Link href={`/provider/webinars/edit?id=${webinar.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-lg font-semibold">{webinar.name}</h2>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip.className}`}>
                        {chip.label}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{note || webinar.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-4" aria-hidden="true" />
                        {count === undefined ? "Counting sign-ups…" : count === null ? "Sign-ups not available" : `${count} sign-up${count === 1 ? "" : "s"}`}
                      </span>
                      <span>{webinar.delivery_type === "automated" ? "Watch any time" : sessionSummary(webinar.next_session_at)}</span>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-foreground">
                        {webinar.access_type === "paid" ? "Paid" : "Free"}
                      </span>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-foreground">
                        {webinar.delivery_type === "automated" ? "Recorded" : "Live"}
                      </span>
                    </div>
                  </Link>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {count ? (
                      <Link
                        href={`/provider/webinars?tab=registrants&w=${webinar.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setFocusWebinar(webinar.id);
                          setTab("registrants");
                          window.history.replaceState(null, "", `?tab=registrants&w=${webinar.id}`);
                        }}
                        className={CARD_BTN}
                      >
                        <Users className="size-4" aria-hidden="true" />
                        Sign-ups
                      </Link>
                    ) : null}
                    {finished ? (
                      <Link href={`/provider/webinars/edit?id=${webinar.id}`} className={CARD_BTN}>
                        <RotateCcw className="size-4" aria-hidden="true" />
                        Run again
                      </Link>
                    ) : null}
                    {published && phase !== "closed" ? (
                      <>
                        <button type="button" onClick={() => void handleCopy(webinar)} className={CARD_BTN}>
                          <Copy className="size-4" aria-hidden="true" />
                          {copied === webinar.id ? "Copied" : "Copy link"}
                        </button>
                        <a
                          href={registrationUrl(webinar)}
                          target="_blank"
                          rel="noreferrer"
                          title="Open the registration page in a new tab"
                          className={CARD_BTN}
                        >
                          <ExternalLink className="size-4" aria-hidden="true" />
                          View page
                        </a>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleDelete(webinar)}
                      aria-label={`Delete ${webinar.name}`}
                      title="Delete this webinar"
                      className="grid size-11 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="size-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <NewWebinarDialog open={dialogOpen} busy={creating} onClose={closeDialog} onCreate={(input) => void handleCreate(input)} />
    </div>
  );
}

export default function WebinarsPage() {
  return (
    <Suspense fallback={null}>
      <Webinars />
    </Suspense>
  );
}
