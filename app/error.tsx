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
    <main className="grid min-h-screen place-items-center px-6 text-[#0f281c]">
      <section className="w-full max-w-lg rounded-3xl border border-[#a3d9be] bg-white p-8 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2d6a4f]">
          AstroCraft
        </p>
        <h1 className="mt-3 text-2xl font-bold">This page could not load</h1>
        <p className="mt-3 text-sm leading-6 text-[#456357]">
          The rest of the workspace is safe. Try loading this page again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-full bg-[#183d30] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
