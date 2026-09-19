import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Composer({
  value,
  onChange,
  onSubmit,
  placeholder,
  actionLabel = "Send",
  disabled,
  autoFocusKey,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  actionLabel?: string;
  disabled?: boolean;
  autoFocusKey?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled, autoFocusKey]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  return (
    <div className="rounded-xl border border-border bg-card transition-colors duration-200 focus-within:border-foreground/30">
      <textarea
        ref={ref}
        rows={2}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        className="w-full resize-none bg-transparent px-4 pt-3.5 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/80 disabled:opacity-50"
      />
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <span className="pl-1 text-xs text-muted-foreground">
          Enter to send · Shift + Enter for a new line
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
            "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40",
          )}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
