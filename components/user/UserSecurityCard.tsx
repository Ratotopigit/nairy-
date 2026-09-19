"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Shield, Smartphone, LogOut, Eye, EyeOff, MoreHorizontal, CheckCircle, AlertCircle } from "lucide-react";

interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  current: boolean;
}

const mockSessions: Session[] = [
  {
    id: "1",
    device: "MacBook Pro",
    browser: "Chrome 119.0",
    location: "San Francisco, CA",
    lastActive: "Just now",
    current: true,
  },
  {
    id: "2",
    device: "iPhone 15 Pro",
    browser: "Safari 17.1",
    location: "San Francisco, CA",
    lastActive: "2 hours ago",
    current: false,
  },
  {
    id: "3",
    device: "Windows PC",
    browser: "Firefox 119.0",
    location: "New York, NY",
    lastActive: "3 days ago",
    current: false,
  },
];

export default function UserSecurityCard() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<Partial<typeof passwordForm>>({});
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [sessionFeedback, setSessionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const validatePasswordForm = () => {
    const errors: Partial<typeof passwordForm> = {};
    if (!passwordForm.currentPassword) errors.currentPassword = "Current password is required";
    if (!passwordForm.newPassword) errors.newPassword = "New password is required";
    else if (passwordForm.newPassword.length < 8) errors.newPassword = "Password must be at least 8 characters";
    if (!passwordForm.confirmPassword) errors.confirmPassword = "Please confirm your new password";
    else if (passwordForm.newPassword !== passwordForm.confirmPassword) errors.confirmPassword = "Passwords do not match";
    setPasswordErrors(errors);
    setPasswordSuccess("");
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setIsChangingPassword(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPasswordSuccess("Password updated successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch {
      setPasswordErrors({ currentPassword: "Failed to update password" } as typeof passwordForm);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    if (sessionId === "1") {
      setSessionFeedback({ type: "error", message: "Cannot revoke current session" });
      return;
    }
    setSessionFeedback({ type: "success", message: "Session revoked successfully" });
    setTimeout(() => setSessionFeedback(null), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
      className="bg-card rounded-3xl border border-border p-6 lg:p-8 w-full"
    >
      <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        Security
      </h3>

      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-foreground">Change Password</h4>
            {!showPasswordForm && !isChangingPassword && (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="px-3 py-1.5 text-sm font-medium text-primary hover:opacity-80 bg-primary/10 rounded-lg transition-colors"
              >
                Change Password
              </button>
            )}
          </div>

          {showPasswordForm && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="currentPassword" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 bg-muted border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:bg-card transition-all ${
                      passwordErrors.currentPassword ? "border-accent focus:border-accent focus:ring-accent/20" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-1.5 text-xs text-accent flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 bg-muted border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:bg-card transition-all ${
                      passwordErrors.newPassword ? "border-accent focus:border-accent focus:ring-accent/20" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1.5 text-xs text-accent flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {passwordErrors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 bg-muted border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:bg-card transition-all ${
                      passwordErrors.confirmPassword ? "border-accent focus:border-accent focus:ring-accent/20" : "border-border"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-accent flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {passwordErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <motion.button
                  type="submit"
                  disabled={isChangingPassword}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="py-2.5 px-4 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                >
                  {isChangingPassword ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </motion.button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                    setPasswordErrors({});
                    setPasswordSuccess("");
                  }}
                  className="py-2.5 px-4 bg-muted hover:bg-secondary text-foreground rounded-xl font-medium text-sm transition-all"
                >
                  Cancel
                </button>
              </div>

              {passwordSuccess && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-2 rounded-xl"
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {passwordSuccess}
                </motion.p>
              )}
            </form>
          )}
        </motion.div>

        <div className="border-t border-border pt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          >
            <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Active Sessions
            </h4>
            {sessionFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                  sessionFeedback.type === "success"
                    ? "text-primary bg-primary/10"
                    : "text-accent bg-accent-soft"
                }`}
              >
                {sessionFeedback.type === "success" ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                {sessionFeedback.message}
              </motion.div>
            )}
            <div className="space-y-3">
              {mockSessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border hover:bg-muted transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{session.device}</span>
                        {session.current && (
                          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                        <span>{session.browser}</span>
                        <span>{session.location}</span>
                        <span>{session.lastActive}</span>
                      </div>
                    </div>
                  </div>
                  {!session.current && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent-soft transition-all flex items-center justify-center"
                      aria-label={`Revoke session on ${session.device}`}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
            <button
              className="mt-4 w-full py-2.5 px-4 bg-muted hover:bg-secondary text-foreground rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Revoke All Other Sessions</span>
            </button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
          className="border-t border-border pt-6"
        >
          <h4 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <MoreHorizontal className="w-5 h-5 text-primary" />
            Two-Factor Authentication
          </h4>
          <div className="p-4 bg-muted rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Authenticator App</p>
                <p className="text-sm text-muted-foreground mt-0.5">Use Google Authenticator, Authy, or similar</p>
              </div>
              <button className="px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-all">
                Enable 2FA
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}