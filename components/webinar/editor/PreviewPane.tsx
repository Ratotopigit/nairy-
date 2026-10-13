"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ExternalLink, Monitor, Smartphone } from "lucide-react";
import { RegistrationPage } from "@/components/webinar/RegistrationPage";
import type { Webinar } from "@/lib/webinars";

export type Device = "desktop" | "mobile";

const WIDTH: Record<Device, number> = { desktop: 1280, mobile: 390 };

/**
 * Renders children at a fixed logical width and scales to fit. The page
 * lays itself out from the width it is given (container queries), so a
 * 1280px render is the real laptop layout and a 390px one is the real phone
 * layout, not a squashed version of either.
 */
function ScaledFrame({ width, children }: { width: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fit = () => setScale(Math.min(1, o.clientWidth / width));
    const measure = () => setHeight(i.offsetHeight);
    fit();
    measure();
    const a = new ResizeObserver(fit);
    const b = new ResizeObserver(measure);
    a.observe(o);
    b.observe(i);
    return () => {
      a.disconnect();
      b.disconnect();
    };
  }, [width]);

  return (
    <div ref={outer} className="w-full">
      <div className="relative" style={{ height: height * scale, width: width * scale, marginInline: "auto" }}>
        <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", left: 0, top: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

type Props = {
  webinar: Webinar;
  device: Device;
  onDevice: (d: Device) => void;
  publicUrl: string | null;
  notice?: ReactNode;
};

export function PreviewPane({ webinar, device, onDevice, publicUrl, notice }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-3 py-2">
        <div role="tablist" aria-label="Preview size" className="flex rounded-lg border border-border bg-background p-0.5">
          {(
            [
              ["desktop", "Desktop", Monitor],
              ["mobile", "Mobile", Smartphone],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={device === key}
              onClick={() => onDevice(key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
                device === key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">Live preview. Registering here doesn&apos;t save anything.</span>
        {publicUrl ? (
          <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-foreground underline-offset-2 hover:underline">
            Open live page <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>
      {notice ? <div className="border-b border-border bg-amber-50/70 px-3 py-2 text-xs text-amber-900">{notice}</div> : null}
      <div className={`max-h-[calc(100vh-200px)] overflow-y-auto overflow-x-hidden ${device === "mobile" ? "bg-secondary/70 p-4" : "bg-secondary/40"}`}>
        {device === "mobile" ? (
          <div className="mx-auto w-[390px] max-w-full overflow-hidden rounded-[28px] border-[6px] border-foreground/85 bg-background shadow-lg">
            <ScaledFrame width={WIDTH.mobile}>
              <RegistrationPage webinar={webinar} mode="preview" />
            </ScaledFrame>
          </div>
        ) : (
          <ScaledFrame width={WIDTH.desktop}>
            <RegistrationPage webinar={webinar} mode="preview" />
          </ScaledFrame>
        )}
      </div>
    </div>
  );
}
