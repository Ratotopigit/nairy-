"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Bell } from "lucide-react";

import UserProfileDropdown from "@/components/provider/UserProfileDropdown";

const logo = "/assets/webinarstackai-logo.png";

export default function UserHeader() {
  return (
    <header className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-4 lg:px-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex items-center gap-3"
      >
        <Link
          href="/dashboard"
          className="grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Link>
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Webinar Stack Logo"
            draggable={false}
            className="select-none pointer-events-none h-8 sm:h-9 w-auto object-contain"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="flex items-center gap-3"
      >
        <button
          type="button"
          className="relative grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Notifications (3 unread)"
        >
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </button>
        <UserProfileDropdown />
      </motion.div>
    </header>
  );
}