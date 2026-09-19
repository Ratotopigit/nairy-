"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";

// ── Lazy framer-motion — page renders instantly; animations hydrate ~100ms later
const MotionDiv = dynamic(
  () => import("framer-motion").then((m) => ({ default: m.motion.div })),
  { ssr: false, loading: () => <div /> }
);
const MotionButton = dynamic(
  () => import("framer-motion").then((m) => ({ default: m.motion.button })),
  { ssr: false, loading: () => <button type="submit" /> }
);

// ── Lazy: only fetched after initial paint — removes firebase/auth from the
// initial webpack compile graph of this page entirely.
const OAuthButtons = dynamic(
  () => import("@/components/auth/OAuthButtons").then((m) => ({ default: m.OAuthButtons })),
  {
    ssr: false,
    loading: () => (
      <div className="mt-6 h-[72px] animate-pulse rounded-xl bg-muted" />
    ),
  }
);

// ── Inline env check — no Firebase SDK import required for this boolean ───
const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    !String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY).includes("INSERT_")
);

// Image paths served from public directory (not bundled into worker)
const logo = "/assets/webinarkit-logo.png";
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
      const { checkUserOnboardingStatus } = await import("@/lib/onboarding");
      const isCompleted = await checkUserOnboardingStatus("demo-user-id");
      setIsLoading(false);
      router.replace(isCompleted ? "/provider" : "/onboarding");
      return;
    }

    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase/config");
      const { checkUserOnboardingStatus } = await import("@/lib/onboarding");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const isCompleted = await checkUserOnboardingStatus(userCredential.user.uid);
      setIsLoading(false);
      router.replace(isCompleted ? "/provider" : "/onboarding");
    } catch (err: any) {
      setIsLoading(false);
      console.error("Sign-in error:", err);
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
      } else if (err?.code === "auth/unauthorized-domain") {
        msg = "This domain is not authorized in Firebase. Add your Cloudflare domain in Firebase Console > Authentication > Settings > Authorized domains.";
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
        <MotionDiv
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="hidden lg:flex lg:col-span-7 flex-col justify-end items-start relative min-h-[480px] lg:min-h-[600px] pl-0 lg:pl-6"
        >
          {/* Subtle Glow behind character */}
          <div className="absolute left-1/4 top-1/3 w-80 h-80 bg-secondary/60 rounded-full blur-3xl pointer-events-none" />

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
            <MotionDiv
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.55, ease: "easeOut" }}
              className="absolute top-2 left-[36%] lg:top-4 lg:left-[40%] z-20"
            >
              <div className="relative z-20">
                <img
                  src={ideaImg}
                  alt="Idea lightbulb"
                  width={70}
                  height={500}
                  draggable={false}
                  className="select-none pointer-events-none w-12 lg:w-16 h-auto object-contain drop-shadow-lg"
                />
              </div>
            </MotionDiv>

            {/* PPT Image - fixed higher up in wall space above the desk plant */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
              className="absolute top-[18%] right-1 lg:right-6 z-20"
            >
              <img
                src={pptImg}
                alt="Presentation slide"
                width={50}
                height={40}
                draggable={false}
                className="select-none pointer-events-none w-20 lg:w-24 h-auto object-contain mix-blend-multiply drop-shadow-lg"
              />
            </MotionDiv>

            {/* Chart (Analytics / Graph) - fixed on upper-right wall toward login card */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.85, ease: "easeOut" }}
              className="absolute top-[40%] -right-2 lg:-right-10 z-20"
            >
              <img
                src={chartImg}
                alt="Analytics chart"
                width={60}
                height={60}
                draggable={false}
                className="select-none pointer-events-none w-16 lg:w-20 h-auto object-contain drop-shadow-lg"
              />
            </MotionDiv>

            {/* Plan (Project / Blueprint) - fixed on upper-left wall balancing the lightbulb */}
            <MotionDiv
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.75, ease: "easeOut" }}
              className="absolute top-[14%] left-0 lg:left-4 z-20"
            >
<img
              src={planImg}
              alt="Project plan"
              width={60}
              height={60}
              draggable={false}
              className="select-none pointer-events-none w-16 lg:w-20 h-auto object-contain drop-shadow-lg"
            />
            </MotionDiv>
          </div>
        </MotionDiv>

        {/* 
          ----------------------------------------------------------------------
          RIGHT SIDE: Login Form Card
          On mobile: centered, max-w-md
          ----------------------------------------------------------------------
        */}
        <MotionDiv
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="lg:col-span-5 w-full max-w-md mx-auto"
        >
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 lg:p-10">
            {/* Brand Lockup: Logo beside WebinarKit */}
            <div className="flex items-center justify-center gap-2.5 mb-6">
              <img
                src={logo}
                alt="WebinarKit Logo"
                draggable={false}
                className="select-none pointer-events-none h-9 w-auto object-contain"
              />
              <span className="text-lg font-bold uppercase tracking-[-0.01em] text-foreground">
                WebinarKit
              </span>
            </div>

            <div className="mb-8 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sign in to your provider workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Input */}
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Mail className="size-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="size-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-input accent-[color:var(--primary)]"
                />
                <span>Remember me</span>
              </label>

              {/* Submit Button */}
              <MotionButton
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="size-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </MotionButton>
              {authError && (
                <p
                  role="alert"
                  className="rounded-xl border border-accent/40 bg-accent-soft px-3 py-2.5 text-xs leading-5 text-accent"
                >
                  {authError}
                </p>
              )}
            </form>

            <OAuthButtons onError={setAuthError} />

            {/* Footer Sign Up Link */}
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-foreground underline underline-offset-4"
              >
                Sign up
              </Link>
            </p>
          </div>
        </MotionDiv>
      </div>
    </main>
  );
}
