"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight } from "lucide-react";

const logo = "/assets/AstraCraft-logo.jpeg";
const girlImg = "/assets/login-img/girl.png";
const ideaImg = "/assets/login-img/idea.png";
const pptImg = "/assets/login-img/ppt.png";
const chartImg = "/assets/login-img/chart.png";
const planImg = "/assets/login-img/plan.png";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      router.push("/dashboard");
    }, 1000);
  };

  return (
    <main className="min-h-screen w-full relative overflow-hidden flex items-center justify-center p-4 sm:p-6 bg-slate-900 font-sans">
      {/* 
        ========================================================================
        1. TWO-TONE ROOM BACKGROUND (Wall + Horizontal Ground)
        ========================================================================
      */}
      {/* Light Sage Wall Section */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#c1dfc4] via-[#b4d8b8] to-[#98c9a3] z-0" />

      {/* Deep Green Ground Floor (Straight horizontal split at 72%) */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#2d5a3f] via-[#1e3e2b] to-[#14281c] z-0"
        style={{
          clipPath: "polygon(0 72%, 100% 72%, 100% 100%, 0% 100%)",
        }}
      />

      {/* Soft Ambient Glow Overlay */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[30rem] h-[30rem] bg-emerald-900/20 rounded-full blur-3xl pointer-events-none" />

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
              alt="AstroCraft assistant at desk"
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
          RIGHT SIDE: Sign Up Form Card
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
                  alt="AstroCraft Logo"
                  width={40}
                  height={40}
                  draggable={false}
                  className="select-none pointer-events-none h-10 w-auto object-contain"
                />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900">
                AstroCraft
              </span>
            </div>

            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Create your account
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Join the AstroCraft Provider Workspace today.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

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

              {/* Confirm Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
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
                    <span>Create AstroCraft Account</span>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Social SSO Divider */}
            <div className="my-6 relative flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-xs text-slate-400 uppercase tracking-wider font-medium absolute">
                Or continue with
              </span>
            </div>

            {/* SSO Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-all"
              >
                <svg className="w-4 h-4 fill-current text-slate-900 mb-0.5" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.95.04-2.1.64-2.78 1.43-.61.71-1.14 1.86-1 2.97 1.07.08 2.13-.56 2.79-1.36z" />
                </svg>
                <span>Apple</span>
              </button>
            </div>

            {/* Footer Sign In Link */}
            <p className="mt-8 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-emerald-700 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}