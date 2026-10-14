"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  extractYouTubeVideoId,
  useSpeakerVideo,
} from "@/lib/speaker-stream";
import CustomYouTubePlayer from "./CustomYouTubePlayer";

export default function SpeakerPortalView() {
  const { videoUrl, videoId, isLoaded, updateVideoUrl, removeVideo } =
    useSpeakerVideo();

  const [inputUrl, setInputUrl] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setInputUrl(videoUrl);
    }
  }, [isLoaded, videoUrl]);

  const previewId = extractYouTubeVideoId(inputUrl) || videoId;

  const handleSave = () => {
    updateVideoUrl(inputUrl);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2200);
  };

  const handleRemove = () => {
    setInputUrl("");
    removeVideo();
    setIsSaved(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-5">
        {/* Link adding field */}
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => {
            setInputUrl(e.target.value);
            if (isSaved) setIsSaved(false);
          }}
          placeholder="Enter YouTube video link..."
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#3478F6] focus:outline-none focus:ring-2 focus:ring-[#3478F6]/20 transition-all"
        />

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={handleSave}
            whileTap={{ scale: 0.96 }}
            animate={{
              backgroundColor: isSaved ? "#2563EB" : "#3478F6",
              scale: isSaved ? [1, 1.04, 1] : 1,
            }}
            transition={{ duration: 0.25 }}
            className="relative inline-flex min-w-[140px] items-center justify-center overflow-hidden rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-95"
          >
            <AnimatePresence mode="wait">
              {isSaved ? (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, y: 6, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex items-center gap-1.5 text-white"
                >
                  <motion.span
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 18,
                      delay: 0.05,
                    }}
                  >
                    <Check className="size-4 stroke-[2.5]" />
                  </motion.span>
                  <span>Changes Saved</span>
                </motion.span>
              ) : (
                <motion.span
                  key="save"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                >
                  Save Changes
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <button
            type="button"
            onClick={handleRemove}
            className="rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
          >
            Remove Stream
          </button>
        </div>

        {/* Video Preview */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border bg-black/5 flex items-center justify-center">
          {previewId ? (
            <CustomYouTubePlayer videoId={previewId} autoplay={false} />
          ) : (
            <div className="text-sm text-muted-foreground">
              No video preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
