"use client";

import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase/config";

export interface HomeContentSettings {
  youtubeUrl: string;
  youtubeVideoId: string | null;
  // Context highlight section
  tagline: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  actionHref: string;
  // Brand Tagline banner
  brandTagline1: string;
  brandTagline2: string;
  // Metadata
  updatedAt?: number;
  updatedBy?: string;
}

export interface SaveHomeSettingsResult {
  success: boolean;
  firestoreSaved: boolean;
  serverSaved: boolean;
  error?: string;
  warning?: string;
}

export const DEFAULT_HOME_CONTENT: HomeContentSettings = {
  youtubeUrl: "",
  youtubeVideoId: null,
  tagline: "YOUR BUSINESS. YOUR CONTEXT.",
  titleLine1: "Upload once.",
  titleLine2: "Create everything.",
  description:
    "WebinarStack remembers your context and uses it across all modules to generate smarter, more relevant results.",
  actionHref: "/provider/webinar-upload",
  brandTagline1: "Better Webinars.",
  brandTagline2: "Bigger Impact.",
};

const STORAGE_KEY = "webinarstack_home_settings_cache";
const FIRESTORE_COLLECTION = "system_settings";
const FIRESTORE_DOC_ID = "home_content";
const BROADCAST_CHANNEL_NAME = "webinarstack_home_settings_channel";
const CUSTOM_EVENT_NAME = "webinarstack_home_settings_updated";

/**
 * Extracts 11-char YouTube ID from standard links, share links, shorts, embeds, etc.
 */
export function extractYouTubeVideoId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const raw = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();

    if (host === "youtu.be" || host.endsWith(".youtu.be")) {
      const id = parsed.pathname.slice(1).split("/")[0]?.split("?")[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }

    const vParam = parsed.searchParams.get("v");
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
      return vParam;
    }

    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const triggerIdx = pathSegments.findIndex((seg) =>
      ["embed", "live", "v", "shorts"].includes(seg.toLowerCase())
    );
    if (triggerIdx !== -1 && pathSegments[triggerIdx + 1]) {
      const id = pathSegments[triggerIdx + 1];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
  } catch {
    // Fall through to regex
  }

  const match = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  if (match && match[1] && /^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
    return match[1];
  }

  return null;
}

export function getCachedHomeContent(): HomeContentSettings {
  if (typeof window === "undefined") return DEFAULT_HOME_CONTENT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_HOME_CONTENT, ...parsed };
    }
  } catch (err) {
    console.warn("Failed to parse cached home settings:", err);
  }
  return DEFAULT_HOME_CONTENT;
}

export function setCachedHomeContent(data: HomeContentSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota
  }
}

function broadcastSettingsChange(data: HomeContentSettings) {
  if (typeof window === "undefined") return;

  // 1. Same-tab event
  window.dispatchEvent(new CustomEvent(CUSTOM_EVENT_NAME, { detail: data }));

  // 2. Cross-tab BroadcastChannel
  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage(data);
      channel.close();
    }
  } catch {
    // BroadcastChannel unsupported or restricted
  }
}

/**
 * Saves global home content directly to Cloud Firestore.
 * Verifies write confirmation before updating local cache to prevent false positive saves.
 */
export async function saveGlobalHomeContent(
  settings: Partial<HomeContentSettings>,
  adminIdentifier?: string
): Promise<SaveHomeSettingsResult> {
  try {
    if (!isFirebaseConfigured || !db) {
      return {
        success: false,
        firestoreSaved: false,
        serverSaved: false,
        error: "Firebase is not initialized. Please check your configuration.",
      };
    }

    const videoId = extractYouTubeVideoId(settings.youtubeUrl ?? "");
    const merged: HomeContentSettings = {
      ...DEFAULT_HOME_CONTENT,
      ...getCachedHomeContent(),
      ...settings,
      youtubeVideoId: videoId,
      updatedAt: Date.now(),
      updatedBy: adminIdentifier || "admin",
    };

    // Commit write directly to Firestore database
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
    await setDoc(docRef, merged, { merge: true });

    // Only update cache and broadcast AFTER the remote write succeeds
    setCachedHomeContent(merged);
    broadcastSettingsChange(merged);

    return {
      success: true,
      firestoreSaved: true,
      serverSaved: true,
    };
  } catch (err: any) {
    console.error("[saveGlobalHomeContent] Error writing to Firestore:", err);
    const msg = err?.message || "Failed to save settings.";
    if (msg.includes("permission-denied") || msg.includes("Missing or insufficient permissions")) {
      return {
        success: false,
        firestoreSaved: false,
        serverSaved: false,
        error:
          "Firebase permission denied. Please publish the updated firestore.rules in Firebase Console (Rules tab).",
      };
    }
    return {
      success: false,
      firestoreSaved: false,
      serverSaved: false,
      error: msg,
    };
  }
}

