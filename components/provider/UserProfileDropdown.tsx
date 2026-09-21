"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Check,
  ChevronDown,
  Edit3,
  Loader2,
  LogOut,
  Trash2,
  UploadCloud,
  User as UserIcon,
  X,
} from "lucide-react";
import { onAuthStateChanged, signOut as firebaseSignOut, updateProfile, type User } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, isFirebaseConfigured, storage } from "@/lib/firebase/config";
import { resolveUserFirstName } from "@/lib/onboarding";
import { loadWorkspaceMemory, saveWorkspaceMemory } from "@/lib/workspace-memory";

interface UserProfileDropdownProps {
  className?: string;
}

export default function UserProfileDropdown({ className = "" }: UserProfileDropdownProps) {
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => auth.currentUser || null);
  const [firstName, setFirstName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("astrocraft_user_first_name");
      if (cached) return cached;
    }
    if (auth.currentUser?.displayName) {
      const parts = auth.currentUser.displayName.trim().split(/\s+/).filter(Boolean);
      if (parts[0]) return parts[0];
    }
    return "";
  });
  const [lastName, setLastName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("astrocraft_user_last_name");
      if (cached) return cached;
    }
    if (auth.currentUser?.displayName) {
      const parts = auth.currentUser.displayName.trim().split(/\s+/).filter(Boolean);
      if (parts.length > 1) return parts.slice(1).join(" ");
    }
    return "";
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    if (auth.currentUser?.photoURL) return auth.currentUser.photoURL;
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("astrocraft_user_photo") ||
        localStorage.getItem("astrocraft_google_photo") ||
        null
      );
    }
    return null;
  });
  const [imgError, setImgError] = useState(false);
  const [modalImgError, setModalImgError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      if (
        localStorage.getItem("astrocraft_user_first_name") ||
        localStorage.getItem("astrocraft_user_photo")
      ) {
        return false;
      }
    }
    if (auth.currentUser) return false;
    return true;
  });

  // Modals
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Form states for username modal
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameSuccess, setUsernameSuccess] = useState(false);

  // Form states for photo modal
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    setMounted(true);

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsUsernameModalOpen(false);
        setIsPhotoModalOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Listen to auth state and initialize profile info
  useEffect(() => {
    async function syncUserData(user: User | null) {
      setCurrentUser(user);
      if (!user) {
        // Retrieve cached or demo user
        const cachedFirst =
          typeof window !== "undefined"
            ? localStorage.getItem("astrocraft_user_first_name")
            : null;
        const cachedLast =
          typeof window !== "undefined"
            ? localStorage.getItem("astrocraft_user_last_name")
            : null;
        const cachedPhoto =
          typeof window !== "undefined"
            ? localStorage.getItem("astrocraft_user_photo_demo-user-id") ||
              localStorage.getItem("astrocraft_google_photo") ||
              localStorage.getItem("astrocraft_user_photo")
            : null;

        if (cachedFirst) setFirstName(cachedFirst);
        if (cachedLast) setLastName(cachedLast);
        if (cachedPhoto) setPhotoUrl(cachedPhoto);
        setIsInitializing(false);
        return;
      }

      // 1. Resolve first and last name from memory or auth
      let resolvedFirst = "";
      let resolvedLast = "";

      try {
        const memory = await loadWorkspaceMemory(user.uid);
        resolvedFirst = resolveUserFirstName(user, memory);
        if (memory?.last_name && typeof memory.last_name === "string") {
          resolvedLast = memory.last_name.trim();
        }
      } catch {
        resolvedFirst = resolveUserFirstName(user, null);
      }

      // Check localStorage if not in memory
      if (typeof window !== "undefined") {
        if (!resolvedFirst) {
          resolvedFirst =
            localStorage.getItem(`astrocraft_user_first_name_${user.uid}`) ||
            localStorage.getItem("astrocraft_user_first_name") ||
            "";
        }
        if (!resolvedLast) {
          resolvedLast =
            localStorage.getItem(`astrocraft_user_last_name_${user.uid}`) ||
            localStorage.getItem("astrocraft_user_last_name") ||
            "";
        }
      }

      // Check user.displayName
      if (user.displayName) {
        const parts = user.displayName.trim().split(/\s+/).filter(Boolean);
        if (!resolvedFirst && parts[0]) resolvedFirst = parts[0];
        if (!resolvedLast && parts.length > 1) resolvedLast = parts.slice(1).join(" ");
      }

      // Fallback defaults: derive from email or generic label if completely empty
      if (!resolvedFirst) {
        if (user.email) {
          const emailPrefix = user.email.split("@")[0];
          resolvedFirst = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        } else {
          resolvedFirst = "User";
        }
      }

      setFirstName(resolvedFirst);
      setLastName(resolvedLast);

      // Cache resolved names into localStorage for instant synchronous hydration on next reload
      if (typeof window !== "undefined") {
        if (resolvedFirst) {
          localStorage.setItem("astrocraft_user_first_name", resolvedFirst);
          localStorage.setItem(`astrocraft_user_first_name_${user.uid}`, resolvedFirst);
        }
        if (resolvedLast) {
          localStorage.setItem("astrocraft_user_last_name", resolvedLast);
          localStorage.setItem(`astrocraft_user_last_name_${user.uid}`, resolvedLast);
        }
      }

      // 2. Resolve photo URL (prioritizing Google profile picture)
      const googleProvider = Array.isArray(user.providerData)
        ? user.providerData.find(
            (p) =>
              (p?.providerId === "google.com" || p?.providerId?.includes("google")) &&
              Boolean(p?.photoURL)
          )
        : null;

      let photo = googleProvider?.photoURL || user.photoURL || null;

      // Check any provider in providerData
      if (!photo && Array.isArray(user.providerData)) {
        for (const p of user.providerData) {
          if (p?.photoURL) {
            photo = p.photoURL;
            break;
          }
        }
      }

      // Check Firestore workspace memory
      if (!photo) {
        try {
          const memory = await loadWorkspaceMemory(user.uid);
          if (memory?.photo_url) {
            photo = memory.photo_url;
          }
        } catch {
          // ignore
        }
      }

      // Check localStorage cache
      if (!photo && typeof window !== "undefined") {
        photo =
          localStorage.getItem(`astrocraft_user_photo_${user.uid}`) ||
          localStorage.getItem("astrocraft_user_photo") ||
          localStorage.getItem("astrocraft_google_photo") ||
          null;
      }

      if (photo) {
        setPhotoUrl(photo);
        setImgError(false);
        if (typeof window !== "undefined") {
          localStorage.setItem(`astrocraft_user_photo_${user.uid}`, photo);
          localStorage.setItem("astrocraft_user_photo", photo);
        }
        // Ensure root Firebase user object has photoURL synced
        if (!user.photoURL && auth.currentUser) {
          updateProfile(auth.currentUser, { photoURL: photo }).catch(() => {});
        }
      } else {
        setPhotoUrl(null);
      }

      setIsInitializing(false);
    }

    if (!isFirebaseConfigured) {
      syncUserData(auth.currentUser);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      syncUserData(user);
    });

    return () => unsubscribe();
  }, []);

  // Reset img error states when URLs change
  useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  useEffect(() => {
    setModalImgError(false);
  }, [photoPreview]);

  // Compute initials: Initial of BOTH names (e.g. John Doe -> "JD")
  const displayInitials = (() => {
    const f = (firstName || "").trim();
    const l = (lastName || "").trim();
    if (f && l) {
      return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
    }
    if (currentUser?.displayName) {
      const parts = currentUser.displayName.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
    }
    if (f.length >= 2) {
      return f.slice(0, 2).toUpperCase();
    }
    if (f) {
      return f.charAt(0).toUpperCase();
    }
    if (currentUser?.email) {
      return currentUser.email.charAt(0).toUpperCase();
    }
    return "U";
  })();

  // Modal preview initials based on live form input
  const previewInitials = (() => {
    const f = (editFirstName || "").trim();
    const l = (editLastName || "").trim();
    if (f && l) {
      return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
    }
    if (f.length >= 2) {
      return f.slice(0, 2).toUpperCase();
    }
    if (f) {
      return f.charAt(0).toUpperCase();
    }
    return "U";
  })();

  async function handleSignOut() {
    setIsOpen(false);
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("astrocraft_user_first_name");
        localStorage.removeItem("astrocraft_user_last_name");
        localStorage.removeItem("astrocraft_user_photo");
        localStorage.removeItem("astrocraft_google_photo");
        if (currentUser?.uid) {
          localStorage.removeItem(`astrocraft_user_first_name_${currentUser.uid}`);
          localStorage.removeItem(`astrocraft_user_last_name_${currentUser.uid}`);
          localStorage.removeItem(`astrocraft_user_photo_${currentUser.uid}`);
        }
      }
      await firebaseSignOut(auth);
    } catch (err) {
      console.warn("Sign out warning:", err);
    } finally {
      window.location.assign("/login");
    }
  }

  // Open username modal
  function openUsernameModal() {
    setIsOpen(false);
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setUsernameError("");
    setUsernameSuccess(false);
    setIsUsernameModalOpen(true);
  }

  // Save new username (both first and last name)
  async function handleSaveUsername(e: React.FormEvent) {
    e.preventDefault();
    const trimmedFirst = editFirstName.trim();
    const trimmedLast = editLastName.trim();

    if (!trimmedFirst) {
      setUsernameError("First name is required.");
      return;
    }

    setUsernameSaving(true);
    setUsernameError("");

    try {
      const uid = currentUser?.uid || "demo-user-id";
      const fullName = [trimmedFirst, trimmedLast].filter(Boolean).join(" ");

      // 1. Update Firebase Auth displayName while preserving photoURL
      if (auth.currentUser) {
        const existingPhoto =
          auth.currentUser.photoURL ||
          auth.currentUser.providerData?.find((p) => p.photoURL)?.photoURL ||
          photoUrl;
        await updateProfile(auth.currentUser, {
          displayName: fullName,
          ...(existingPhoto ? { photoURL: existingPhoto } : {}),
        });
      }

      // 2. Update Firestore workspace memory
      if (isFirebaseConfigured && currentUser?.uid) {
        await saveWorkspaceMemory(currentUser.uid, {
          first_name: trimmedFirst,
          last_name: trimmedLast,
          user_profile: { first_name: trimmedFirst, last_name: trimmedLast },
          business_profile: { first_name: trimmedFirst, last_name: trimmedLast },
        });
      }

      // 3. Update localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("astrocraft_user_first_name", trimmedFirst);
        localStorage.setItem("astrocraft_user_last_name", trimmedLast);
        localStorage.setItem(`astrocraft_onboarding_first_name_${uid}`, trimmedFirst);
        localStorage.setItem(`astrocraft_onboarding_last_name_${uid}`, trimmedLast);
      }

      setFirstName(trimmedFirst);
      setLastName(trimmedLast);
      setUsernameSuccess(true);
      setTimeout(() => {
        setIsUsernameModalOpen(false);
        setUsernameSuccess(false);
      }, 600);
    } catch (err: unknown) {
      console.error("Error saving username:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to update name. Please try again.";
      setUsernameError(errorMsg);
    } finally {
      setUsernameSaving(false);
    }
  }

  // Open photo modal
  function openPhotoModal() {
    setIsOpen(false);
    setSelectedPhotoFile(null);
    setPhotoPreview(photoUrl);
    setPhotoError("");
    setModalImgError(false);
    setIsPhotoModalOpen(true);
  }

  // Handle local file selection
  function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image file (PNG, JPG, WebP, etc.).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image size must be under 5MB.");
      return;
    }

    setSelectedPhotoFile(file);
    setPhotoError("");
    setModalImgError(false);

    // Local object URL for instant preview
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
  }

  // Best Google account photo candidate
  const googleAccountPhoto =
    currentUser?.providerData?.find((p) => p.photoURL)?.photoURL ||
    currentUser?.photoURL ||
    (typeof window !== "undefined"
      ? (currentUser?.uid ? localStorage.getItem(`astrocraft_user_photo_${currentUser.uid}`) : null) ||
        localStorage.getItem("astrocraft_google_photo") ||
        localStorage.getItem("astrocraft_user_photo")
      : null);

  // Apply Google Account profile picture
  async function handleUseGooglePhoto() {
    if (!googleAccountPhoto) return;
    setPhotoSaving(true);
    setPhotoError("");
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: googleAccountPhoto });
      }
      if (currentUser?.uid) {
        await saveWorkspaceMemory(currentUser.uid, {
          photo_url: googleAccountPhoto,
          user_profile: { photo_url: googleAccountPhoto },
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(`astrocraft_user_photo_${currentUser.uid}`, googleAccountPhoto);
          localStorage.setItem("astrocraft_user_photo", googleAccountPhoto);
          localStorage.setItem("astrocraft_google_photo", googleAccountPhoto);
        }
      }
      setPhotoUrl(googleAccountPhoto);
      setPhotoPreview(googleAccountPhoto);
      setImgError(false);
      setModalImgError(false);
      setIsPhotoModalOpen(false);
    } catch (err) {
      console.warn("Could not apply Google photo:", err);
      setPhotoError("Failed to apply Google profile picture.");
    } finally {
      setPhotoSaving(false);
    }
  }

  // Upload or save photo
  async function handleSavePhoto() {
    if (!selectedPhotoFile && !photoPreview) {
      setIsPhotoModalOpen(false);
      return;
    }

    setPhotoSaving(true);
    setPhotoError("");

    try {
      const uid = currentUser?.uid || "demo-user-id";
      let finalUrl = photoPreview;

      // Upload file to Firebase Storage if a new file was chosen
      if (selectedPhotoFile && storage && isFirebaseConfigured) {
        try {
          const ext = selectedPhotoFile.name.split(".").pop() || "jpg";
          const storagePath = `user_avatars/${uid}/avatar_${Date.now()}.${ext}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, selectedPhotoFile, {
            contentType: selectedPhotoFile.type,
          });
          finalUrl = await getDownloadURL(storageRef);
        } catch (storageErr) {
          console.warn("Storage upload warning, using local preview:", storageErr);
        }
      }

      // 1. Update Firebase Auth photoURL
      if (auth.currentUser && finalUrl) {
        await updateProfile(auth.currentUser, { photoURL: finalUrl });
      }

      // 2. Save to Firestore workspace memory
      if (isFirebaseConfigured && currentUser?.uid && finalUrl) {
        await saveWorkspaceMemory(currentUser.uid, {
          photo_url: finalUrl,
          user_profile: { photo_url: finalUrl },
        });
      }

      // 3. Cache in localStorage
      if (typeof window !== "undefined" && finalUrl) {
        localStorage.setItem(`astrocraft_user_photo_${uid}`, finalUrl);
        localStorage.setItem("astrocraft_user_photo", finalUrl);
      }

      setPhotoUrl(finalUrl);
      setImgError(false);
      setIsPhotoModalOpen(false);
    } catch (err: unknown) {
      console.error("Error saving photo:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to update profile picture.";
      setPhotoError(errorMsg);
    } finally {
      setPhotoSaving(false);
    }
  }

  // Remove photo
  async function handleRemovePhoto() {
    setPhotoSaving(true);
    setPhotoError("");

    try {
      const uid = currentUser?.uid || "demo-user-id";

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: "" });
      }

      if (isFirebaseConfigured && currentUser?.uid) {
        await saveWorkspaceMemory(currentUser.uid, {
          photo_url: "",
          user_profile: { photo_url: null },
        });
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem(`astrocraft_user_photo_${uid}`);
        localStorage.removeItem("astrocraft_user_photo");
      }

      setPhotoUrl(null);
      setPhotoPreview(null);
      setSelectedPhotoFile(null);
      setImgError(false);
      setIsPhotoModalOpen(false);
    } catch (err: unknown) {
      console.error("Error removing photo:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to remove profile picture.";
      setPhotoError(errorMsg);
    } finally {
      setPhotoSaving(false);
    }
  }

  if (isInitializing && !firstName && !photoUrl) {
    return (
      <div className={`flex items-center gap-2.5 py-1 px-2 ${className}`}>
        <div className="size-[34px] shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-14 animate-pulse rounded-md bg-muted hidden sm:block" />
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Navigation Profile Trigger Button — Styled exactly as provided */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="User profile settings"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="group flex items-center gap-3 py-1 px-2 rounded-xl transition-colors duration-150 hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-ink)] cursor-pointer select-none"
      >
        {/* 1. Profile Picture / Initials of both names */}
        <div className="relative flex size-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground text-surface shadow-xs">
          {photoUrl && !imgError ? (
            <img
              src={photoUrl}
              alt={firstName ? `${firstName} ${lastName}`.trim() : "User avatar"}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className="size-full object-cover select-none pointer-events-none"
              onError={() => {
                console.warn("User avatar failed to load:", photoUrl);
                setImgError(true);
              }}
            />
          ) : (
            <span className="font-serif text-[13px] font-semibold tracking-wider text-primary-foreground">
              {displayInitials}
            </span>
          )}
        </div>

        {/* 2. First Name with hover effect */}
        {firstName ? (
          <span className="text-[15px] font-medium tracking-tight text-foreground transition-colors group-hover:text-black">
            {firstName}
          </span>
        ) : null}

        {/* 3. Down-facing Arrow */}
        <ChevronDown
          className={`size-3.5 text-foreground transition-transform duration-200 group-hover:text-foreground ${
            isOpen ? "rotate-180 text-foreground" : ""
          }`}
          strokeWidth={2.2}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-2xl border border-[var(--nav-border)] bg-[var(--nav-surface)] p-1.5 shadow-2xl shadow-black/10 backdrop-blur-xl"
            role="menu"
            aria-orientation="vertical"
          >
            {/* Header: User Summary */}
            <div className="flex items-center gap-3 rounded-xl bg-[var(--nav-bg)]/60 px-3 py-2.5 mb-1 border border-[var(--nav-border)]/50">
              <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground text-surface shadow-xs">
                {photoUrl && !imgError ? (
                  <img
                    src={photoUrl}
                    alt={firstName ? `${firstName} ${lastName}`.trim() : "User avatar"}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="size-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <span className="font-serif text-sm font-semibold tracking-wider text-primary-foreground">
                    {displayInitials}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[var(--nav-ink)]">
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : currentUser?.displayName || "Account"}
                </p>
                <p className="truncate text-[11px] text-[var(--nav-muted)]">
                  {currentUser?.email || "Provider Account"}
                </p>
              </div>
            </div>

            {/* Menu Options */}
            <div className="space-y-0.5">
              {/* Option 1: Change profile picture */}
              <button
                type="button"
                role="menuitem"
                onClick={openPhotoModal}
                className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-[var(--nav-ink)] transition-colors hover:bg-[var(--nav-bg)] hover:text-black cursor-pointer"
              >
                <div className="grid size-7 place-items-center rounded-lg border border-[var(--nav-border)] bg-[var(--nav-surface)] text-[var(--nav-muted)] transition-colors group-hover:border-[var(--nav-border-strong)] group-hover:text-[var(--nav-ink)]">
                  <Camera className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block font-semibold">Change profile picture</span>
                  <span className="block text-[10px] text-[var(--nav-muted)]">
                    Upload or update your photo
                  </span>
                </div>
              </button>

              {/* Option 2: Change username */}
              <button
                type="button"
                role="menuitem"
                onClick={openUsernameModal}
                className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-[var(--nav-ink)] transition-colors hover:bg-[var(--nav-bg)] hover:text-black cursor-pointer"
              >
                <div className="grid size-7 place-items-center rounded-lg border border-[var(--nav-border)] bg-[var(--nav-surface)] text-[var(--nav-muted)] transition-colors group-hover:border-[var(--nav-border-strong)] group-hover:text-[var(--nav-ink)]">
                  <Edit3 className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block font-semibold">Change username</span>
                  <span className="block text-[10px] text-[var(--nav-muted)]">
                    Edit first and last name
                  </span>
                </div>
              </button>

              {/* Divider */}
              <div className="my-1 border-t border-[var(--nav-border)]/70" />

              {/* Option 3: Logout */}
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-accent transition-colors hover:bg-accent-soft hover:text-accent cursor-pointer"
              >
                <div className="grid size-7 place-items-center rounded-lg border border-accent bg-card text-accent transition-colors group-hover:border-accent group-hover:text-accent">
                  <LogOut className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block font-semibold">Log out</span>
                  <span className="block text-[10px] text-accent/80">
                    Sign out of your session
                  </span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals rendered via Portal directly to document.body to avoid any containing block issues */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Modal: Change Username */}
            <AnimatePresence>
              {isUsernameModalOpen && (
                <div
                  className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                      setIsUsernameModalOpen(false);
                    }
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setIsUsernameModalOpen(false);
                    }
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-10 w-full max-w-md my-auto overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl text-[var(--nav-ink)]"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="username-modal-title"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-border">
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-8 place-items-center rounded-xl bg-background text-foreground">
                          <UserIcon className="size-4" />
                        </div>
                        <h3 id="username-modal-title" className="text-base font-bold text-foreground">
                          Change Username
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsUsernameModalOpen(false)}
                        className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground cursor-pointer"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    {/* Live Preview badge */}
                    <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-border bg-background/70 p-3.5 shadow-xs">
                      <div className="flex size-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground text-surface">
                        <span className="font-serif text-[13px] font-semibold tracking-wider text-primary-foreground">
                          {previewInitials}
                        </span>
                      </div>
                      <span className="text-[15px] font-medium text-foreground">
                        {editFirstName.trim() || "First Name"}
                      </span>
                      <ChevronDown className="size-3.5 text-foreground" strokeWidth={2.2} />
                    </div>

                    <form onSubmit={handleSaveUsername} className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="firstname-input"
                            className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                          >
                            First Name
                          </label>
                          <input
                            id="firstname-input"
                            type="text"
                            value={editFirstName}
                            onChange={(e) => {
                              setEditFirstName(e.target.value);
                              if (usernameError) setUsernameError("");
                            }}
                            placeholder="e.g. John"
                            autoFocus
                            maxLength={30}
                            className="w-full rounded-xl border border-border-strong bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="lastname-input"
                            className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                          >
                            Last Name
                          </label>
                          <input
                            id="lastname-input"
                            type="text"
                            value={editLastName}
                            onChange={(e) => {
                              setEditLastName(e.target.value);
                              if (usernameError) setUsernameError("");
                            }}
                            placeholder="e.g. Doe"
                            maxLength={30}
                            className="w-full rounded-xl border border-border-strong bg-card px-3.5 py-2.5 text-sm font-medium text-foreground outline-none transition focus:border-foreground focus:ring-2 focus:ring-foreground/10"
                          />
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        First name will display in the navbar. Both initials ({previewInitials}) will show in your profile icon.
                      </p>

                      {usernameError && (
                        <p className="text-xs text-accent bg-accent-soft border border-accent rounded-xl px-3 py-2">
                          {usernameError}
                        </p>
                      )}

                      {usernameSuccess && (
                        <p className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 border border-primary rounded-xl px-3 py-2">
                          <Check className="size-3.5" /> Username updated successfully!
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          disabled={usernameSaving}
                          onClick={() => setIsUsernameModalOpen(false)}
                          className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-background hover:text-foreground disabled:opacity-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={usernameSaving || !editFirstName.trim()}
                          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                        >
                          {usernameSaving ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" /> Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Modal: Change Profile Picture */}
            <AnimatePresence>
              {isPhotoModalOpen && (
                <div
                  className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) {
                      setIsPhotoModalOpen(false);
                    }
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setIsPhotoModalOpen(false);
                    }
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-10 w-full max-w-md my-auto overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl text-[var(--nav-ink)]"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="photo-modal-title"
                  >
                    <div className="flex items-center justify-between pb-4 border-b border-border">
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-8 place-items-center rounded-xl bg-background text-foreground">
                          <Camera className="size-4" />
                        </div>
                        <h3 id="photo-modal-title" className="text-base font-bold text-foreground">
                          Change Profile Picture
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPhotoModalOpen(false)}
                        className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground cursor-pointer"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="mt-5 space-y-5">
                      {/* Avatar Preview */}
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-foreground text-surface shadow-lg ring-1 ring-border-strong">
                          {photoPreview && !modalImgError ? (
                            <img
                              src={photoPreview}
                              alt="Preview"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              className="size-full object-cover"
                              onError={() => setModalImgError(true)}
                            />
                          ) : (
                            <span className="font-serif text-3xl font-semibold tracking-wider text-primary-foreground">
                              {displayInitials}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          {photoPreview && !modalImgError
                            ? "Preview of your profile photo"
                            : "Currently showing your initials (" + displayInitials + ")"}
                        </p>
                      </div>

                      {/* Google Account Profile Photo option */}
                      {googleAccountPhoto && (
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={googleAccountPhoto}
                              alt="Google profile"
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              className="size-8 shrink-0 rounded-full object-cover border border-border-strong"
                            />
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-semibold text-foreground truncate">
                                Google Account Picture
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                Use profile photo from your Google account
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={photoSaving || photoUrl === googleAccountPhoto}
                            onClick={handleUseGooglePhoto}
                            className="shrink-0 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold px-3 py-1.5 transition disabled:opacity-40 cursor-pointer"
                          >
                            {photoUrl === googleAccountPhoto ? "Active" : "Use this"}
                          </button>
                        </div>
                      )}

                      {/* Upload action box */}
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileChange}
                          className="hidden"
                        />
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-strong bg-background/40 p-5 text-center transition hover:border-foreground hover:bg-background"
                        >
                          <UploadCloud className="size-6 text-muted-foreground mb-1" />
                          <span className="text-xs font-semibold text-foreground">
                            {selectedPhotoFile ? selectedPhotoFile.name : "Click to select a new image"}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            PNG, JPG, or WebP up to 5MB
                          </span>
                        </div>
                      </div>

                      {photoError && (
                        <p className="text-xs text-accent bg-accent-soft border border-accent rounded-xl px-3 py-2">
                          {photoError}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        {photoPreview ? (
                          <button
                            type="button"
                            disabled={photoSaving}
                            onClick={handleRemovePhoto}
                            className="flex items-center gap-1.5 rounded-xl border border-accent bg-accent-soft px-3 py-2 text-xs font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                            Remove
                          </button>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={photoSaving}
                            onClick={() => setIsPhotoModalOpen(false)}
                            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-background hover:text-foreground disabled:opacity-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={photoSaving || (!selectedPhotoFile && !photoPreview)}
                            onClick={handleSavePhoto}
                            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                          >
                            {photoSaving ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" /> Saving...
                              </>
                            ) : (
                              "Save Picture"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>,
          document.body
        )}
    </div>
  );
}
