"use client";

import { MotionConfig } from "framer-motion";
import { usePathname } from "next/navigation";

import ProviderNavbar from "@/components/provider/ProviderNavbar";
import AuthGuard from "@/components/auth/AuthGuard";
import "../globals.css";

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isBuilder =
    pathname.startsWith("/provider/webinar-chat") || pathname.startsWith("/provider/webinar-content");

  // The page fade lives in template.tsx, which Next remounts per route. Keying
  // <main> here with an exit animation rendered every new page twice and held
  // navigation until the old one had faded out.
  return (
    <AuthGuard>
    <MotionConfig reducedMotion="user">
    <div className="provider-page-canvas flex min-h-screen flex-col text-foreground overflow-x-hidden">
      <ProviderNavbar />

      <main
        className={
          isBuilder
            ? "min-h-0 w-full flex-1 overflow-x-hidden"
            : "mx-auto w-full max-w-[1560px] px-3.5 sm:px-6 md:px-8 lg:px-10 pb-16 pt-4 sm:pt-6 overflow-x-hidden"
        }
      >
        {children}
      </main>
    </div>
    </MotionConfig>
    </AuthGuard>
  );
}
