"use client";

/**
 * The watch room: the page attendees watch the webinar on (`?view=watch`).
 *
 * The host's own watch blocks if they built any, else the standard room:
 * the starter blocks filled from the webinar (builder/templates.ts), drawn by
 * the same BlockPage. Both share one watch-player block (BlockPage.tsx) for
 * the countdown, join button, video and ended state.
 *
 * The join link is private (webinars/{id}/private/session). It is never read
 * here; see blocks/watch-link.ts.
 */
import { useEffect, useMemo, useState } from "react";
import { BlockPage } from "@/components/webinar/blocks/BlockPage";
import { useNow } from "@/components/webinar/blocks/registration-state";
import { fillFromWebinar } from "@/components/webinar/builder/templates";
import { starterBlocks } from "@/lib/page-blocks";
import { sessionStart, type Webinar } from "@/lib/webinars";

export { rememberRegistration, viewUrl } from "@/components/webinar/blocks/watch-link";

export function WatchRoom({ webinar: w }: { webinar: Webinar }) {
  // shortcut: the watch room is public like the registration page, not gated to registrants; gate it if hosts need private rooms.
  const room = w.watch_room;
  const custom = w.pages.watch?.length ? w.pages.watch : null;
  const hasOffer = Boolean(room.offer_url && room.offer_label.trim());
  const now = useNow(!custom && hasOffer);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  useEffect(() => setLoadedAt(Date.now()), []);

  // Built once per webinar so block ids (and the player's join state) survive the offer appearing.
  const standard = useMemo(() => fillFromWebinar(starterBlocks("watch"), w, "watch"), [w]);

  // Standard room only: the offer shows offer_after_min after the start (live) or after this visit began (automated).
  const start = sessionStart(w);
  const offerFrom = w.delivery_type === "automated" ? loadedAt : start ? start.getTime() : null;
  const showOffer = now !== null && offerFrom !== null && now >= offerFrom + room.offer_after_min * 60_000;
  const blocks = custom ?? (showOffer ? standard : standard.filter((b) => b.type !== "button"));

  return <BlockPage webinar={w} page="watch" blocks={blocks} mode="live" />;
}
