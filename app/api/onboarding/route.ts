import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, answers, plan } = body || {};

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId in request body" },
        { status: 400 }
      );
    }

    // In a full production setup with Firebase Admin SDK or server-side DB,
    // server-side operations can be performed here.
    // Client-side Firestore rules allow owner update to workspace_memory.
    console.log(`[API /api/onboarding] Onboarding completed for user ${userId} with plan: ${plan}`);

    return NextResponse.json({
      success: true,
      redirectUrl: "/provider",
      tier: plan || "pro",
      completedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API /api/onboarding] Error processing onboarding request:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
