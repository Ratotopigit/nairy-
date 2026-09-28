"use client";

import { useCallback, useEffect, useState } from "react";

export const YOUTUBE_STORAGE_KEY = "webinarkit_speaker_youtube_url";
export const STREAM_EVENT_NAME = "webinarkit_speaker_video_changed";

/**
 * Extracts an 11-character YouTube video ID from various YouTube URL formats
 * or accepts a raw 11-char ID directly.
 */
export function extractYouTubeVideoId(
  urlOrId: string | null | undefined
): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // Direct 11-char ID check
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // URL parsing approach
  try {
    const raw =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`;

    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();

    // youtu.be/<id>
    if (host === "youtu.be" || host.endsWith(".youtu.be")) {
      const id = parsed.pathname.slice(1).split("/")[0]?.split("?")[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }

    // youtube.com/watch?v=<id>
    const vParam = parsed.searchParams.get("v");
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
      return vParam;
    }

    // youtube.com/embed/<id>, /live/<id>, /v/<id>, /shorts/<id>
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const triggerIdx = pathSegments.findIndex((seg) =>
      ["embed", "live", "v", "shorts"].includes(seg.toLowerCase())
    );
    if (triggerIdx !== -1 && pathSegments[triggerIdx + 1]) {
      const id = pathSegments[triggerIdx + 1];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
  } catch {
    // If URL parsing fails, fall through to regex
  }

  // General regex pattern match
  const match = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  if (match && match[1] && /^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
    return match[1];
  }

  return null;
}

/**
 * Retrieve saved YouTube URL from localStorage.
 */
export function getSpeakerVideoUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(YOUTUBE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Set saved YouTube URL into localStorage and dispatch custom event.
 */
export function setSpeakerVideoUrl(url: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(YOUTUBE_STORAGE_KEY, url.trim());
    window.dispatchEvent(new CustomEvent(STREAM_EVENT_NAME, { detail: url.trim() }));
  } catch (err) {
    console.error("Failed to save speaker video URL to localStorage:", err);
  }
}

/**
 * Remove saved YouTube URL from localStorage.
 */
export function clearSpeakerVideoUrl(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(YOUTUBE_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(STREAM_EVENT_NAME, { detail: "" }));
  } catch (err) {
    console.error("Failed to clear speaker video URL from localStorage:", err);
  }
}

/**
 * React hook to read and update speaker YouTube video URL across pages and tabs.
 */
export function useSpeakerVideo() {
  const [videoUrl, setVideoUrlState] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const initial = getSpeakerVideoUrl();
    setVideoUrlState(initial);
    setIsLoaded(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === YOUTUBE_STORAGE_KEY) {
        setVideoUrlState(e.newValue || "");
      }
    };

    const handleCustom = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail !== undefined) {
        setVideoUrlState(customEvent.detail);
      } else {
        setVideoUrlState(getSpeakerVideoUrl());
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(STREAM_EVENT_NAME, handleCustom);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(STREAM_EVENT_NAME, handleCustom);
    };
  }, []);

  const updateVideoUrl = useCallback((newUrl: string) => {
    setSpeakerVideoUrl(newUrl);
    setVideoUrlState(newUrl.trim());
  }, []);

  const removeVideo = useCallback(() => {
    clearSpeakerVideoUrl();
    setVideoUrlState("");
  }, []);

  const videoId = extractYouTubeVideoId(videoUrl);

  return {
    videoUrl,
    videoId,
    isLoaded,
    updateVideoUrl,
    removeVideo,
  };
}
