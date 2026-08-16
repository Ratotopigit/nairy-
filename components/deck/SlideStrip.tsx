import { Copy, Plus, Trash2 } from "lucide-react";
import type { Slide } from "@/lib/deck";
import { cn } from "@/lib/utils";

type Props = {
  slides: Slide[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

export function SlideStrip({ slides, selectedId, onSelect, onAdd, onDuplicate, onDelete }: Props) {
  return (
    <div className="flex h-[108px] shrink-0 items-center gap-2 overflow-x-auto border-t border-border bg-card px-5">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={cn(
            "group relative h-[76px] w-[128px] shrink-0 cursor-pointer rounded-[10px] border bg-background px-3 py-2.5 transition-colors duration-150",
            s.id === selectedId ? "border-accent" : "border-border hover:border-foreground/25",
          )}
          onClick={() => onSelect(s.id)}
        >
          <div className="text-[11px] tracking-[0.14em] text-muted-foreground">
            {String(i + 1).padStart(2, "0")}
          </div>
          <div className="mt-1.5 truncate text-[13px] text-foreground">{s.name}</div>
          <div className="mt-0.5 truncate text-[11px] capitalize text-muted-foreground">{s.type}</div>

          <div className="absolute right-1.5 top-1.5 hidden gap-1 group-hover:flex">
            <IconBtn
              label="Duplicate slide"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(s.id);
              }}
            >
              <Copy className="h-3 w-3" strokeWidth={1.75} />
            </IconBtn>
            <IconBtn
              label="Delete slide"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s.id);
              }}
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.75} />
            </IconBtn>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAdd}
        className="flex h-[76px] w-[52px] shrink-0 items-center justify-center rounded-[10px] border border-dashed border-border text-muted-foreground transition-colors duration-150 hover:border-foreground/25 hover:text-foreground"
        aria-label="Add slide"
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="rounded-[6px] border border-border bg-card p-1 text-muted-foreground transition-colors duration-150 hover:text-foreground"
    >
      {children}
    </button>
  );
}
