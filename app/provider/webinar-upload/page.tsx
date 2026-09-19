"use client";

import dynamic from "next/dynamic";


const UploadsManager = dynamic(() => import("@/components/provider/UploadsManager"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[200px] place-items-center text-sm text-muted-foreground">
      Loading…
    </div>
  ),
});

export default function UploadsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Brand Assets
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Logos, Photos, and Source Files
        </h1>
      </header>

      <UploadsManager />
    </div>
  );
}
