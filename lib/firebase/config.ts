import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, type User } from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// No hardcoded fallbacks: every value comes from the build-time environment.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

if (!isFirebaseConfigured) {
  throw new Error(
    "Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* variables as " +
      "build-time environment variables and redeploy.",
  );
}

export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
// A single undefined field anywhere in a slide makes setDoc throw and the
// autosave lose the whole deck. Skipping undefined is far better here than
// failing the write.
export const db: Firestore = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const storage: FirebaseStorage = getStorage(app);

export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getFirebaseAuthToken(): Promise<string | null> {
  const user = auth.currentUser ?? (await getCurrentUser());
  if (!user) return null;
  return user.getIdToken();
}
