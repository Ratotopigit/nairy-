/**
 * Plain-language messages for Firebase Auth errors. Customers see these, so
 * no Firebase jargon or console instructions; the raw error still goes to
 * the browser console for us.
 */
export function authErrorMessage(err: unknown, action: "sign in" | "sign up" | "reset"): string | null {
  const code = String((err as { code?: unknown } | null)?.code ?? "");
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null; // They closed the Google window themselves; nothing to say.
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "That email and password don't match. Check them, or reset your password below.";
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/missing-email":
      return "Enter your email address first.";
    case "auth/email-already-in-use":
      return "There's already an account with this email. Sign in instead.";
    case "auth/account-exists-with-different-credential":
      return "This email already has an account with a different sign-in method. Sign in with your email and password.";
    case "auth/weak-password":
      return "Choose a password with at least 6 characters.";
    case "auth/user-disabled":
      return "This account has been turned off. Contact support if you think that's a mistake.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Couldn't connect. Check your internet connection and try again.";
    case "auth/unauthorized-domain":
    case "auth/operation-not-allowed":
      return "Sign-in isn't available here right now. Please use webinarstackai.com, or try again later.";
    default:
      return action === "sign up"
        ? "We couldn't create your account. Please try again."
        : action === "reset"
          ? "We couldn't send the reset email. Please try again."
          : "We couldn't sign you in. Please try again.";
  }
}
