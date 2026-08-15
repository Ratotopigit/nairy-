"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Clock, Menu, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { href: "/provider/astro-ai", label: "Chat" },
  { href: "/provider/slides", label: "Slides" },
  { href: "/provider/uploads", label: "Uploads" },
  { href: "/provider/speaker-portal", label: "Speaker Portal" },
];

const sampleNotifications = [
  {
    id: 1,
    title: "New provider available",
    description: "Harper Ellis has opened new consultation slots for this week.",
    time: "2 min ago",
    read: false,
  },
  {
    id: 2,
    title: "Slide deck exported",
    description: "Your brand strategy presentation was exported successfully.",
    time: "1 hour ago",
    read: false,
  },
  {
    id: 3,
    title: "Upload complete",
    description: "Brand assets package has finished processing.",
    time: "3 hours ago",
    read: true,
  },
  {
    id: 4,
    title: "Session reminder",
    description: "Upcoming session with Mila Chen tomorrow at 10:00 AM.",
    time: "Yesterday",
    read: true,
  },
];

export default function ProviderNavbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(sampleNotifications);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    setIsMounted(true);
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // Close notification panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotifOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsNotifOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 bg-[#ebf7f1]/85 dark:bg-[#12251d]/85 backdrop-blur-xl border-b border-[#bfd8c8]/35 dark:border-[#204437]/45 transition-colors duration-300">
      <div className="w-full flex min-h-[72px] items-center justify-between gap-4 px-6 sm:px-8 md:px-10 lg:px-12 py-3 md:h-[72px] md:gap-8 md:py-0">
        {/* Left side: Brand Title */}
        <Link
          href="/provider"
          className="min-w-0 flex flex-col md:flex-row items-start md:items-baseline gap-0.5 md:gap-2.5 group transition-opacity hover:opacity-90"
        >
          <span className="font-bold text-base md:text-lg uppercase tracking-[0.02em] text-[#183d30] dark:text-[#ebf7f1] font-sans">
            AvatarCraft AI
          </span>
          <span className="text-[10px] font-mono leading-none uppercase tracking-[0.14em] text-[#587166] dark:text-[#90a89c]">
            Provider Network
          </span>
        </Link>

        {/* Center: Desktop Navigation */}
        <nav className="ml-auto hidden items-center gap-7 md:flex">
          {navItems.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                data-status={isActive ? "active" : undefined}
                aria-current={isActive ? "page" : undefined}
                className={`group relative text-sm py-1 transition-colors duration-200 ${
                  isActive
                    ? "text-[#183d30] dark:text-[#ebf7f1] font-semibold"
                    : "text-[#183d30]/75 dark:text-[#ebf7f1]/75 hover:text-[#183d30] dark:hover:text-[#ebf7f1]"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`absolute -bottom-1 left-0 h-[1.5px] w-full origin-left bg-[#183d30] dark:bg-[#ebf7f1] transition-transform duration-300 ${
                    isActive
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Right side: Utilities */}
        <div className="flex shrink-0 items-center gap-1 md:gap-1.5">
          {/* Theme toggle — clean, no border */}
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#183d30]/70 dark:text-[#ebf7f1]/70 transition-colors duration-200 hover:text-[#183d30] dark:hover:text-[#ebf7f1] hover:bg-[#183d30]/[0.06] dark:hover:bg-white/[0.08]"
          >
            {isMounted &&
              (isDark ? (
                <Sun className="h-[18px] w-[18px]" />
              ) : (
                <Moon className="h-[18px] w-[18px]" />
              ))}
          </button>

          {/* Notification bell — clean, no border, with dropdown */}
          <div ref={notifRef} className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#183d30]/70 dark:text-[#ebf7f1]/70 transition-colors duration-200 hover:text-[#183d30] dark:hover:text-[#ebf7f1] hover:bg-[#183d30]/[0.06] dark:hover:bg-white/[0.08]"
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#d14343] ring-2 ring-[#ebf7f1] dark:ring-[#12251d]" />
              )}
            </button>

            {/* Notification dropdown panel */}
            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-full mt-2.5 w-[360px] rounded-2xl border border-[#bfd8c8]/40 dark:border-[#2d564b]/40 bg-white dark:bg-[#1a3a2d] shadow-[0_20px_60px_rgba(24,61,48,0.12)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden z-50"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#bfd8c8]/25 dark:border-[#2d564b]/30">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-semibold text-[#183d30] dark:text-[#ebf7f1]">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#183d30] dark:bg-[#40916c] px-1.5 text-[10px] font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-xs font-medium text-[#587166] dark:text-[#90a89c] transition-colors hover:text-[#183d30] dark:hover:text-[#ebf7f1]"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification list */}
                  <div className="max-h-[340px] overflow-y-auto overscroll-contain">
                    {notifications.map((notif) => (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => markAsRead(notif.id)}
                        className={`w-full flex items-start gap-3.5 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-[#f4faf6] dark:hover:bg-[#183d30]/40 ${
                          !notif.read
                            ? "bg-[#edf8f1]/60 dark:bg-[#183d30]/20"
                            : ""
                        }`}
                      >
                        {/* Unread indicator */}
                        <div className="mt-1.5 shrink-0">
                          {!notif.read ? (
                            <span className="block h-2 w-2 rounded-full bg-[#183d30] dark:bg-[#40916c]" />
                          ) : (
                            <span className="block h-2 w-2 rounded-full bg-transparent" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-[13px] leading-snug ${
                              !notif.read
                                ? "font-semibold text-[#183d30] dark:text-[#ebf7f1]"
                                : "font-medium text-[#183d30]/80 dark:text-[#ebf7f1]/80"
                            }`}
                          >
                            {notif.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-[#587166] dark:text-[#90a89c] line-clamp-2">
                            {notif.description}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#587166]/70 dark:text-[#90a89c]/70">
                            <Clock className="h-3 w-3" />
                            {notif.time}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-[#bfd8c8]/25 dark:border-[#2d564b]/30 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setIsNotifOpen(false)}
                      className="w-full text-center text-xs font-medium text-[#587166] dark:text-[#90a89c] transition-colors hover:text-[#183d30] dark:hover:text-[#ebf7f1]"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile hamburger menu */}
          <button
            type="button"
            aria-label={
              isMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#183d30]/70 dark:text-[#ebf7f1]/70 transition-colors duration-200 hover:text-[#183d30] dark:hover:text-[#ebf7f1] hover:bg-[#183d30]/[0.06] dark:hover:bg-white/[0.08] md:hidden"
          >
            {isMenuOpen ? (
              <X className="h-[18px] w-[18px]" />
            ) : (
              <Menu className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="border-t border-[#bfd8c8]/30 dark:border-[#204437]/40 bg-[#ebf7f1] dark:bg-[#12251d] overflow-hidden md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {navItems.map(({ href, label }) => {
                const isActive = pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-[#183d30]/10 text-[#183d30] dark:bg-white/10 dark:text-[#ebf7f1] font-semibold"
                        : "text-[#183d30]/75 dark:text-[#ebf7f1]/75 hover:bg-[#183d30]/5 dark:hover:bg-white/5 hover:text-[#183d30] dark:hover:text-[#ebf7f1]"
                    }`}
                  >
                    <span>{label}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#183d30] dark:bg-[#ebf7f1]" />
                    )}
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
