"use client";

import dynamic from "next/dynamic";
import AdminGuard from "@/components/auth/AdminGuard";

// Client-only: it reads Firebase auth and Firestore on mount.
const EmailUsersPanel = dynamic(() => import("@/components/admin/EmailUsersPanel"), { ssr: false });

export default function AdminEmailPage() {
  return (
    <AdminGuard>
      <EmailUsersPanel />
    </AdminGuard>
  );
}
