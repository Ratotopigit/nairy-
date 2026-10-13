"use client";

import { useEffect, useRef, useState } from "react";
import { RegistrationPage } from "@/components/webinar/RegistrationPage";
import type { Webinar } from "@/lib/webinars";

type Props = {
  webinar: Webinar;
  /** Page width the miniature is rendered at before scaling down. */
  width?: number;
  /** Visible height as a fraction of width. */
  ratio?: number;
  className?: string;
};

/**
 * A live, scaled-down copy of the real registration page: what a visitor
 * would see at laptop width, shrunk to a card. Rendered only once it scrolls
 * into view, with a frozen clock, so a gallery of dozens stays light.
 */
export function LiveThumb({ webinar, width = 1280, ratio = 0.64, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / width);
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          seen.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    seen.observe(el);
    return () => {
      resize.disconnect();
      seen.disconnect();
    };
  }, [width]);

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden bg-muted ${className}`}
      style={{ aspectRatio: `${1} / ${ratio}` }}
      aria-hidden="true"
    >
      {visible && scale > 0 ? (
        <div
          style={{ width, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}
          // React 18 has no boolean `inert`; this keeps the miniature out of the tab order and screen readers.
          ref={(el) => el?.setAttribute("inert", "")}
        >
          <RegistrationPage webinar={webinar} mode="preview" frozen />
        </div>
      ) : null}
    </div>
  );
}
