"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const UserProfileDropdown = dynamic(() => import("./UserProfileDropdown"), {
  ssr: false,
  loading: () => <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />,
});


const navItems = [
  { href: "/provider", label: "Home" },
  { href: "/provider/webinar-chat", label: "Webinar Chat" },
  { href: "/provider/webinar-offer", label: "Webinar Offer" },
  { href: "/provider/webinar-content", label: "Webinar Content" },
  { href: "/provider/webinar-upload", label: "Webinar Upload" },
  { href: "/provider/webinar-speaker", label: "Webinar Speaker" },
];

export default function ProviderNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="provider-nav sticky top-0 z-50 shrink-0 border-b border-border bg-background">
      <div className="mx-auto flex h-[66px] w-full max-w-[1440px] items-center gap-5 px-4 sm:px-6">
        <Link
          href="/provider"
          aria-label="Webinar Stack home"
          className="mr-auto flex shrink-0 items-center"
        >
          <img
            src="/assets/webinarstackai-logo.png"
            alt="Webinar Stack"
            className="h-[50px] sm:h-[54px] md:h-[58px] w-[185px] sm:w-[210px] md:w-[230px] object-fill transition-opacity hover:opacity-90"
          />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => {
            const active =
              item.href === "/provider"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative py-2 text-sm transition-colors ${
                  active
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-0 bottom-0 h-px origin-left bg-foreground transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
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
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
                      active
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                  >
                    {item.label}
                    <ArrowUpRight className="size-4 opacity-50" />
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
