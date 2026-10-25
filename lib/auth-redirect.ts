"use client";

/**
 * Where to send someone once we know they are signed in, and the hook that
 * keeps already-signed-in people off the login and signup pages.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { localDataOwner } from "@/lib/local-account";

/**
 * The `next` page a guard sent the user away from, if it is one of ours.
 * Only same-site workspace paths are accepted, so a crafted
 * /login?next=https://evil.example link cannot bounce people off-site.
 */
export function safeNextPath(): string | null {
  if (typeof window === "undefined") return null;
  const next = new URLSearchParams(window.location.search).get("next") ?? "";
  if (!/^\/(provider|admin)(?:[/?#]|$)/.test(next)) return null;
  if (next.startsWith("//") || next.includes("\\")) return null;
  return next;
}

/** Login target for a page a guard is bouncing a signed-out visitor from. */
export function loginUrlFor(path: string): string {
  return path && path !== "/provider" ? `/login?next=${encodeURIComponent(path)}` : "/login";
}

/** Workspace (or the page they came for), or onboarding if unfinished. */
export async function destinationFor(uid: string): Promise<string> {
  const { checkUserOnboardingStatus } = await import("@/lib/onboarding");
  const { pendingPlan } = await import("@/lib/plans");
  const completed = await checkUserOnboardingStatus(uid);
  if (!completed) return "/onboarding";
  // A plan picked on the promo site before signing in goes straight to Billing.
  const plan = pendingPlan();
  return safeNextPath() ?? (plan ? `/provider/billing?plan=${plan}` : "/provider");
}

/**
 * On the login and signup pages: if this browser is already signed in, go
 * straight to the workspace instead of asking for the password again.
 *
 * Returns true while that check is running and a session is expected (this
 * browser last belonged to someone), so the page can show a short
 * "signing you in" state instead of a form that is about to vanish.
 * Only the session found on arrival counts; sign-ins made on the page are
 * redirected by the page's own handlers.
 */
export function useRedirectIfSignedIn(): boolean {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    // Read after mount: the page is statically pre-rendered, so reading
    // storage during render would not match the server HTML.
    if (localDataOwner()) setChecking(true);
    // Both login and signup run this hook, so a ?plan= link survives either.
    void import("@/lib/plans").then(({ rememberPlanFromUrl }) => rememberPlanFromUrl());

    void (async () => {
      const [{ onAuthStateChanged }, { auth, isFirebaseConfigured }] = await Promise.all([
        import("firebase/auth"),
        import("@/lib/firebase/config"),
      ]);
      if (!active || !isFirebaseConfigured) return setChecking(false);
      let handled = false;
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (handled || !active) return;
        handled = true;
        if (!user) return setChecking(false);
        try {
          const target = await destinationFor(user.uid);
          if (active) router.replace(target);
        } catch {
          if (active) setChecking(false);
        }
      });
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [router]);

  return checking;
}
