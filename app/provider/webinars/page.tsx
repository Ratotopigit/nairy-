"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Copy, ExternalLink, Loader2, Plus, Trash2, Users } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import {
  countRegistrations,
  createWebinar,
  deleteWebinar,
  listWebinars,
  registrationUrl,
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

export default function WebinarsPage() {
  const router = useRouter();
  const [webinars, setWebinars] = useState<Webinar[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const rows = await listWebinars(user.uid);
        setWebinars(rows);
        // Counts load after the list so the page is usable immediately.
        const entries = await Promise.all(
          rows.map(async (w) => [w.id, await countRegistrations(w.id)] as const),
        );
        setCounts(Object.fromEntries(entries));
      } catch (e) {
        console.error("webinar list failed:", e);
        setError("Your webinars couldn't be loaded. Check your connection and refresh.");
        setWebinars([]);
      }
    });
    return unsubscribe;
  }, []);

  async function handleCreate() {
    const user = auth.currentUser;
    if (!user) return;
    setCreating(true);
    setError(null);
    try {
      const id = await createWebinar(user.uid);
      router.push(`/provider/webinars/edit?id=${id}`);
    } catch (e) {
      console.error("create webinar failed:", e);
      setError("A new webinar couldn't be created. Please try again.");
      setCreating(false);
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
      await navigator.clipboard.writeText(registrationUrl(webinar.id));
      setCopied(webinar.id);
      window.setTimeout(() => setCopied((c) => (c === webinar.id ? null : c)), 1600);
    } catch {
      setError("Couldn't copy the link — your browser blocked clipboard access.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Webinars</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registration pages for your sessions. Share the link; registrants appear here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          New webinar
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-6 space-y-3">
        {webinars === null ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-border bg-card/70" />
          ))
        ) : webinars.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong bg-card/60 px-6 py-14 text-center">
            <p className="font-medium">No webinars yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Create one to get a registration page with a live countdown that you can share anywhere.
            </p>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Plus className="size-4" />
              Create your first webinar
            </button>
          </div>
        ) : (
          webinars.map((webinar) => {
            const count = counts[webinar.id];
            const published = webinar.status === "published";
            return (
              <div
                key={webinar.id}
                className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-[0_10px_30px_-20px_rgba(29,42,39,0.35)] sm:flex-row sm:items-center"
              >
                <Link href={`/provider/webinars/edit?id=${webinar.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-medium">{webinar.name}</h2>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        published ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{webinar.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {count === undefined ? "…" : count === null ? "—" : `${count} registration${count === 1 ? "" : "s"}`}
                    </span>
                    <span>{sessionSummary(webinar.next_session_at)}</span>
                  </div>
                </Link>

                <div className="flex shrink-0 items-center gap-1.5">
                  {published ? (
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
                        href={registrationUrl(webinar.id)}
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
    </div>
  );
}
