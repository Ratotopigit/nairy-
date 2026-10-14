/** Shown on login/signup while an existing session sends the user on. */
export function SigningInScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-background text-foreground animate-fade-in">
      <div className="flex flex-col items-center gap-3">
        <img src="/assets/webinarstackai-logo.png" alt="Webinar Stack" className="h-10 w-auto opacity-80" />
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground" role="status">
          <div className="size-4 animate-spin rounded-full border-2 border-[#3478F6]/25 border-t-[#3478F6]" />
          <span>Opening your workspace...</span>
        </div>
      </div>
    </div>
  );
}
