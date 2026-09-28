"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";

export default function NotFound() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsAuthenticated(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
    });

    return () => unsubscribe();
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground sm:px-6">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-xs">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Webinar Stack
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {isAuthenticated
            ? "The page you are looking for does not exist or has moved."
            : "The page you are looking for does not exist or requires you to log in."}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/provider"
              className="w-full sm:w-auto inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Return to Workspace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Return to Login
              </Link>
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-block rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Create Account
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
