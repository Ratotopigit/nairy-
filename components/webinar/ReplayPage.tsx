"use client";

/**
 * The replay page (`?view=replay`): the recording, the offer and a "replay
 * expires in" timer. The host's own replay blocks if they built any, else the
 * starter layout with the watch room's offer on its button.
 *
 * Expires at the session end + replay_expires_days (0 = never). Automated
 * webinars have no end, so their replay never expires. Once expired, or while
 * there is no recording, the replay video is replaced by a short notice
 * (once expired, every video on the page is, so nothing of the session plays).
 */
import { useEffect, useMemo, useState } from "react";
import { BlockPage } from "@/components/webinar/blocks/BlockPage";
import { starterBlocks, type Block, type LeafBlock } from "@/lib/page-blocks";
import { sessionEnd, type Webinar } from "@/lib/webinars";

/** When the replay closes, or null when it never does. */
export function replayExpiry(w: Webinar): Date | null {
  const end = sessionEnd(w);
  return end && w.replay_expires_days > 0 ? new Date(end.getTime() + w.replay_expires_days * 86_400_000) : null;
}

function noticeFor(leaf: LeafBlock, text: string, all: boolean): LeafBlock {
  return leaf.type === "video" && (all || leaf.source === "replay") ? { id: leaf.id, type: "text", style: leaf.style, text } : leaf;
}

/** Swaps each replay video block, or every video block when `all` (also inside columns), for a text notice. */
function withNotice(blocks: Block[], text: string, all: boolean): Block[] {
  const swap = (l: LeafBlock) => noticeFor(l, text, all);
  return blocks.map((b) => (b.type === "columns" ? { ...b, columns: b.columns.map((col) => col.map(swap)) } : swap(b)));
}

export function ReplayPage({ webinar: w }: { webinar: Webinar }) {
  const expiry = replayExpiry(w);
  // Known from the first render (this page only renders client-side, after the webinar loads), then once a minute.
  const [expired, setExpired] = useState(() => Boolean(expiry) && Date.now() >= expiry!.getTime());
  useEffect(() => {
    if (!expiry) {
      setExpired(false);
      return;
    }
    const check = () => setExpired(Date.now() >= expiry.getTime());
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [expiry?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  const room = w.watch_room;
  const blocks = useMemo(() => {
    if (w.pages.replay?.length) return w.pages.replay;
    const offer = room.offer_url;
    return starterBlocks("replay").flatMap((b): Block[] =>
      b.type !== "button" ? [b] : offer ? [{ ...b, href: offer, label: room.offer_label || b.label }] : [],
    );
  }, [w.pages.replay, room.offer_url, room.offer_label]);

  const notice = !w.replay_url ? "The replay isn't available yet." : expired ? "This replay has expired." : "";
  const shown = useMemo(() => (notice ? withNotice(blocks, notice, expired) : blocks), [blocks, notice, expired]);

  return <BlockPage webinar={w} page="replay" blocks={shown} mode="live" />;
}
