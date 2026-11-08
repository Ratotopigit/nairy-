"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Home, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PROVIDER_STEPS } from "@/lib/provider-steps";
import UserProfileDropdown from "./UserProfileDropdown";

const COLLAPSE_KEY = "provider-sidebar-collapsed";

// The profile menu opens upward from the bottom of the sidebar instead of down off-screen.
const MENU_UP =
  "[&>[role=menu]]:!bottom-full [&>[role=menu]]:!top-auto [&>[role=menu]]:!left-0 [&>[role=menu]]:!right-auto [&>[role=menu]]:!mb-2 [&>[role=menu]]:!mt-0 [&>[role=menu]]:!origin-bottom-left";
// In the narrow rail only the avatar shows.
const AVATAR_ONLY = "[&_button>span]:!hidden [&_button>svg]:!hidden";

const ITEMS = [
  { number: null, href: "/provider", label: "Home", description: "Your dashboard", icon: Home },
  ...PROVIDER_STEPS,
];

function Items({ pathname, collapsed = false }: { pathname: string; collapsed?: boolean }) {
  return (
    <ul className="grid gap-1">
      {ITEMS.map((item) => {
        const active = item.href === "/provider" ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              prefetch={true}
              aria-current={active ? "page" : undefined}
              title={collapsed ? `${item.number ? `${item.number}. ` : ""}${item.label}` : item.description}
              className={`flex items-center rounded-xl text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 ${
                collapsed ? "min-h-11 flex-col gap-1 px-1 py-2" : "min-h-12 gap-3 px-3 py-2.5"
              } ${active ? "bg-[#2563eb] text-white shadow-xs" : "text-[#334155] hover:bg-[#eaf1fd] hover:text-[#0f1f3a]"}`}
            >
              {item.number !== null ? (
                <span
                  aria-hidden="true"
                  className={`grid size-7 shrink-0 place-items-center rounded-md text-sm font-bold ${
                    active ? "bg-white/20 text-white" : "bg-[#eaf1fd] text-[#2563eb]"
                  }`}
                >
                  {item.number}
                </span>
              ) : null}
              <Icon aria-hidden="true" className={`size-5 shrink-0 ${active ? "" : "text-[#2563eb]"}`} />
              <span className={collapsed ? "sr-only" : "truncate"}>
                {item.number !== null && <span className="sr-only">Step {item.number}: </span>}
                {item.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function ProviderSidebar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {}
  };

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

  const logo = (
    <Link href="/provider" prefetch={true} aria-label="Webinar Stack home" className="flex shrink-0 items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]">
      <img src="/assets/webinarstackai-logo.png" alt="Webinar Stack" className="h-[40px] w-auto max-w-[170px] object-contain md:h-[44px]" />
    </Link>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`provider-nav easy-read sticky top-0 z-40 hidden h-dvh shrink-0 flex-col border-r border-[var(--nav-border)] bg-[var(--nav-surface)] md:flex ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <div className={`flex h-[66px] shrink-0 items-center ${collapsed ? "justify-center" : "justify-between px-4"}`}>
          {!collapsed && logo}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand side menu" : "Collapse side menu"}
            aria-expanded={!collapsed}
            title={collapsed ? "Show the menu labels" : "Make the menu narrow"}
            className="grid size-11 place-items-center rounded-lg text-[#475569] transition-colors hover:bg-[#eaf1fd] hover:text-[#0f1f3a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
        </div>

        <nav aria-label="Primary" className={`min-h-0 flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-3"} py-2`}>
          <Items pathname={pathname} collapsed={collapsed} />
        </nav>

        <div className={`shrink-0 border-t border-[var(--nav-border)] p-3 ${collapsed ? "flex justify-center" : ""}`}>
          <UserProfileDropdown className={`${MENU_UP} ${collapsed ? AVATAR_ONLY : "w-full [&>button]:w-full"}`} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="provider-nav easy-read sticky top-0 z-50 shrink-0 border-b border-border bg-background md:hidden">
        <div className="flex h-[65px] items-center gap-2.5 px-3 sm:px-6">
          <div className="mr-auto">{logo}</div>
          <UserProfileDropdown />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border-strong bg-card px-3 text-sm font-semibold text-foreground transition-colors active:bg-muted"
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            <span aria-hidden="true">{menuOpen ? "Close" : "Menu"}</span>
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              aria-label="Primary mobile"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-full max-h-[calc(100dvh-65px)] overflow-y-auto border-b border-border bg-background px-4 py-3 shadow-lg"
            >
              <Items pathname={pathname} />
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
