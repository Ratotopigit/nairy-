"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { claimLocalData } from "@/lib/local-account";
import { useState } from "react";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import { checkUserOnboardingStatus } from "@/lib/onboarding";

type Props = {
  onError: (message: string | null) => void;
};

export function OAuthButtons({ onError }: Props) {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    onError(null);

    if (!isFirebaseConfigured) {
      const isCompleted = await checkUserOnboardingStatus("demo-user-id");
      setLoading(false);
      window.location.assign(isCompleted ? "/provider" : "/onboarding");
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      // Before caching this account's name and photo below.
      claimLocalData(user.uid);

      // Extract and cache Google photo URL and display name
      const googlePhoto =
        user.photoURL ||
        user.providerData?.find((p) => p.photoURL)?.photoURL ||
        null;

      if (googlePhoto && typeof window !== "undefined") {
        localStorage.setItem(`astrocraft_user_photo_${user.uid}`, googlePhoto);
        localStorage.setItem("astrocraft_user_photo", googlePhoto);
        localStorage.setItem("astrocraft_google_photo", googlePhoto);
      }

      if (user.displayName && typeof window !== "undefined") {
        const parts = user.displayName.trim().split(/\s+/);
        if (parts[0]) {
          localStorage.setItem("astrocraft_user_first_name", parts[0]);
          localStorage.setItem(`astrocraft_onboarding_first_name_${user.uid}`, parts[0]);
        }
        if (parts.length > 1) {
          localStorage.setItem("astrocraft_user_last_name", parts.slice(1).join(" "));
          localStorage.setItem(`astrocraft_onboarding_last_name_${user.uid}`, parts.slice(1).join(" "));
        }
      }

      const isCompleted = await checkUserOnboardingStatus(userCredential.user.uid);
      setLoading(false);
      window.location.assign(isCompleted ? "/provider" : "/onboarding");
    } catch (err: any) {
      setLoading(false);
      console.error("OAuth sign-in error:", err);
      if (err?.code === "auth/unauthorized-domain") {
        onError("This domain is not authorized in Firebase. Add your Cloudflare domain (e.g. *.pages.dev) in Firebase Console > Authentication > Settings > Authorized domains.");
        return;
      }
      if (err?.code === "auth/popup-closed-by-user") {
        return;
      }
      const msg =
        err?.code === "auth/network-request-failed"
          ? "Unable to connect to Firebase authentication server. Please check your network connection."
          : (err?.message || "OAuth sign in failed.");
      onError(msg);
    }
  }

  return (
    <div className="mt-6">
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-border" />
        <span className="absolute bg-card px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Or continue with
        </span>
      </div>

      <div className="mt-5">
        <button
          type="button"
          disabled={loading}
          onClick={signInWithGoogle}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-wait disabled:opacity-60"
        >
          <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z" />
            <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4L15.4 17c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.4H3a10 10 0 0 0 0 9.2l3.4-2.7Z" />
            <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.8 9.8 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z" />
          </svg>
          {loading ? "Connecting..." : "Google"}
        </button>
      </div>
    </div>
  );
}
