"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, Plus, RotateCcw, Trash2, Users } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import { NewWebinarDialog } from "@/components/webinar/NewWebinarDialog";
import { RegistrantsBoard } from "@/components/webinar/RegistrantsBoard";
import {
  countRegistrations,
  createWebinar,
  deleteWebinar,
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

  const closeDialog = useCallback(() => setDialogOpen(false), []);

  async function handleCreate(input: { name: string; notes: string }) {
    const user = auth.currentUser;
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      const id = await createWebinar(user.uid, input);
      router.push(`/provider/webinars/edit?id=${id}`);
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
    <div className={`mx-auto w-full ${tab === "registrants" ? "max-w-6xl" : "max-w-4xl"}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Webinars</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registration pages for your sessions, and everyone who signed up to them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
          New webinar
        </button>
      </div>

      <div className="mt-5 flex items-center gap-1 border-b border-border">
        {(["webinars", "registrants"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              tab === key ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "webinars" ? "Registration pages" : "Registrants"}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {tab === "registrants" ? (
        <div className="mt-5">
          {webinars === null ? (
            <div className="grid h-40 place-items-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RegistrantsBoard key={focusWebinar ?? "all"} webinars={webinars} initialWebinarId={focusWebinar} />
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {webinars !== null && webinars.length > 0 ? (
            <div className="flex gap-1">
              {(["active", "history"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                    view === key ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {key === "active" ? `Active (${activeCount})` : `History (${historyCount})`}
                </button>
              ))}
            </div>
          ) : null}
          {webinars === null ? (
            [0, 1, 2].map((i) => <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-border bg-card/70" />)
          ) : webinars.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong bg-card/60 px-6 py-14 text-center">
              <p className="font-medium">No webinars yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Create one to get a registration page with a live countdown that you can share anywhere.
              </p>
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                <Plus className="size-4" />
                Create your first webinar
              </button>
            </div>
          ) : shown.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-strong bg-card/60 px-6 py-10 text-center text-sm text-muted-foreground">
              {view === "history"
                ? "Webinars move here a week after their session ends. Open one and pick a new date to run it again."
                : "Nothing active. Open one from History and pick a new date to run it again."}
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
                  className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_10px_30px_-20px_rgba(29,42,39,0.35)] sm:flex-row sm:items-center"
                >
                  <Link href={`/provider/webinars/edit?id=${webinar.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-medium">{webinar.name}</h2>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${chip.className}`}>
                        {chip.label}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{note || webinar.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" />
                        {count === undefined ? "…" : count === null ? "—" : `${count} registration${count === 1 ? "" : "s"}`}
                      </span>
                      <span>{sessionSummary(webinar.next_session_at)}</span>
                    </div>
                  </Link>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {count ? (
                      <Link
                        href={`/provider/webinars?tab=registrants&w=${webinar.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setFocusWebinar(webinar.id);
                          setTab("registrants");
                          window.history.replaceState(null, "", `?tab=registrants&w=${webinar.id}`);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-secondary"
                      >
                        <Users className="size-3.5" />
                        Registrants
                      </Link>
                    ) : null}
                    {finished ? (
                      <Link
                        href={`/provider/webinars/edit?id=${webinar.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-secondary"
                      >
                        <RotateCcw className="size-3.5" />
                        Run again
                      </Link>
                    ) : null}
                    {published && phase !== "closed" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleCopy(webinar)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-secondary"
                        >
                          <Copy className="size-3.5" />
                          {copied === webinar.id ? "Copied" : "Copy link"}
                        </button>
                        <a
                          href={registrationUrl(webinar)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Open registration page"
                          className="grid size-8 place-items-center rounded-lg border border-border transition-colors hover:bg-secondary"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleDelete(webinar)}
                      aria-label={`Delete ${webinar.name}`}
                      className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="size-3.5" />
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
