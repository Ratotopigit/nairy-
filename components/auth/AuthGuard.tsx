"use client";

import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession({
        access_token: "demo-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "demo-refresh-token",
        user: {
          id: "demo-user-id",
          app_metadata: {},
          user_metadata: { full_name: "Demo Provider" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      } as Session);
      return;
    }

    let active = true;
    Promise.all([
      supabase.auth.getSession().catch(() => ({ data: { session: null } })),
      supabase.auth.getUser().catch(() => ({ data: { user: null }, error: null })),
    ]).then(([{ data: sessionData }, { data: userData, error }]) => {
      if (!active) return;
      setSession(!error && userData?.user ? sessionData?.session ?? null : null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      active = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [router, session]);

  if (session === undefined) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[#587166]">
        Checking your session...
      </div>
    );
  }

  if (!session) return null;
  return children;
}
