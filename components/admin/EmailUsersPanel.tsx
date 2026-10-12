"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Loader2, Mail, Send, Users } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import {
  DEFAULT_FILTERS,
  filterUsers,
  listBroadcasts,
  listOptedOut,
  listUsers,
  startBroadcast,
  watchBroadcast,
  type AdminUser,
  type BroadcastResult,
  type UserFilters,
} from "@/lib/admin-email";
// The same template n8n sends, so the preview is the real email.
import { broadcastEmail } from "@/n8n/email/templates";

const SUBJECT_MAX = 150;
const MESSAGE_MAX = 10000;
const RESULT_TIMEOUT_MS = 3 * 60 * 1000;

type Sending =
  | { phase: "idle" }
  | { phase: "sending"; test: boolean; count: number }
  | { phase: "done"; result: BroadcastResult }
  | { phase: "unknown"; test: boolean }
  | { phase: "error"; message: string };

const FIELD =
  "w-full rounded-xl border border-[#d6e8dc] bg-white px-3.5 py-2.5 text-sm text-[#1f4d3d] outline-none transition focus:border-[#1f4d3d] focus:ring-2 focus:ring-[#1f4d3d]/15";

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function EmailUsersPanel() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [optedOut, setOptedOut] = useState<Set<string> | null>(null);
  const [history, setHistory] = useState<BroadcastResult[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("Hi {first_name},\n\n");
  const [sending, setSending] = useState<Sending>({ phase: "idle" });
  const stopWatching = useRef<(() => void) | null>(null);

  useEffect(() => {
    Promise.all([listUsers(), listOptedOut(), listBroadcasts()])
      .then(([u, o, h]) => {
        setUsers(u);
        setOptedOut(o);
        setHistory(h);
      })
      .catch((e) => {
        console.error("email page load failed:", e);
        setLoadError("Users couldn't be loaded. Make sure this account is marked admin, then refresh.");
        setUsers([]);
      });
    return () => stopWatching.current?.();
  }, []);

  const { recipients, optedOutCount } = useMemo(
    () => filterUsers(users ?? [], filters, optedOut),
    [users, filters, optedOut],
  );

  const preview = useMemo(() => {
    const sample = recipients[0] ?? { uid: "preview", name: "Alex Example", email: "alex@example.com" };
    return broadcastEmail({
      subject: subject || "Your subject",
      message: message.trim() || "Your message",
      recipient: { uid: sample.uid, name: sample.name, email: sample.email, token: "preview" },
    });
  }, [recipients, subject, message]);

  const ready = subject.trim().length > 0 && message.trim().replace(/^Hi \{first_name\},?/, "").trim().length > 0;
  const busy = sending.phase === "sending";

  async function send(test: boolean) {
    if (!ready || busy) return;
    if (!test) {
      const ok = window.confirm(
        `Send "${subject.trim()}" to ${recipients.length} ${recipients.length === 1 ? "person" : "people"}?\n\nThis can't be undone.`,
      );
      if (!ok) return;
    }
    stopWatching.current?.();
    setSending({ phase: "sending", test, count: test ? 1 : recipients.length });
    try {
      const id = await startBroadcast({
        subject: subject.trim(),
        message: message.trim(),
        recipientUids: recipients.map((r) => r.uid),
        test,
      });
      const timer = window.setTimeout(() => {
        stopWatching.current?.();
        setSending({ phase: "unknown", test });
      }, RESULT_TIMEOUT_MS);
      const unsubscribe = watchBroadcast(
        id,
        (result) => {
          window.clearTimeout(timer);
          unsubscribe();
          setSending({ phase: "done", result });
          setHistory((h) => [result, ...(h ?? []).filter((x) => x.broadcast_id !== id)].slice(0, 10));
        },
        () => {
          // Can't read results (rules not published yet): the send still went
          // to n8n, we just can't show how it went.
          window.clearTimeout(timer);
          setSending({ phase: "unknown", test });
        },
      );
      stopWatching.current = () => {
        window.clearTimeout(timer);
        unsubscribe();
      };
    } catch (e) {
      setSending({ phase: "error", message: e instanceof Error ? e.message : "Sending failed." });
    }
  }

  const set = <K extends keyof UserFilters>(key: K, value: UserFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen bg-[#faf8f3] pb-20 text-[#1f4d3d]">
      <header className="sticky top-0 z-30 border-b border-[#d6e8dc] bg-[#faf8f3]/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 py-2 sm:px-6">
          <Link
            href="/admin"
            className="grid size-9 place-items-center rounded-xl border border-[#d6e8dc] bg-white transition-colors hover:bg-[#e8f3ec]"
            title="Back to admin"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <span className="text-sm font-semibold tracking-tight">Email users</span>
          <span className="ml-auto truncate text-xs text-[#526a61]">Signed in as {auth.currentUser?.email}</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Audience */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-[#d6e8dc] bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-bold"><Users className="size-4" /> Who gets it</h2>
            <div className="mt-4 space-y-3">
              <input
                value={filters.search}
                onChange={(e) => set("search", e.target.value)}
                placeholder="Search name or email"
                className={FIELD}
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium">
                  Signed up
                  <select value={filters.joined} onChange={(e) => set("joined", e.target.value as UserFilters["joined"])} className={`${FIELD} mt-1`}>
                    <option value="any">Any time</option>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </label>
                <label className="block text-xs font-medium">
                  Activity
                  <select value={filters.activity} onChange={(e) => set("activity", e.target.value as UserFilters["activity"])} className={`${FIELD} mt-1`}>
                    <option value="any">Anyone</option>
                    <option value="active30">Active in last 30 days</option>
                    <option value="inactive30">Not seen in 30+ days</option>
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={filters.includeAdmins} onChange={(e) => set("includeAdmins", e.target.checked)} />
                Include admins
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-[#d6e8dc] bg-white shadow-xs">
            <div className="flex items-baseline justify-between gap-3 border-b border-[#e8efe9] px-5 py-3">
              <p className="text-sm font-bold">
                {users === null ? "Loading…" : `${recipients.length} ${recipients.length === 1 ? "person" : "people"}`}
              </p>
              <p className="text-right text-[11px] text-[#526a61]">
                {optedOut === null
                  ? "Unsubscribed users are skipped automatically when sending"
                  : optedOutCount
                    ? `${optedOutCount} unsubscribed, not included`
                    : "Nobody here has unsubscribed"}
              </p>
            </div>
            {loadError ? (
              <p role="alert" className="px-5 py-6 text-sm text-rose-700">{loadError}</p>
            ) : users === null ? (
              <div className="grid h-40 place-items-center"><Loader2 className="size-5 animate-spin text-[#526a61]" /></div>
            ) : recipients.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[#526a61]">Nobody matches these filters.</p>
            ) : (
              <ul className="max-h-[360px] divide-y divide-[#eef3ef] overflow-y-auto">
                {recipients.slice(0, 100).map((u) => (
                  <li key={u.uid} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{u.name || u.email.split("@")[0]}</span>
                      <span className="block truncate text-xs text-[#526a61]">{u.email}</span>
                    </span>
                    <span className="shrink-0 text-right text-[11px] text-[#526a61]">
                      Joined {formatDate(u.createdAt)}
                    </span>
                  </li>
                ))}
                {recipients.length > 100 ? (
                  <li className="px-5 py-2.5 text-center text-xs text-[#526a61]">and {recipients.length - 100} more</li>
                ) : null}
              </ul>
            )}
          </div>
        </section>

        {/* Message */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-[#d6e8dc] bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-bold"><Mail className="size-4" /> Message</h2>
            <div className="mt-4 space-y-3">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
                placeholder="Subject"
                className={FIELD}
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
                rows={8}
                className={`${FIELD} resize-y`}
              />
              <p className="text-[11px] leading-5 text-[#526a61]">
                Plain text. A blank line starts a new paragraph, <code>https://</code> links become clickable, and{" "}
                <code>{"{first_name}"}</code> becomes each person&apos;s first name. An unsubscribe link is added automatically.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void send(true)}
                  disabled={!ready || busy}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d6e8dc] px-4 py-2 text-sm font-medium transition hover:bg-[#e8f3ec] disabled:opacity-40"
                >
                  Send test to me
                </button>
                <button
                  type="button"
                  onClick={() => void send(false)}
                  disabled={!ready || busy || recipients.length === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1f4d3d] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#16392d] disabled:opacity-40"
                >
                  <Send className="size-3.5" />
                  Send to {recipients.length} {recipients.length === 1 ? "person" : "people"}
                </button>
              </div>
              <SendingStatus sending={sending} />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#d6e8dc] bg-white shadow-xs">
            <div className="border-b border-[#e8efe9] px-5 py-3 text-xs text-[#526a61]">
              <span className="font-semibold text-[#1f4d3d]">Preview</span> · {preview.subject}
              {recipients[0] ? ` · as ${recipients[0].email}` : ""}
            </div>
            {/* sandbox: the preview can never run script or navigate the page. */}
            <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="h-[460px] w-full bg-[#f4f1e8]" />
          </div>

          {history && history.length ? (
            <div className="rounded-2xl border border-[#d6e8dc] bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold">Recent</h2>
              <ul className="mt-3 divide-y divide-[#eef3ef] text-sm">
                {history.map((b) => (
                  <li key={b.broadcast_id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">
                      {b.test ? <span className="mr-1.5 rounded bg-[#eef3ef] px-1.5 py-0.5 text-[10px] font-semibold">TEST</span> : null}
                      {b.subject}
                    </span>
                    <span className="shrink-0 text-xs text-[#526a61]">
                      {b.sent} sent{b.failed ? ` · ${b.failed} failed` : ""} · {formatDate(b.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function SendingStatus({ sending }: { sending: Sending }) {
  if (sending.phase === "idle") return null;
  if (sending.phase === "sending") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-[#526a61]">
        <Loader2 className="size-4 animate-spin" />
        {sending.test ? "Sending your test…" : `Sending to ${sending.count} people… you can leave this page.`}
      </p>
    );
  }
  if (sending.phase === "error") {
    return (
      <p role="alert" className="flex items-start gap-2 text-sm text-rose-700">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        {sending.message}
      </p>
    );
  }
  if (sending.phase === "unknown") {
    return (
      <p role="status" className="flex items-start gap-2 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        {sending.test ? "Your test was handed to the email service." : "Your email was handed to the email service."}{" "}
        The result couldn&apos;t be shown here. Check your inbox, or n8n&apos;s executions.
      </p>
    );
  }
  const r = sending.result;
  const failed = r.status === "failed" || r.status === "partial";
  return (
    <p role={failed ? "alert" : "status"} className={`flex items-start gap-2 text-sm ${failed ? "text-rose-700" : "text-emerald-800"}`}>
      {failed ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : <Check className="mt-0.5 size-4 shrink-0" />}
      <span>
        {r.status === "empty"
          ? "Nobody to send to — everyone selected has unsubscribed or has no email."
          : `${r.test ? "Test sent" : `Sent to ${r.sent}`}${r.failed ? `, ${r.failed} failed` : ""}.`}
        {r.skipped_opted_out ? ` ${r.skipped_opted_out} skipped (unsubscribed).` : ""}
        {failed && r.error ? ` Reason: ${r.error}` : ""}
      </span>
    </p>
  );
}
