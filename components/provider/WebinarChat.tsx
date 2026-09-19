"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const WebinarChatSource = dynamic(() => import("./WebinarChat.source"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
      Loading...
    </div>
  ),
});

export default function WebinarChat() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <WebinarChatSource />
    </Suspense>
  );
}
