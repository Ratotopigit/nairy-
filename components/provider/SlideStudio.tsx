"use client";

import dynamic from "next/dynamic";

function SlideStudioSkeleton() {
  return (
    <div className="flex h-[calc(100vh-66px)] w-full flex-col overflow-hidden bg-background">
      {/* Top toolbar */}
      <div className="flex h-12 w-full items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <div className="h-7 w-28 rounded-lg bg-muted/70 animate-pulse" />
          <div className="h-6 w-20 rounded-md bg-muted/40 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 rounded-lg bg-muted/60 animate-pulse" />
          <div className="h-8 w-28 rounded-lg bg-muted/60 animate-pulse" />
        </div>
      </div>
      {/* Studio main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left slide thumbnails */}
        <div className="hidden sm:flex w-44 flex-col gap-3 border-r border-border p-3 overflow-hidden">
          <div className="aspect-[16/9] w-full rounded-lg bg-muted/60 animate-pulse" />
          <div className="aspect-[16/9] w-full rounded-lg bg-muted/40 animate-pulse" />
          <div className="aspect-[16/9] w-full rounded-lg bg-muted/30 animate-pulse" />
        </div>
        {/* Center slide canvas */}
        <div className="flex-1 flex items-center justify-center p-6 bg-muted/10">
          <div className="aspect-[16/9] w-full max-w-4xl rounded-2xl border border-border bg-card shadow-sm p-8 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-8 w-1/2 rounded-lg bg-muted/60 animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted/40 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 rounded-xl bg-muted/30 animate-pulse" />
              <div className="h-24 rounded-xl bg-muted/30 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SlideStudio = dynamic(() => import("./SlideStudio.source"), {
  ssr: false,
  loading: () => <SlideStudioSkeleton />,
});

export default SlideStudio;
