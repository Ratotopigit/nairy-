"use client";

/**
 * Where the "Unsubscribe" link in announcement emails lands. Public: no login.
 *
 * It asks for a click rather than unsubscribing on load, because email
 * security scanners pre-open every link in a message and would otherwise
 * unsubscribe people who never asked to be.
 */
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { n8nWebhookUrl } from "@/lib/n8n-url";

type State = "ready" | "working" | "done" | "invalid" | "error";

function Unsubscribe() {
  const params = useSearchParams();
  const uid = params.get("u") ?? "";
  const token = params.get("t") ?? "";
  const linkLooksValid = /^[A-Za-z0-9_-]{1,128}$/.test(uid) && /^[a-f0-9]{16,64}$/.test(token);
  const [state, setState] = useState<State>(linkLooksValid ? "ready" : "invalid");

  async function confirm() {
    setState("working");
    try {
      const res = await fetch(n8nWebhookUrl("email-unsubscribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ u: uid, t: token }),
      });
      setState(res.ok ? "done" : res.status === 400 ? "invalid" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f1e8] px-5">
      <div className="w-full max-w-md rounded-2xl border border-[#ddd7ca] bg-white p-7 text-center text-[#1d2a27] shadow-sm reg-rise">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#68736f]">Webinar Stack</p>
        {state === "done" ? (
          <>
            <div className="mx-auto mt-5 grid size-11 place-items-center rounded-full bg-[#1f4d3d] text-white">
              <Check className="size-5" />
            </div>
            <h1 className="mt-4 text-xl font-semibold">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-sm leading-6 text-[#68736f]">
              You won&apos;t get announcement emails any more. Emails about your own account and webinars you
              register for will still arrive.
            </p>
          </>
        ) : state === "invalid" ? (
          <>
            <h1 className="mt-4 text-xl font-semibold">This link isn&apos;t valid</h1>
            <p className="mt-2 text-sm leading-6 text-[#68736f]">
              It may be incomplete. Try clicking the unsubscribe link in the email again, or reply to the email
              and ask to be removed.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-xl font-semibold">Unsubscribe from announcements?</h1>
            <p className="mt-2 text-sm leading-6 text-[#68736f]">
              You&apos;ll stop getting news and announcement emails from Webinar Stack.
            </p>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={state === "working"}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f4d3d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#16392d] disabled:opacity-70"
            >
              {state === "working" ? <Loader2 className="size-4 animate-spin" /> : null}
              Unsubscribe
            </button>
            {state === "error" ? (
              <p role="alert" className="mt-3 text-sm text-red-700">
                That didn&apos;t go through. Please try again in a moment.
              </p>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f4f1e8]" />}>
      <Unsubscribe />
    </Suspense>
  );
}
