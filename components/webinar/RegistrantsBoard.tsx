"use client";

/**
 * Everyone who registered, across all of the host's registration pages,
 * with a button per page plus search, time and "on more than one" filters.
 * Export always downloads exactly what is on screen.
 */
import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Search } from "lucide-react";
import {
  listAllRegistrants,
  webinarRegistrantsCsv,
  type Webinar,
  type WebinarRegistrant,
} from "@/lib/webinars";

type Period = "any" | "24h" | "7d" | "30d";
type Sort = "newest" | "oldest" | "name";

const PERIODS: Array<[Period, string]> = [
  ["any", "Any time"],
  ["24h", "Last 24 hours"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
];
const PERIOD_MS: Record<Period, number> = { any: 0, "24h": 864e5, "7d": 7 * 864e5, "30d": 30 * 864e5 };

export function RegistrantsBoard({ webinars, initialWebinarId }: { webinars: Webinar[]; initialWebinarId?: string }) {
  const [rows, setRows] = useState<WebinarRegistrant[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [webinarId, setWebinarId] = useState<string>(initialWebinarId && webinars.some((w) => w.id === initialWebinarId) ? initialWebinarId : "all");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<Period>("any");
  const [repeatOnly, setRepeatOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("newest");

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    listAllRegistrants(webinars)
      .then((r) => !cancelled && setRows(r))
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [webinars]);

  const all = useMemo(() => rows ?? [], [rows]);
  // How many webinars each email is on, for the "more than one" filter.
  const pagesPerEmail = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of all) {
      if (!map.has(r.email)) map.set(r.email, new Set());
      map.get(r.email)!.add(r.webinar_id);
    }
    return map;
  }, [all]);
  const countByWebinar = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of all) map.set(r.webinar_id, (map.get(r.webinar_id) ?? 0) + 1);
    return map;
  }, [all]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const filtered = all.filter((r) => {
      if (webinarId !== "all" && r.webinar_id !== webinarId) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.email.includes(q)) return false;
      if (period !== "any" && (!r.created_at || now - r.created_at.getTime() > PERIOD_MS[period])) return false;
      if (repeatOnly && (pagesPerEmail.get(r.email)?.size ?? 0) < 2) return false;
      return true;
    });
    const by = {
      newest: (a: WebinarRegistrant, b: WebinarRegistrant) => (b.created_at?.getTime() ?? 0) - (a.created_at?.getTime() ?? 0),
      oldest: (a: WebinarRegistrant, b: WebinarRegistrant) => (a.created_at?.getTime() ?? 0) - (b.created_at?.getTime() ?? 0),
      name: (a: WebinarRegistrant, b: WebinarRegistrant) => a.name.localeCompare(b.name),
    }[sort];
    return [...filtered].sort(by);
  }, [all, webinarId, search, period, repeatOnly, sort, pagesPerEmail]);

  const uniquePeople = new Set(shown.map((r) => r.email)).size;

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([webinarRegistrantsCsv(shown)], { type: "text/csv" }));
    const a = document.createElement("a");
    const label = webinarId === "all" ? "all-webinars" : (webinars.find((w) => w.id === webinarId)?.name ?? "webinar");
    a.href = url;
    a.download = `${label.replace(/[^\w-]+/g, "-").toLowerCase()}-registrants.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const chip = (active: boolean) =>
    `inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
      active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div>
      {/* One button per registration page */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <button type="button" onClick={() => setWebinarId("all")} className={chip(webinarId === "all")}>
          All pages
          <span className="tabular-nums opacity-70">{rows ? all.length : ""}</span>
        </button>
        {webinars.map((w) => (
          <button key={w.id} type="button" onClick={() => setWebinarId(w.id)} className={chip(webinarId === w.id)} title={w.title}>
            <span className="max-w-[180px] truncate">{w.name || w.title}</span>
            <span className="tabular-nums opacity-70">{rows ? (countByWebinar.get(w.id) ?? 0) : ""}</span>
          </button>
        ))}
      </div>

      {/* Other filters */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-xl border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          aria-label="Registered when"
          className="rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {PERIODS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort"
          className="rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A to Z</option>
        </select>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-input bg-card px-3 py-2 text-sm">
          <input type="checkbox" checked={repeatOnly} onChange={(e) => setRepeatOnly(e.target.checked)} />
          On 2+ webinars
        </label>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!shown.length}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-sm transition-colors hover:bg-secondary disabled:opacity-40"
        >
          <Download className="size-4" />
          Export CSV
        </button>
      </div>

      <p className="mt-3 text-sm text-muted-foreground" role="status">
        {rows === null
          ? "Loading registrants…"
          : `Showing ${shown.length} registration${shown.length === 1 ? "" : "s"} from ${uniquePeople} ${uniquePeople === 1 ? "person" : "people"}`}
      </p>

      <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-card">
        {rows === null ? (
          <div className="grid h-32 place-items-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : failed ? (
          <p className="px-5 py-12 text-center text-sm text-red-700">Registrants couldn&apos;t be loaded. Check your connection and refresh.</p>
        ) : shown.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">
            {all.length ? "Nobody matches these filters." : "No registrations yet. Publish a webinar and share its link to start getting them."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Email</th>
                  <th className="px-5 py-2.5 font-medium">Webinar</th>
                  <th className="px-5 py-2.5 font-medium">Registered</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const pages = pagesPerEmail.get(r.email)?.size ?? 1;
                  return (
                    <tr key={`${r.webinar_id}-${r.id}`} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        {r.name || "(no name)"}
                        {pages > 1 ? (
                          <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {pages} webinars
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{r.email}</td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => setWebinarId(r.webinar_id)}
                          className="max-w-[200px] truncate rounded-lg bg-secondary px-2 py-0.5 text-xs transition-colors hover:bg-secondary/70"
                          title="Show only this webinar"
                        >
                          {r.webinar_name}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{r.created_at ? r.created_at.toLocaleString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
