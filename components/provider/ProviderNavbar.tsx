"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { href: "/provider", label: "Home" },
  { href: "/provider/astro-ai", label: "Avatar IQ" },
  { href: "/provider/offer-iq", label: "Offer IQ" },
  { href: "/provider/slides", label: "Content" },
  { href: "/provider/uploads", label: "Uploads" },
  { href: "/provider/speaker-portal", label: "Speakers" },
];

export default function ProviderNavbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  return (
    <header className="provider-nav sticky top-0 z-50 shrink-0 border-b border-[var(--nav-border)] bg-[var(--nav-bg)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-5 px-4 sm:px-6">
        <Link href="/provider" className="mr-auto min-w-0">
          <span className="flex items-baseline gap-2">
            <span className="text-base font-bold uppercase tracking-[-0.01em] text-[var(--nav-ink)]">
              AstroCraft
            </span>
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--nav-muted)] sm:inline">
              Creation Studio
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
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
                    ? "font-semibold text-[var(--nav-ink)]"
                    : "text-[var(--nav-muted)] hover:text-[var(--nav-ink)]"
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-0 bottom-0 h-px origin-left bg-[var(--nav-ink)] transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label="Sign out"
          onClick={signOut}
          className="grid size-9 place-items-center rounded-xl border border-[var(--nav-border-strong)] bg-[var(--nav-surface)] text-[var(--nav-muted)] transition hover:border-[var(--nav-ink)] hover:text-[var(--nav-ink)]"
        >
          <LogOut className="size-4" />
        </button>

        <button
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((open) => !open)}
          className="grid size-9 place-items-center rounded-xl border border-[var(--nav-border-strong)] bg-[var(--nav-surface)] text-[var(--nav-muted)] md:hidden"
        >
          {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-[var(--nav-border)] bg-[var(--nav-bg)] px-4 py-3 md:hidden"
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
                        ? "bg-[var(--nav-ink)] text-[var(--nav-bg)]"
                        : "text-[var(--nav-muted)] hover:bg-[var(--nav-surface)] hover:text-[var(--nav-ink)]"
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
