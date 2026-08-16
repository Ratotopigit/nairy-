import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SegItem({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[8px] px-2.5 py-1 text-[12px] leading-5 text-muted-foreground transition-colors duration-150 hover:text-foreground",
        active && "bg-card text-foreground shadow-[0_1px_2px_rgba(24,24,22,0.06)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Seg({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-0.5 rounded-[10px] border border-border bg-secondary p-0.5">
      {children}
    </div>
  );
}

export function PanelSection({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-b border-border px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-[12px] text-muted-foreground">{children}</div>;
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-[8px] border border-border bg-card px-2.5 py-1 text-[12px] text-muted-foreground transition-colors duration-150 hover:border-foreground/25 hover:text-foreground",
        active && "border-accent text-foreground",
      )}
    >
      {children}
    </button>
  );
}