/**
 * Manually fetches the latest settings from Firestore.
 */
export async function fetchRemoteHomeContent(): Promise<HomeContentSettings | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const remote = snapshot.data() as Partial<HomeContentSettings>;
      const updated: HomeContentSettings = {
        ...DEFAULT_HOME_CONTENT,
        ...remote,
        youtubeVideoId: extractYouTubeVideoId(remote.youtubeUrl ?? ""),
      };
      setCachedHomeContent(updated);
      return updated;
    }
  } catch (err: any) {
    console.warn("[fetchRemoteHomeContent] Warning:", err?.message);
  }
  return null;
}

/**
 * Universal React hook to read and observe global home page content in real-time.
 * Guarantees universal visibility for ALL users (admins, normal users, unauthenticated visitors).
 */
export function useHomeContent() {
  const [settings, setSettings] = useState<HomeContentSettings>(() => getCachedHomeContent());
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshHomeContent = useCallback(async () => {
    const remote = await fetchRemoteHomeContent();
    if (remote) {
      setSettings(remote);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const applyIncoming = (data: Partial<HomeContentSettings>) => {
      const updated: HomeContentSettings = {
        ...DEFAULT_HOME_CONTENT,
        ...data,
        youtubeVideoId: extractYouTubeVideoId(data.youtubeUrl ?? ""),
      };
      setSettings(updated);
      setCachedHomeContent(updated);
    };

    // 1. Initial cached render
    const cached = getCachedHomeContent();
    setSettings(cached);
    setIsLoaded(true);

    if (!isFirebaseConfigured || !db) {
      return;
    }

    const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);

    // 2. Direct server getDoc to pull latest database content immediately
    getDoc(docRef)
      .then((snapshot) => {
        if (snapshot.exists() && !isCancelled) {
          applyIncoming(snapshot.data() as Partial<HomeContentSettings>);
        }
      })
      .catch((err) => {
        console.warn("[useHomeContent] Direct getDoc warning:", err?.message);
      });

    // 3. Real-time subscription via onSnapshot
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists() && !isCancelled) {
          applyIncoming(snapshot.data() as Partial<HomeContentSettings>);
        }
      },
      (err) => {
        console.warn("[useHomeContent] Real-time snapshot warning:", err?.message);
      }
    );

    // 4. Same-tab Custom Event
    const handleCustom = (e: Event) => {
      const customEvent = e as CustomEvent<HomeContentSettings>;
      if (customEvent.detail && !isCancelled) {
        applyIncoming(customEvent.detail);
      }
    };
    window.addEventListener(CUSTOM_EVENT_NAME, handleCustom);

    // 5. Cross-tab BroadcastChannel
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannel.onmessage = (event) => {
          if (event.data && !isCancelled) {
            applyIncoming(event.data);
          }
        };
      } catch {
        // BroadcastChannel ignored if not allowed
      }
    }

    // 6. Cross-tab Storage Event fallback
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && !isCancelled) {
        try {
          const parsed = JSON.parse(e.newValue);
          applyIncoming(parsed);
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    // 7. Auto-refresh when user refocuses the tab
    const handleFocus = () => {
      getDoc(docRef)
        .then((snapshot) => {
          if (snapshot.exists() && !isCancelled) {
            applyIncoming(snapshot.data() as Partial<HomeContentSettings>);
          }
        })
        .catch(() => {});
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      isCancelled = true;
      unsubscribe();
      window.removeEventListener(CUSTOM_EVENT_NAME, handleCustom);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, []);

  return {
    settings,
    videoId: settings.youtubeVideoId,
    isLoaded,
    refreshHomeContent,
  };
}
