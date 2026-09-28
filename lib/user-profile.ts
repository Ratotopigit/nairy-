"use client";

import { type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase/config";

export interface UserProfileRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  admin: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

/**
 * Automatically records the user in the Firestore `users` collection upon sign-in/mount.
 * This guarantees the project owner can see all user profiles with their emails in the Firebase Console!
 */
export async function syncUserProfile(user: User | null): Promise<void> {
  if (!isFirebaseConfigured || !db || !user?.uid) return;

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // First time user is recorded: create clean document with admin toggle
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        admin: false, // The toggle field! Owner can toggle to true in Firebase Console
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    } else {
      // Update metadata while PRESERVING existing admin toggle
      const existing = snap.data();
      await setDoc(
        userRef,
        {
          uid: user.uid,
          email: user.email || existing?.email || "",
          displayName: user.displayName || existing?.displayName || "",
          photoURL: user.photoURL || existing?.photoURL || "",
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("Could not sync user document to Firestore users collection:", err);
  }
}

/**
 * Checks whether a user has administrative privileges.
 * Supports:
 * 1. `users/{uid}` with `admin: true`
 * 2. `admins/{email}` with `admin: true` (or document exists)
 * 3. `workspace_memory/{uid}` with `admin: true`
 */
export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!isFirebaseConfigured || !db || !user?.uid) return false;

  const userEmail = (user.email || "").toLowerCase().trim();

  try {
    // 1. Check `users/{uid}` collection
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data?.admin === true) {
        return true;
      }
    }

    // 2. Check `admins/{email}` collection (super easy for owner to add in Firebase Console!)
    if (userEmail) {
      const adminEmailRef = doc(db, "admins", userEmail);
      const adminEmailSnap = await getDoc(adminEmailRef);
      if (adminEmailSnap.exists()) {
        const data = adminEmailSnap.data();
        if (data?.admin === true) {
          return true;
        }
      }
    }

    // 3. Check `workspace_memory/{uid}` collection
    const memoryRef = doc(db, "workspace_memory", user.uid);
    const memorySnap = await getDoc(memoryRef);
    if (memorySnap.exists()) {
      const data = memorySnap.data();
      if (data?.admin === true) {
        return true;
      }
    }

    return false;
  } catch (err) {
    console.warn("Admin verification check warning:", err);
    return false;
  }
}
