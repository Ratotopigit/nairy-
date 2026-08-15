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
      className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 lg:p-8 w-full"
    >
      <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
        <Shield className="w-5 h-5 text-emerald-600" />
        Security
      </h3>

      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-slate-900">Change Password</h4>
            {!showPasswordForm && !isChangingPassword && (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded-lg transition-colors"
              >
                Change Password
              </button>
            )}
          </div>

          {showPasswordForm && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="currentPassword" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all ${
                      passwordErrors.currentPassword ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all ${
                      passwordErrors.newPassword ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {passwordErrors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all ${
                      passwordErrors.confirmPassword ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
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
                  className="py-2.5 px-4 bg-[#0f172a] hover:bg-slate-800 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                >
                  {isChangingPassword ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-all"
                >
                  Cancel
                </button>
              </div>

              {passwordSuccess && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl"
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {passwordSuccess}
                </motion.p>
              )}
            </form>
          )}
        </motion.div>

        <div className="border-t border-slate-100 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          >
            <h4 className="text-sm font-medium text-slate-900 mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              Active Sessions
            </h4>
            {sessionFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                  sessionFeedback.type === "success"
                    ? "text-emerald-700 bg-emerald-50"
                    : "text-red-700 bg-red-50"
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
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{session.device}</span>
                        {session.current && (
                          <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
                        <span>{session.browser}</span>
                        <span>{session.location}</span>
                        <span>{session.lastActive}</span>
                      </div>
                    </div>
                  </div>
                  {!session.current && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center"
                      aria-label={`Revoke session on ${session.device}`}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
            <button
              className="mt-4 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2"
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
          className="border-t border-slate-100 pt-6"
        >
          <h4 className="text-sm font-medium text-slate-900 mb-4 flex items-center gap-2">
            <MoreHorizontal className="w-5 h-5 text-emerald-600" />
            Two-Factor Authentication
          </h4>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Authenticator App</p>
                <p className="text-sm text-slate-500 mt-0.5">Use Google Authenticator, Authy, or similar</p>
              </div>
              <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
                Enable 2FA
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}