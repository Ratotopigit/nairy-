"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewAstroAIPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/provider/astro-ai/${crypto.randomUUID()}`);
  }, [router]);

  return <div className="grid min-h-[55vh] place-items-center text-sm text-muted-foreground">Opening a new Avatar IQ chat...</div>;
}
