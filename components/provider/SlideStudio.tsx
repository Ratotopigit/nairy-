"use client";

import dynamic from "next/dynamic";

const SlideStudio = dynamic(() => import("./SlideStudio.source"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
      Loading...
    </div>
  ),
});

export default SlideStudio;
