"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground sm:px-6">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          WebinarKit
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">This page could not load</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The rest of the workspace is safe. Try loading this page again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
