"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import { claimLocalData } from "@/lib/local-account";
import { loginUrlFor } from "@/lib/auth-redirect";
import { checkUserOnboardingStatus } from "@/lib/onboarding";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(() => {
    if (typeof window !== "undefined" && auth.currentUser) {
      // Runs before the first render of the workspace, so another account's
      // cached deck or chat is gone before any page can read it.
      claimLocalData(auth.currentUser.uid);
      return auth.currentUser;
    }
    return undefined;
  });
  const [isOnboarded, setIsOnboarded] = useState<boolean | undefined>(() => {
    if (typeof window !== "undefined") {
      const uid = auth.currentUser?.uid || localStorage.getItem("webinarstack_last_uid");
      if (uid && localStorage.getItem(`astrocraft_onboarding_completed_${uid}`) === "true") {
        return true;
      }
    }
    return undefined;
  });

  useEffect(() => {
    if (!isFirebaseConfigured) {
      router.replace("/login");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) claimLocalData(currentUser.uid);
      setUser(currentUser);
      if (currentUser) {
        try {
          localStorage.setItem("webinarstack_last_uid", currentUser.uid);
        } catch {}
        import("@/lib/user-profile").then(({ syncUserProfile }) => {
          syncUserProfile(currentUser);
        });
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user === null) {
      // Remember the page, so signing in lands there instead of the home screen.
      router.replace(loginUrlFor(window.location.pathname + window.location.search));
      return;
    }

    if (user) {
      let active = true;
      checkUserOnboardingStatus(user.uid).then((completed) => {
        if (!active) return;
        setIsOnboarded(completed);
        if (!completed) {
          router.replace("/onboarding");
        }
      });
      return () => {
        active = false;
      };
    }
  }, [router, user]);

  if (user === undefined || (user && isOnboarded === undefined)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-foreground animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/assets/webinarstackai-logo.png"
            alt="Webinar Stack"
            className="h-10 w-auto opacity-80"
          />
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="size-4 animate-spin rounded-full border-2 border-[#1f4d3d]/25 border-t-[#1f4d3d]" />
            <span>Loading workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user || isOnboarded === false) return null;
  return children;
}
