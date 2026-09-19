"use client";

import { AnimatePresence, motion } from "framer-motion";
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
    pathname.startsWith("/provider/webinar-chat") || pathname === "/provider/webinar-content";

  return (
    <AuthGuard>
    <div className="provider-page-canvas flex min-h-screen flex-col text-foreground">
      <ProviderNavbar />

      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={
            isBuilder
              ? "min-h-0 w-full flex-1"
              : "mx-auto w-full max-w-[1440px] px-4 pb-16 pt-8 sm:px-6 md:px-10 lg:px-12"
          }
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
    </AuthGuard>
  );
}
