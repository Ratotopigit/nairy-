"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { checkUserOnboardingStatus } from "@/lib/onboarding";

// Image paths served from public directory (not bundled into worker)
const logo = "/assets/AstraCraft-logo.jpeg";
const girlImg = "/assets/login-img/girl.png";
const ideaImg = "/assets/login-img/idea.png";
const pptImg = "/assets/login-img/ppt.png";
const chartImg = "/assets/login-img/chart.png";
const planImg = "/assets/login-img/plan.png";

export default function LoginPage() {
  const router = useRouter();

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    if (!isFirebaseConfigured) {
      const isCompleted = await checkUserOnboardingStatus("demo-user-id");
      setIsLoading(false);
      router.replace(isCompleted ? "/provider" : "/onboarding");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const isCompleted = await checkUserOnboardingStatus(userCredential.user.uid);
      setIsLoading(false);
      router.replace(isCompleted ? "/provider" : "/onboarding");
    } catch (err: any) {
      setIsLoading(false);
      let msg = err?.message || "An unexpected error occurred during sign in.";
      if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/user-not-found" ||
        err?.code === "auth/wrong-password"
      ) {
        msg = "Invalid email or password.";
      } else if (err?.code === "auth/too-many-requests") {
        msg = "Too many failed login attempts. Please try again later.";
      } else if (err?.code === "auth/network-request-failed") {
        msg = "Unable to connect to Firebase authentication server. Please check your network connection.";
      }
      setAuthError(msg);
    }
  };

  return (
    <main className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 sm:p-6 font-sans">
      {/* 
        ========================================================================
        1. TWO-TONE ROOM BACKGROUND (Wall + Horizontal Ground)
        ========================================================================
      */}
      {/* Light Sage Wall Section */}
      {/* 
        ========================================================================
        2. CONTENT GRID
        ========================================================================
      */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* 
          ----------------------------------------------------------------------
          LEFT SIDE: Illustration positioned slightly left & grounded on floor
          HIDDEN on mobile/tablet (< lg)
          ----------------------------------------------------------------------
        */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="hidden lg:flex lg:col-span-7 flex-col justify-end items-start relative min-h-[480px] lg:min-h-[600px] pl-0 lg:pl-6"
        >
          {/* Subtle Glow behind character */}
          <div className="absolute left-1/4 top-1/3 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />

          {/* Character Container nudged left */}
          <div className="relative w-full max-w-lg aspect-square flex items-end justify-start">
            <img
              src={girlImg}
              alt="WebinarKit assistant at desk"
              width={520}
              height={520}
              draggable={false}
              className="select-none pointer-events-none object-contain w-auto h-auto max-h-[500px] drop-shadow-2xl translate-y-3"
            />

                        {/* Idea Lightbulb - static, hover golden glow retained */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.55, ease: "easeOut" }}
              className="absolute top-2 left-[36%] lg:top-4 lg:left-[40%] z-20"
            >
              <motion.div
                whileHover={{
                  scale: 1.15,
                  filter: "drop-shadow(0px 0px 20px rgba(251, 191, 36, 1))",
                }}
                className="relative cursor-pointer z-20"
              >
                {/* Ambient background aura that flares on hover */}
                <div className="absolute inset-0 bg-amber-300/0 hover:bg-amber-400/30 rounded-full blur-2xl transition-all duration-300 scale-150 pointer-events-none" />

                <img
                  src={ideaImg}
                  alt="Idea lightbulb"
                  width={70}
                  height={500}
                  draggable={false}
                  className="select-none w-12 lg:w-16 h-auto object-contain drop-shadow-[0_0_12px_rgba(251,191,36,0.65)] transition-all duration-300"
                />
              </motion.div>
            </motion.div>

            {/* PPT Image - fixed higher up in wall space above the desk plant */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
              whileHover={{ scale: 1.08 }}
              className="absolute top-[18%] right-1 lg:right-6 z-20 cursor-pointer"
            >
              <img
                src={pptImg}
                alt="Presentation slide"
                width={50}
                height={40}
                draggable={false}
                className="select-none w-20 lg:w-24 h-auto object-contain mix-blend-multiply drop-shadow-xl hover:drop-shadow-2xl transition-all duration-300"
              />
            </motion.div>

            {/* Chart (Analytics / Graph) - fixed on upper-right wall toward login card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.85, ease: "easeOut" }}
              whileHover={{ scale: 1.08 }}
              className="absolute top-[40%] -right-2 lg:-right-10 z-20 cursor-pointer"
            >
              <img
                src={chartImg}
                alt="Analytics chart"
                width={60}
                height={60}
                draggable={false}
                className="select-none w-16 lg:w-20 h-auto object-contain drop-shadow-xl hover:drop-shadow-2xl transition-all duration-300"
              />
            </motion.div>

            {/* Plan (Project / Blueprint) - fixed on upper-left wall balancing the lightbulb */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.75, ease: "easeOut" }}
              whileHover={{ scale: 1.08 }}
              className="absolute top-[14%] left-0 lg:left-4 z-20 cursor-pointer"
            >
<img
              src={planImg}
              alt="Project plan"
              width={60}
              height={60}
              draggable={false}
              className="select-none w-16 lg:w-20 h-auto object-contain drop-shadow-xl hover:drop-shadow-2xl transition-all duration-300"
            />
            </motion.div>
          </div>
        </motion.div>

        {/* 
          ----------------------------------------------------------------------
          RIGHT SIDE: Login Form Card
          On mobile: centered, max-w-md
          ----------------------------------------------------------------------
        */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lg:col-span-5 w-full max-w-md mx-auto"
        >
          <div className="bg-white shadow-2xl rounded-3xl p-8 lg:p-10 border border-slate-100">
            {/* Logo + Brand */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl overflow-hidden bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <img
                  src={logo}
                  alt="WebinarKit Logo"
                  width={40}
                  height={40}
                  draggable={false}
                  className="select-none pointer-events-none h-10 w-auto object-contain"
                />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                WebinarKit
              </span>
            </div>

            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Enter your credentials to access the WebinarKit Provider
                Workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#"
                  className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-sm shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 transition-all disabled:opacity-70"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </>
                )}
              </motion.button>
              {authError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {authError}
                </p>
              )}
            </form>

            <OAuthButtons onError={setAuthError} />

            {/* Footer Sign Up Link */}
            <p className="mt-8 text-center text-xs text-slate-500">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-emerald-700 hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
