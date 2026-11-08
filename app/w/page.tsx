"use client";

/**
 * Public registration page. Deliberately outside /provider so it is not
 * wrapped in AuthGuard — visitors register without an account.
 *
 * Two kinds of link land here:
 *   /<host>/<title>-<id>   the readable link. The site is a static export, so
 *                          Cloudflare serves this page for those paths
 *                          (functions/[host]/[slug].ts) and the id is read
 *                          from the address bar.
 *   /w?id=<id>             the original form, still valid everywhere.
 *
 * `?view=watch` shows the watch room and `?view=replay` the replay page;
 * anything else (or nothing) is the registration page.
 *
 * Only the id finds the webinar. Made-up paths without a real id are "not
 * available", and a real id with the wrong words is redirected to the
 * webinar's own link.
 */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { RegistrationPage } from "@/components/webinar/RegistrationPage";
import { ReplayPage } from "@/components/webinar/ReplayPage";
import { WatchRoom, rememberRegistration } from "@/components/webinar/WatchRoom";
import { getWebinar, idFromPublicPath, registerForWebinar, type Webinar } from "@/lib/webinars";

function PublicRegistration() {
  const params = useSearchParams();
  const queryId = params.get("id") ?? "";
  const rawView = params.get("view");
  const view = rawView === "watch" || rawView === "replay" ? rawView : null;
  const [state, setState] = useState<"loading" | "missing" | "unpublished" | "ready">("loading");
  const [webinar, setWebinar] = useState<Webinar | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = queryId || idFromPublicPath(window.location.pathname) || "";
    if (!/^[A-Za-z0-9]{1,64}$/.test(id)) {
      setState("missing");
      return;
    }
    void getWebinar(id).then((found) => {
      if (cancelled) return;
      // Only a published webinar is public. The rules already deny drafts to
      // visitors; this also covers the owner previewing while signed in.
      if (!found) {
        setState("missing");
        return;
      }
      if (found.status !== "published") {
        // Only the owner can read a draft, so this is them previewing.
        setState("unpublished");
        return;
      }
      // Show the webinar's own readable link in the address bar, whatever
      // was typed or shared, without reloading.
      if (found.public_path && window.location.pathname !== found.public_path) {
        window.history.replaceState(null, "", found.public_path + (view ? `?view=${view}` : "") + window.location.hash);
      }
      setWebinar(found);
      setState("ready");
      document.title = found.title;
    });
    return () => {
      cancelled = true;
    };
  }, [queryId, view]);

  if (state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfaf6]">
        <Loader2 className="size-5 animate-spin text-[#68736f]" />
      </div>
    );
  }

  if (state === "unpublished") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfaf6] px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-[#1d2a27]">This webinar isn&apos;t published yet</h1>
          <p className="mt-2 text-sm text-[#68736f]">Open it in your editor and press Publish. Nobody else can see it until you do.</p>
        </div>
      </div>
    );
  }

  if (state === "missing" || !webinar) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfaf6] px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-[#1d2a27]">This webinar isn&apos;t available</h1>
          <p className="mt-2 text-sm text-[#68736f]">
            This link doesn&apos;t match any webinar. Check that it was copied in full.
          </p>
        </div>
      </div>
    );
  }

  if (view === "watch") return <WatchRoom webinar={webinar} />;
  if (view === "replay") return <ReplayPage webinar={webinar} />;

  return (
    <div className="min-h-screen">
      <RegistrationPage
        webinar={webinar}
        mode="live"
        onRegister={async (name, email) => {
          const result = await registerForWebinar(webinar.id, name, email, webinar.delivery_type);
          // Lets the watch room offer this browser its join button (join-info flow).
          rememberRegistration(webinar.id, result.registrantId);
          return result;
        }}
      />
    </div>
  );
}

export default function PublicWebinarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbfaf6]" />}>
      <PublicRegistration />
    </Suspense>
  );
}
