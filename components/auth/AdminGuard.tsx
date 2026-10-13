"use client";

import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import { claimLocalData } from "@/lib/local-account";
import { checkIsAdmin, syncUserProfile } from "@/lib/user-profile";
import NotFound from "@/app/not-found";

interface AdminGuardProps {
  children: React.ReactNode;
}

// 2 minutes security tarpit (120,000ms)
const TARPIT_DURATION_MS = 120000;

export default function AdminGuard({ children }: AdminGuardProps) {
  const [authState, setAuthState] = useState<"loading" | "authorized" | "not_found">("loading");
  const tarpitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    let isCancelled = false;

    // Trigger 404 only after 2 minutes (120,000ms) has elapsed from mount
    const triggerTarpit404 = () => {
      if (tarpitTimerRef.current) return;
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, TARPIT_DURATION_MS - elapsed);

      tarpitTimerRef.current = setTimeout(() => {
        if (!isCancelled) {
          setAuthState("not_found");
        }
      }, remaining);
    };

    if (!isFirebaseConfigured || !auth) {
      triggerTarpit404();
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      // 1. Not logged in -> trigger tarpit (DO NOT redirect to login dashboard)
      if (!currentUser) {
        triggerTarpit404();
        return;
      }

      claimLocalData(currentUser.uid);

      // Automatically sync user document into `users` collection so owner sees their profile in Firebase!
      syncUserProfile(currentUser);

      // 2. Check if user has admin === true in database
      try {
        const isAdmin = await checkIsAdmin(currentUser);

        if (isAdmin) {
          // Immediately authorize genuine admin (no waiting)
          if (tarpitTimerRef.current) {
            clearTimeout(tarpitTimerRef.current);
          }
          if (!isCancelled) {
            setAuthState("authorized");
          }
        } else {
          // Non-admin user -> tarpit
          triggerTarpit404();
        }
      } catch (err) {
        triggerTarpit404();
      }
    });

    return () => {
      isCancelled = true;
      if (tarpitTimerRef.current) {
        clearTimeout(tarpitTimerRef.current);
      }
      unsubscribe();
    };
  }, []);

  // 1. Unauthorized after 2 minutes -> Render exact 404 Not Found component
  if (authState === "not_found") {
    return <NotFound />;
  }

  // 2. During the 2-minute tarpit / verification -> Neutral connecting screen (not login dashboard)
  if (authState === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#faf8f3] text-center p-4">
        <div className="flex flex-col items-center max-w-sm space-y-3">
          <div className="size-6 animate-spin rounded-full border-2 border-[#1f4d3d]/20 border-t-[#1f4d3d]" />
          <p className="text-xs text-[#526a61] font-medium tracking-tight">
            Connecting to workspace server...
          </p>
        </div>
      </div>
    );
  }

  // 3. Authorized admin
  return <>{children}</>;
}
