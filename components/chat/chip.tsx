import { cn } from "@/lib/utils";

export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm transition-colors duration-200",
        selected
          ? "border-accent bg-accent-soft text-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/25",
      )}
    >
      {label}
    </button>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}
