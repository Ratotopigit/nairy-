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
    pathname.startsWith("/provider/webinar-chat") || pathname.startsWith("/provider/webinar-content");

  return (
    <AuthGuard>
    <div className="provider-page-canvas flex min-h-screen flex-col text-foreground overflow-x-hidden">
      <ProviderNavbar />

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={
            isBuilder
              ? "min-h-0 w-full flex-1 overflow-x-hidden"
              : "mx-auto w-full max-w-[1560px] px-3.5 sm:px-6 md:px-8 lg:px-10 pb-16 pt-4 sm:pt-6 overflow-x-hidden"
          }
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
    </AuthGuard>
  );
}
