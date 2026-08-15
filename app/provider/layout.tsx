"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

import ProviderNavbar from "@/components/provider/ProviderNavbar";
import "../globals.css";

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen text-[#183d30] dark:text-[#ebf7f1]">
      <ProviderNavbar />

      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-6 md:px-6"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
