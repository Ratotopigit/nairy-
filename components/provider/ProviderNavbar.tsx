"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import UserProfileDropdown from "./UserProfileDropdown";

const navItems = [
  { href: "/provider", label: "Home" },
  { href: "/provider/webinar-chat", label: "Webinar Chat" },
  { href: "/provider/webinar-offer", label: "Webinar Offer" },
  { href: "/provider/webinar-content", label: "Webinar Content" },
  { href: "/provider/webinar-upload", label: "Webinar Upload" },
];

export default function ProviderNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Preload tab chunks in browser idle time for zero-latency tab transitions
  useEffect(() => {
    const preloadChunks = () => {
      import("@/components/provider/WebinarChat.source").catch(() => {});
      import("@/components/provider/SlideStudio.source").catch(() => {});
      import("@/components/provider/UploadsManager").catch(() => {});
    };

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        const handle = (window as unknown as { requestIdleCallback: (cb: () => void, opts: { timeout: number }) => number }).requestIdleCallback(preloadChunks, { timeout: 2000 });
        return () => {
          (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(handle);
        };
      } else {
        const timer = setTimeout(preloadChunks, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  return (
    <header className="provider-nav sticky top-0 z-50 shrink-0 border-b border-border bg-background">
      <div className="mx-auto flex h-[66px] w-full max-w-[1560px] items-center gap-2.5 sm:gap-4 md:gap-6 px-3 sm:px-6">
        <Link
          href="/provider"
          prefetch={true}
          aria-label="Webinar Stack home"
          className="mr-auto flex shrink-0 items-center"
        >
          <img
            src="/assets/webinarstackai-logo.png"
            alt="Webinar Stack"
            className="h-[36px] sm:h-[46px] md:h-[50px] w-auto max-w-[170px] sm:max-w-[220px] object-contain transition-opacity hover:opacity-90"
          />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => {
            const active =
              item.href === "/provider"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-current={active ? "page" : undefined}
                className={`group relative py-2.5 text-sm transition-colors duration-150 ${
                  active
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
                {active && (
                  <motion.span
                    layoutId="activeProviderTabUnderline"
                    className="absolute inset-x-0 bottom-0 h-[2.5px] rounded-full bg-[#1f4d3d]"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                      mass: 0.8,
                    }}
                  />
                )}
                {!active && (
                  <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#1f4d3d]/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                )}
              </Link>
            );
          })}
        </nav>

        <UserProfileDropdown />

        <button
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((open) => !open)}
          className="grid size-9 place-items-center rounded-xl border border-border-strong bg-card text-muted-foreground md:hidden"
        >
          {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            aria-label="Primary mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border bg-background px-4 py-3 md:hidden"
          >
            <div className="grid gap-1">
              {navItems.map((item) => {
                const active =
                  item.href === "/provider"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm transition-all duration-150 ${
                      active
                        ? "bg-[#1f4d3d] text-white font-medium shadow-xs"
                        : "text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                  >
                    {item.label}
                    <ArrowUpRight className={`size-4 ${active ? "opacity-90" : "opacity-50"}`} />
                  </Link>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
