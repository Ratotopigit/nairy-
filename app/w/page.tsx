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
 * Only the id finds the webinar. Made-up paths without a real id are "not
 * available", and a real id with the wrong words is redirected to the
 * webinar's own link.
 */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { RegistrationPage } from "@/components/webinar/RegistrationPage";
import { getWebinar, idFromPublicPath, registerForWebinar, type Webinar } from "@/lib/webinars";

function PublicRegistration() {
  const queryId = useSearchParams().get("id") ?? "";
  const [state, setState] = useState<"loading" | "missing" | "ready">("loading");
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
      if (!found || found.status !== "published") {
        setState("missing");
        return;
      }
      // Show the webinar's own readable link in the address bar, whatever
      // was typed or shared, without reloading.
      if (found.public_path && window.location.pathname !== found.public_path) {
        window.history.replaceState(null, "", found.public_path + window.location.hash);
      }
      setWebinar(found);
      setState("ready");
      document.title = found.title;
    });
    return () => {
      cancelled = true;
    };
  }, [queryId]);

  if (state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfaf6]">
        <Loader2 className="size-5 animate-spin text-[#68736f]" />
      </div>
    );
  }

  if (state === "missing" || !webinar) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbfaf6] px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-[#1d2a27]">This webinar isn&apos;t available</h1>
          <p className="mt-2 text-sm text-[#68736f]">
            The link may be wrong, or registration may have closed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <RegistrationPage
        webinar={webinar}
        mode="live"
        onRegister={(name, email) => registerForWebinar(webinar.id, name, email)}
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
