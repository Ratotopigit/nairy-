"use client";

import type { Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void Promise.all([supabase.auth.getSession(), supabase.auth.getUser()]).then(
      ([{ data: sessionData }, { data: userData, error }]) => {
        if (!active) return;
        setSession(!error && userData.user ? sessionData.session : null);
      },
    );
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
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
