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
    pathname.startsWith("/provider/astro-ai") || pathname === "/provider/slides";

  return (
    <AuthGuard>
    <div className="provider-page-canvas flex min-h-screen flex-col text-[#1d2a27]">
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
              : "w-full px-6 pb-16 pt-6 sm:px-8 md:px-10 lg:px-12"
          }
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
    </AuthGuard>
  );
}
