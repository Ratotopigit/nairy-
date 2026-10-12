import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

/**
 * Studio feedback line.
 *
 * Every outcome used to render as the same muted grey sentence, so "Could not
 * build the PDF" was visually identical to "12 slides ready" and failures went
 * unnoticed. Tone is carried explicitly and a failure is the only thing that
 * draws the eye.
 */
export type StatusTone = "info" | "working" | "success" | "error";

export type StatusState = { text: string; tone: StatusTone } | null;

const TONE = {
  info: "text-muted-foreground",
  working: "text-muted-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-red-600 dark:text-red-400",
} as const;

export function StatusLine({
  status,
  className = "",
  onRetry,
}: {
  status: StatusState;
  className?: string;
  onRetry?: () => void;
}) {
  if (!status?.text) return null;
  const { text, tone } = status;

  return (
    <p
      // Failures are announced; routine progress is not, so a screen reader is
      // not interrupted on every keystroke-driven save.
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`flex items-start gap-1.5 text-xs leading-5 ${TONE[tone]} ${className}`}
    >
      {tone === "working" ? (
        <Loader2 className="mt-[3px] size-3 shrink-0 animate-spin" strokeWidth={2} />
      ) : tone === "success" ? (
        <CheckCircle2 className="mt-[3px] size-3 shrink-0" strokeWidth={2} />
      ) : tone === "error" ? (
        <AlertTriangle className="mt-[3px] size-3 shrink-0" strokeWidth={2} />
      ) : null}
      <span className="min-w-0">{text}</span>
      {tone === "error" && onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          Try again
        </button>
      ) : null}
    </p>
  );
}
