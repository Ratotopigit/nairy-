"use client";

/**
 * Public registration page. Deliberately outside /provider so it is not
 * wrapped in AuthGuard — visitors register without an account.
 *
 * The webinar id travels as ?id= rather than a path segment: this is a static
 * export, and a dynamic segment only prerenders its placeholder, so a real id
 * in the path would 404.
 */
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { RegistrationPage } from "@/components/webinar/RegistrationPage";
import { getWebinar, registerForWebinar, type Webinar } from "@/lib/webinars";

function PublicRegistration() {
  const id = useSearchParams().get("id") ?? "";
  const [state, setState] = useState<"loading" | "missing" | "ready">("loading");
  const [webinar, setWebinar] = useState<Webinar | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
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
      setWebinar(found);
      setState("ready");
      document.title = found.title;
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

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
    <RegistrationPage
      webinar={webinar}
      mode="live"
      onRegister={(name, email) => registerForWebinar(webinar.id, name, email)}
    />
  );
}

export default function PublicWebinarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbfaf6]" />}>
      <PublicRegistration />
    </Suspense>
  );
}
