import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase/config";

export type DeckSummary = {
  projectId: string;
  title: string;
  slideCount: number;
  purpose: string;
  updatedAt: string;
};

/**
 * Every deck this user has saved, newest first.
 *
 * Sorted in memory rather than with `orderBy`: pairing a `where` with an
 * `orderBy` on a different field needs a composite Firestore index, and this
 * list is far too small to be worth one. The same trade-off is already made
 * by the fallback lookup in SlideStudio.
 *
 * Decks with no slides are skipped — those are empty shells left behind by a
 * project that was opened but never generated, and they are noise in a list
 * whose whole purpose is finding real work again.
 */
export async function listDeckHistory(ownerId: string, max = 40): Promise<DeckSummary[]> {
  if (!ownerId) return [];

  const snap = await getDocs(
    query(collection(db, "content_sessions"), where("owner_id", "==", ownerId)),
  );

  return snap.docs
    .map((entry) => {
      const data = entry.data() as Record<string, unknown>;
      const slides = Array.isArray(data.slides) ? data.slides : [];
      const brief = (data.brief ?? {}) as Record<string, unknown>;
      return {
        projectId: typeof data.project_id === "string" && data.project_id ? data.project_id : entry.id,
        title: typeof data.title === "string" && data.title.trim() ? data.title : "Untitled presentation",
        slideCount: slides.length,
        purpose: typeof brief.purpose === "string" ? brief.purpose : "",
        updatedAt: typeof data.updated_at === "string" ? data.updated_at : "",
      };
    })
    .filter((deck) => deck.slideCount > 0)
    .sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0))
    .slice(0, max);
}
