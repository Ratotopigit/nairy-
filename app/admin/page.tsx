"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Video, FileEdit, AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";
import AdminGuard from "@/components/auth/AdminGuard";
import CustomYouTubePlayer from "@/components/provider/CustomYouTubePlayer";
import {
  extractYouTubeVideoId,
  DEFAULT_HOME_CONTENT,
  saveGlobalHomeContent,
  useHomeContent,
  type HomeContentSettings,
} from "@/lib/home-settings";
import { auth } from "@/lib/firebase/config";

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContentManager />
    </AdminGuard>
  );
}

function AdminContentManager() {
  const { settings, isLoaded, refreshHomeContent } = useHomeContent();
  const [form, setForm] = useState<HomeContentSettings>(DEFAULT_HOME_CONTENT);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [syncStatus, setSyncStatus] = useState<{
    firestore: boolean | null;
    server: boolean | null;
  }>({ firestore: null, server: null });
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isLoaded && !isInitializedRef.current) {
      setForm(settings);
      isInitializedRef.current = true;
    }
  }, [isLoaded, settings]);

  const previewId = extractYouTubeVideoId(form.youtubeUrl);

  const handleInputChange = (field: keyof HomeContentSettings, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (saveSuccess) setSaveSuccess(false);
    if (errorMessage) setErrorMessage("");
    if (warningMessage) setWarningMessage("");
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshHomeContent();
    setIsRefreshing(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    setWarningMessage("");

    const currentUserEmail = auth?.currentUser?.email || "admin";
    const res = await saveGlobalHomeContent(form, currentUserEmail);

    setIsSaving(false);
    setSyncStatus({ firestore: res.firestoreSaved, server: res.serverSaved });

    if (res.success) {
      if (res.warning) {
        setWarningMessage(res.warning);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } else {
      setErrorMessage(res.error || "Failed to update home content.");
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] text-[#1f4d3d] font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#d6e8dc] bg-[#faf8f3]/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-4xl flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/provider"
              className="grid size-9 place-items-center rounded-xl border border-[#d6e8dc] bg-card text-[#1f4d3d] transition-colors hover:bg-[#e8f3ec]"
              title="Return to Workspace"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <span className="text-sm font-semibold tracking-tight text-[#1f4d3d]">
              Home Settings
            </span>
          </div>

          {/* Save Status / Feedback */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 text-xs text-[#526a61] hover:text-[#1f4d3d] border border-[#d6e8dc] rounded-lg px-2.5 py-1 transition disabled:opacity-50"
              title="Re-fetch from server & Firestore"
            >
              <RefreshCw className={`size-3 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {saveSuccess && syncStatus.firestore && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <Check className="size-3.5" />
                <span>Synced Universally</span>
              </div>
            )}
            {saveSuccess && !syncStatus.firestore && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <AlertTriangle className="size-3.5" />
                <span>Saved locally (Firestore Warning)</span>
              </div>
            )}
            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                <AlertCircle className="size-3.5" />
                <span className="truncate max-w-[160px] sm:max-w-[200px]">{errorMessage}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 pt-6 sm:pt-8 sm:px-6 space-y-6">
        {/* Warning Banner if Firestore rejected save */}
        {warningMessage && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs flex items-start gap-3">
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-950">Cloud Firestore Sync Notice</p>
              <p className="text-amber-800 leading-relaxed">{warningMessage}</p>
              <p className="text-[11px] text-amber-700 font-mono mt-1">
                Tip: In Firebase Console &gt; Firestore Database &gt; Rules, ensure your account is marked admin (admin: true in users, admins or workspace_memory) — only admins may write &quot;system_settings&quot;.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* 1. YouTube Video URL & Live Preview */}
          <div className="rounded-2xl sm:rounded-3xl border border-[#d6e8dc] bg-card p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-xl bg-[#e3f0e7] text-[#1f4d3d]">
                <Video className="size-4" />
              </div>
              <h2 className="text-sm font-bold text-[#1f4d3d]">Home Video</h2>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#526a61]">
                YouTube URL or Video ID
              </label>
              <input
                type="text"
                value={form.youtubeUrl}
                onChange={(e) => handleInputChange("youtubeUrl", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl border border-[#d6e8dc] bg-[#f4fbf7] px-4 py-2.5 text-sm text-[#1f4d3d] placeholder:text-muted-foreground focus:border-[#1f4d3d] focus:outline-none focus:ring-2 focus:ring-[#1f4d3d]/20 transition-all"
              />
            </div>

            {/* Live Video Preview (Responsive aspect-video) */}
            <div className="relative w-full max-w-lg aspect-video rounded-2xl border border-[#d6e8dc] bg-black/5 overflow-hidden shadow-xs mt-3">
              {previewId ? (
                <CustomYouTubePlayer videoId={previewId} autoplay={false} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  No video is Connected
                </div>
              )}
            </div>
          </div>

          {/* 2. Home Page Content Edit Fields */}
          <div className="rounded-3xl border border-[#d6e8dc] bg-card p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-xl bg-[#faead4] text-[#9a6a18]">
                <FileEdit className="size-4" />
              </div>
              <h2 className="text-sm font-bold text-[#1f4d3d]">Home Page Content</h2>
            </div>

            {/* Context Highlight Card Fields */}
            <div className="space-y-4 pt-2 border-t border-[#d6e8dc]">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-[#526a61] font-semibold">
                Context Highlight
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#526a61]">Tagline</label>
                  <input
                    type="text"
                    value={form.tagline}
                    onChange={(e) => handleInputChange("tagline", e.target.value)}
                    className="w-full rounded-xl border border-[#d6e8dc] bg-[#f4fbf7] px-3.5 py-2 text-sm text-[#1f4d3d] focus:border-[#1f4d3d] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#526a61]">Title Line 1</label>
                  <input
                    type="text"
                    value={form.titleLine1}
                    onChange={(e) => handleInputChange("titleLine1", e.target.value)}
                    className="w-full rounded-xl border border-[#d6e8dc] bg-[#f4fbf7] px-3.5 py-2 text-sm text-[#1f4d3d] focus:border-[#1f4d3d] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#526a61]">Title Line 2</label>
                  <input
                    type="text"
                    value={form.titleLine2}
                    onChange={(e) => handleInputChange("titleLine2", e.target.value)}
                    className="w-full rounded-xl border border-[#d6e8dc] bg-[#f4fbf7] px-3.5 py-2 text-sm text-[#1f4d3d] focus:border-[#1f4d3d] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#526a61]">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="w-full rounded-xl border border-[#d6e8dc] bg-[#f4fbf7] px-3.5 py-2 text-sm text-[#1f4d3d] focus:border-[#1f4d3d] focus:outline-none transition-all resize-y"
                />
              </div>
            </div>

            {/* Brand Taglines Fields */}
            <div className="space-y-4 pt-4 border-t border-[#d6e8dc]">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-[#526a61] font-semibold">
                Brand Taglines
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#526a61]">Tagline Line 1</label>
                  <input
                    type="text"
                    value={form.brandTagline1}
                    onChange={(e) => handleInputChange("brandTagline1", e.target.value)}
                    className="w-full rounded-xl border border-[#d6e8dc] bg-[#f4fbf7] px-3.5 py-2 text-sm text-[#1f4d3d] focus:border-[#1f4d3d] focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#526a61]">Tagline Line 2</label>
                  <input
                    type="text"
                    value={form.brandTagline2}
                    onChange={(e) => handleInputChange("brandTagline2", e.target.value)}
                    className="w-full rounded-xl border border-[#d6e8dc] bg-[#f4fbf7] px-3.5 py-2 text-sm text-[#1f4d3d] focus:border-[#1f4d3d] focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full bg-[#1f4d3d] px-7 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#16392d] disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="size-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="size-4 text-emerald-300" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
