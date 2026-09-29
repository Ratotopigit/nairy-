"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-66px)] w-full overflow-hidden bg-background">
      <div className="hidden md:flex w-80 flex-col border-r border-border p-4 space-y-4">
        <div className="h-9 w-full rounded-xl bg-muted/70 animate-pulse" />
        <div className="space-y-2 pt-2">
          <div className="h-14 w-full rounded-xl bg-muted/50 animate-pulse" />
          <div className="h-14 w-full rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-14 w-full rounded-xl bg-muted/30 animate-pulse" />
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-between p-6">
        <div className="space-y-4 max-w-3xl mx-auto w-full pt-8">
          <div className="h-6 w-48 rounded-lg bg-muted/60 animate-pulse" />
          <div className="h-20 w-3/4 rounded-2xl bg-muted/40 animate-pulse" />
          <div className="h-16 w-1/2 rounded-2xl bg-muted/30 animate-pulse ml-auto" />
        </div>
        <div className="max-w-3xl mx-auto w-full pb-4">
          <div className="h-24 w-full rounded-2xl bg-muted/50 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const WebinarChatSource = dynamic(() => import("./WebinarChat.source"), {
  ssr: false,
  loading: () => <ChatSkeleton />,
});

export default function WebinarChat() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <WebinarChatSource />
    </Suspense>
  );
}
