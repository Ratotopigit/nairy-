"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, LogOut } from "lucide-react";

const logo = "/assets/AstraCraft-logo.jpeg";

export default function UserHeader() {
  return (
    <header className="w-full flex items-center justify-between px-4 py-4 lg:px-8 lg:py-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex items-center gap-3"
      >
        <Link
          href="/dashboard"
          className="p-2 rounded-xl bg-white/80 hover:bg-white shadow-sm transition-all flex items-center justify-center backdrop-blur-sm"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl overflow-hidden bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <img
              src={logo}
              alt="AstroCraft Logo"
              width={40}
              height={40}
              draggable={false}
              className="select-none pointer-events-none h-10 w-auto object-contain"
            />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 hidden sm:block">
            AstroCraft
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="flex items-center gap-3"
      >
        <button
          className="p-2.5 rounded-xl bg-white/80 hover:bg-white shadow-sm transition-all flex items-center justify-center backdrop-blur-sm"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </button>
        <Link
          href="/login"
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium flex items-center gap-2 transition-all shadow-sm shadow-slate-900/10"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </Link>
      </motion.div>
    </header>
  );
}