"use client";

import dynamic from "next/dynamic";


function UploadsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-44 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="h-9 w-9 rounded-xl bg-muted/60 animate-pulse" />
          <div className="h-5 w-28 rounded bg-muted/50 animate-pulse" />
          <div className="h-4 w-40 rounded bg-muted/30 animate-pulse" />
        </div>
        <div className="h-44 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="h-9 w-9 rounded-xl bg-muted/60 animate-pulse" />
          <div className="h-5 w-28 rounded bg-muted/50 animate-pulse" />
          <div className="h-4 w-40 rounded bg-muted/30 animate-pulse" />
        </div>
        <div className="h-44 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="h-9 w-9 rounded-xl bg-muted/60 animate-pulse" />
          <div className="h-5 w-28 rounded bg-muted/50 animate-pulse" />
          <div className="h-4 w-40 rounded bg-muted/30 animate-pulse" />
        </div>
      </div>
      <div className="h-52 rounded-2xl border border-border bg-card p-6 space-y-3">
        <div className="h-6 w-36 rounded bg-muted/60 animate-pulse" />
        <div className="h-24 w-full rounded-xl bg-muted/20 animate-pulse" />
      </div>
    </div>
  );
}

const UploadsManager = dynamic(() => import("@/components/provider/UploadsManager"), {
  ssr: false,
  loading: () => <UploadsSkeleton />,
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
