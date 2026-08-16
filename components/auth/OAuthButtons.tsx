"use client";

import { useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

type OAuthProvider = "google" | "apple";

type Props = {
  onError: (message: string | null) => void;
};

export function OAuthButtons({ onError }: Props) {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);

  async function signIn(provider: OAuthProvider) {
    setLoadingProvider(provider);
    onError(null);

    if (!isSupabaseConfigured) {
      setLoadingProvider(null);
      window.location.assign("/provider");
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/provider`,
        },
      });

      if (error) {
        setLoadingProvider(null);
        const msg = error.message?.toLowerCase().includes("fetch failed")
          ? "Unable to connect to Supabase authentication server. Please verify your Supabase project URL and network connection."
          : error.message;
        onError(msg);
      }
    } catch (err: any) {
      setLoadingProvider(null);
      const msg = err?.message?.toLowerCase().includes("fetch failed")
        ? "Unable to connect to Supabase authentication server. Please verify your Supabase project URL and network connection."
        : (err?.message || "OAuth sign in failed.");
      onError(msg);
    }
  }

  return (
    <div className="mt-6">
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-slate-200" />
        <span className="absolute bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Or continue with
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={loadingProvider !== null}
          onClick={() => signIn("google")}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z" />
            <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4L15.4 17c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3v2.7A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.4H3a10 10 0 0 0 0 9.2l3.4-2.7Z" />
            <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.8A9.8 9.8 0 0 0 12 2a10 10 0 0 0-9 5.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z" />
          </svg>
          {loadingProvider === "google" ? "Connecting..." : "Google"}
        </button>

        <button
          type="button"
          disabled={loadingProvider !== null}
          onClick={() => signIn("apple")}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        >
          <svg aria-hidden="true" className="size-4 fill-current" viewBox="0 0 24 24">
            <path d="M17.1 12.5c0-2.4 2-3.6 2.1-3.7a4.6 4.6 0 0 0-3.7-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-1-3.3-.9a4.9 4.9 0 0 0-4.1 2.5c-1.8 3-.5 7.6 1.2 10 .8 1.2 1.8 2.5 3.1 2.4 1.2 0 1.7-.8 3.3-.8 1.5 0 2 .8 3.3.8 1.4 0 2.3-1.2 3.1-2.4a11 11 0 0 0 1.4-2.9 4.2 4.2 0 0 1-2.5-3.9ZM14.5 5.2A4.3 4.3 0 0 0 15.5 2a4.5 4.5 0 0 0-3 1.5 4.1 4.1 0 0 0-1.1 3.1 3.7 3.7 0 0 0 3.1-1.4Z" />
          </svg>
          {loadingProvider === "apple" ? "Connecting..." : "Apple"}
        </button>
      </div>
    </div>
  );
}
