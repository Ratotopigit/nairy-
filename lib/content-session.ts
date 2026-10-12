/**
 * The one place that reads and writes the deck collections.
 *
 * Before this, SlideStudio talked to Firestore from five separate places with
 * slightly different document shapes, and n8n wrote the same documents from
 * the other side. Nothing stated what a deck record actually contains, so
 * fields drifted and failures were invisible. Everything below is the
 * contract.
 *
 * Shared ownership with n8n is deliberate and load-bearing. The Webinar
 * Content workflow upserts `content_sessions` with a FIXED column list:
 *
 *   project_id, owner_id, blueprint_session_id, status, title, brief,
 *   slides, messages, theme, updated_at
 *
 * Any field outside that list cannot be touched by the workflow. `slide_art`
 * and `content_project_id` live outside it on purpose — see
 * lib/slide-art-store.ts. Do not move them into the list above.
 */
import { collection, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Slide } from "@/lib/deck";
import { buildSlideArt, mergeSlideArt, type SlideArtMap } from "@/lib/slide-art-store";

export type DeckTheme = {
  style?: string;
  font_set?: string;
  palette?: string;
  ratio?: string;
  motion?: string;
};

export type DeckBrief = {
  description?: string;
  purpose?: string;
  slide_count?: number | string;
};

export type ContentSessionDoc = {
  project_id?: string;
  owner_id?: string;
  blueprint_session_id?: string | null;
  status?: "draft" | "completed";
  title?: string;
  brief?: DeckBrief;
  slides?: unknown;
  messages?: unknown;
  theme?: DeckTheme;
  /** Written by this app only; invisible to n8n. */
  slide_art?: SlideArtMap;
  last_error?: string | null;
  updated_at?: string;
};

export type BlueprintSessionDoc = {
  session_id?: string;
  owner_id?: string;
  blueprint?: Record<string, unknown>;
  content_project_id?: string;
  updated_at?: string;
};

function newestFirst<T extends { updated_at?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const tA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const tB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return tB - tA;
  });
}

function hasSlides(session: ContentSessionDoc | null | undefined): boolean {
  return Array.isArray(session?.slides) && session!.slides!.length > 0;
}

/**
 * Reads one deck by id, trying both id layouts: the bare project UUID that the
 * n8n workflow upserts, and the `<uid>_<project>` form used before Firebase.
 * Returns null rather than throwing — a missing deck is an ordinary outcome.
 */
export async function loadContentSession(
  userId: string,
  projectId: string,
): Promise<ContentSessionDoc | null> {
  for (const docId of [projectId, `${userId}_${projectId}`]) {
    try {
      const snap = await getDoc(doc(db, "content_sessions", docId));
      if (!snap.exists()) continue;
      const data = snap.data() as ContentSessionDoc;
      if (hasSlides(data)) return data;
    } catch (error) {
      console.warn(`content_sessions read failed for ${docId}:`, error);
    }
  }
  return null;
}

/** The user's most recently updated deck that actually has slides. */
export async function loadLatestContentSession(
  userId: string,
): Promise<ContentSessionDoc | null> {
  try {
    const snap = await getDocs(
      query(collection(db, "content_sessions"), where("owner_id", "==", userId)),
    );
    const rows = newestFirst(snap.docs.map((d) => d.data() as ContentSessionDoc));
    return rows.find(hasSlides) ?? null;
  } catch (error) {
    console.warn("content_sessions list failed:", error);
    return null;
  }
}

/**
 * Restores the deck's slides with their art re-attached.
 *
 * Always use this rather than reading `doc.slides` directly: n8n persists
 * slides with `image` nulled out, so the raw array is routinely incomplete.
 */
export function slidesFromSession(session: ContentSessionDoc | null | undefined): Slide[] {
  if (!Array.isArray(session?.slides)) return [];
  return mergeSlideArt(session!.slides as Slide[], session!.slide_art);
}

/**
 * Writes a deck. `slide_art` is derived here so no caller can forget it and
 * silently reintroduce the vanishing-images bug.
 */
export async function saveContentSession(
  userId: string,
  session: ContentSessionDoc & { project_id: string; slides: Slide[] },
): Promise<void> {
  await setDoc(
    doc(db, "content_sessions", session.project_id),
    {
      ...session,
      owner_id: userId,
      slide_art: buildSlideArt(session.slides),
      updated_at: session.updated_at ?? new Date().toISOString(),
    },
    { merge: true },
  );
}

/**
 * Records which deck a conversation produced, so the link survives a reload.
 * `content_project_id` is outside the n8n Save Buyer Project column list
 * (session_id, owner_id, status, step, blueprint, updated_at), so the workflow
 * cannot overwrite it.
 */
export async function linkBlueprintToContent(
  userId: string,
  blueprintSessionId: string,
  projectId: string,
): Promise<void> {
  await setDoc(
    doc(db, "blueprint_sessions", blueprintSessionId),
    {
      owner_id: userId,
      content_project_id: projectId,
      updated_at: new Date().toISOString(),
    },
    { merge: true },
  );
}

/**
 * The user's buyer blueprints, newest first. `preferSessionId` narrows to one
 * session, which is how a hand-off from Webinar Chat pins the deck to the
 * conversation that started it.
 */
export async function listBlueprintSessions(
  userId: string,
  preferSessionId?: string | null,
): Promise<BlueprintSessionDoc[]> {
  try {
    const snap = await getDocs(
      query(collection(db, "blueprint_sessions"), where("owner_id", "==", userId)),
    );
    const rows = newestFirst(snap.docs.map((d) => d.data() as BlueprintSessionDoc));
    return preferSessionId ? rows.filter((row) => row.session_id === preferSessionId) : rows;
  } catch (error) {
    console.warn("blueprint_sessions list failed:", error);
    return [];
  }
}
