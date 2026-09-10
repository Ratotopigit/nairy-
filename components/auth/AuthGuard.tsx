"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import { checkUserOnboardingStatus } from "@/lib/onboarding";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isOnboarded, setIsOnboarded] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setUser({
        uid: "demo-user-id",
        email: "demo@example.com",
        displayName: "Demo Provider",
      } as unknown as User);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user === null) {
      router.replace("/login");
      return;
    }

    if (user) {
      let active = true;
      checkUserOnboardingStatus(user.uid).then((completed) => {
        if (!active) return;
        setIsOnboarded(completed);
        if (!completed) {
          router.replace("/onboarding");
        }
      });
      return () => {
        active = false;
      };
    }
  }, [router, user]);

  if (user === undefined || (user && isOnboarded === undefined)) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f1e8] text-sm text-[#587166]">
        Checking your session...
      </div>
    );
  }

  if (!user || isOnboarded === false) return null;
  return children;
}
