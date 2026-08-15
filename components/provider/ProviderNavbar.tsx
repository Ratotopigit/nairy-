"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Download, Menu, UserCircle2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import astroLogo from "@/assets/AstraCraft-logo.jpeg";

const navItems = [
  { href: "/provider/astro-ai", label: "Astro AI" },
  { href: "/provider/slides", label: "Slides" },
  { href: "/provider/uploads", label: "Uploads" },
  { href: "/provider/speaker-portal", label: "Speaker Portal" },
];

export default function ProviderNavbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image
            src={astroLogo}
            alt="AstroCraft Logo"
            width={36}
            height={36}
            className="w-9 h-9 object-cover rounded-xl border border-slate-100 shadow-xs"
          />

          <div className="min-w-0 truncate">
            <span className="truncate text-base font-black tracking-tight text-slate-900 sm:text-lg">
              AvatarCraft AI
            </span>
          </div>
        </div>

        <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-100/80 p-1 lg:flex">
          {navItems.map(({ href, label }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className="group relative inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-slate-500 transition-all duration-200 ease-out hover:text-emerald-600"
              >
                {isActive && (
                  <motion.span
                    layoutId="provider-tab-indicator"
                    transition={{
                      type: "spring",
                      stiffness: 360,
                      damping: 30,
                      mass: 0.7,
                    }}
                    className="absolute inset-0 rounded-full border border-emerald-200 bg-gradient-to-r from-emerald-500/12 via-emerald-500/8 to-white shadow-[0_8px_18px_-12px_rgba(16,185,129,0.55)]"
                  />
                )}

                <span className="relative z-10 transition-colors duration-200">
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 sm:h-10 sm:w-10"
          >
            <Bell className="h-4 w-4 sm:h-4 sm:w-4" />
          </button>

          <button
            type="button"
            className="hidden items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-500 hover:shadow-md sm:inline-flex sm:text-sm"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-gradient-to-br from-emerald-100 via-white to-slate-200 shadow-sm sm:h-10 sm:w-10">
            <UserCircle2 className="h-7 w-7 text-slate-700 sm:h-8 sm:w-8" />
          </div>

          <button
            type="button"
            aria-label={
              isMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
          >
            {isMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="border-t border-slate-200 bg-white/95 shadow-lg shadow-slate-200/60 backdrop-blur-sm lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-3 py-3 sm:px-4">
              {navItems.map(({ href, label }) => {
                const isActive =
                  pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>{label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="provider-mobile-tab-indicator"
                        className="absolute inset-y-1 left-1 right-1 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-white"
                        transition={{
                          type: "spring",
                          stiffness: 360,
                          damping: 30,
                        }}
                      />
                    )}
                  </Link>
                );
              })}

              <button
                type="button"
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-500 hover:shadow-md"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
