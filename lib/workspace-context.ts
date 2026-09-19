import { collection, getDocs, query, where } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { db, storage } from "./firebase/config";
import { loadWorkspaceMemory, memoryContext, type WorkspaceMemory } from "./workspace-memory";

export type WorkspaceAssetSummary = {
  file_name: string;
  storage_path: string;
  mime_type: string;
  asset_role: string | null;
  palette?: Record<string, string> | null;
  excerpt?: string;
  signedUrl?: string;
};

export type StudioContext = {
  memory: WorkspaceMemory | null;
  assets: WorkspaceAssetSummary[];
  assetContext: string;
  briefText: string;
  palette: Record<string, string> | null;
};

/**
 * Subscription / billing state must never reach the assistant's prompt context.
 * The plan is legitimate billing metadata (kept in Firestore under
 * `creation_preferences.selected_plan`) but the model must not be told which
 * tier the user is on, so it can never imply the user is limited to a free plan.
 *
 * Documents written before this rule existed still carry the old
 * `... Goals: x. Plan: free.` summary, so everything is also scrubbed on READ.
 */

/** Object keys that carry subscription state and are dropped before serialising. */
/** Values that mark a "Plan: x" phrase as subscription state rather than user copy. */
const BILLING_VALUE =
  /^(?:free|basic|starter|standard|pro|premium|plus|business|enterprise|trial|paid|unlimited|lite|growth|scale|team)/i;

function isBillingKey(key: string): boolean {
  const tokens = key.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.some((token) => ["plan", "plans", "subscription", "subscriptions", "billing"].includes(token))) {
    return true;
  }
  // Bare `tier` / `tiers` only — keeps user-authored fields like `pricing_tiers`.
  return tokens.length === 1 && (tokens[0] === "tier" || tokens[0] === "tiers");
}

/** Recursively removes subscription-bearing keys from a memory profile object. */
function stripBillingKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripBillingKeys(item)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (isBillingKey(key)) continue;
      out[key] = stripBillingKeys(val);
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * Removes plan/tier sentences (e.g. a trailing "Plan: free.") from free-text
 * context, then collapses the whitespace the removal leaves behind.
 */
export function stripBillingWording(text: string): string {
  if (!text) return "";
  return text
    // "Plan: free." / "Tier: pro" — only when the value actually reads like a
    // subscription tier, so a user's own "rollout plan: a 90-day sprint" survives.
    .replace(
      /\b(?:current\s+|selected\s+)?(?:subscription(?:\s+(?:plan|tier))?|billing\s+plan|plan|tier)\s*:\s*([^.\n]*?)(\.|(?=\n)|$)/gi,
      (match: string, value: string) => (BILLING_VALUE.test(value.trim()) ? "" : match),
    )
    // Residual JSON pairs such as "selected_plan":"free". Every pair is matched
    // but only exact billing keys are dropped, so user fields such as
    // "pricing_tiers" survive byte-for-byte.
    .replace(
      /"([^"]+)"\s*:\s*("[^"]*"|\[[^\]]*\]|[^,}\n]+)\s*,?/g,
      (match: string, key: string) => (isBillingKey(key) ? "" : match),
    )
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/g, ""))
    .join("\n")
    .trim();
}

/** Returns a copy of workspace memory with all subscription state removed. */
export function sanitizeMemoryForAi(memory: WorkspaceMemory | null): WorkspaceMemory | null {
  if (!memory) return null;
  const clean = stripBillingKeys(memory);
  return {
    ...clean,
    memory_summary: stripBillingWording(clean.memory_summary ?? ""),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function briefExcerpts(brand: Record<string, unknown>): Array<{ file_name?: string; excerpt?: string }> {
  return Array.isArray(brand.brief_excerpts)
    ? brand.brief_excerpts.filter((item): item is { file_name?: string; excerpt?: string } =>
        Boolean(item && typeof item === "object")
      )
    : [];
}

export async function extractDocumentExcerpt(file: File, maxChars = 8000): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("text/") || name.endsWith(".txt")) {
    return (await file.text()).replace(/\s+/g, " ").trim().slice(0, maxChars);
  }
  if (file.type !== "application/pdf" && !name.endsWith(".pdf")) return "";

  const raw = new TextDecoder("latin1").decode(await file.arrayBuffer());
  const chunks: string[] = [];
  const paren = /\((?:\\n|\\r|\\t|\\\\|\\\)|\\.|[^\\)]){3,}\)/g;
  let match: RegExpExecArray | null;
  while ((match = paren.exec(raw))) {
    const decoded = match[0]
      .slice(1, -1)
      .replace(/\\n/g, " ")
      .replace(/\\r/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\\(.)/g, "$1");
    if (/[A-Za-z]{3,}/.test(decoded)) chunks.push(decoded);
  }
  return chunks.join(" ").replace(/\s+/g, " ").trim().slice(0, maxChars);
}

export async function loadStudioContext(ownerId: string): Promise<StudioContext> {
  const [memory, assetRows] = await Promise.all([
    loadWorkspaceMemory(ownerId),
    (async () => {
      try {
        const q = query(
          collection(db, "workspace_assets"),
          where("owner_id", "==", ownerId)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => d.data() as WorkspaceAssetSummary & { created_at?: string });
        list.sort((a, b) => {
          const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tB - tA;
        });
        return list.slice(0, 30);
      } catch (err) {
        console.warn("Failed to load workspace assets from Firestore:", err);
        return [];
      }
    })(),
  ]);

  const brand = asRecord(memory?.brand_profile);
  const excerpts = briefExcerpts(brand);
  const assets = (assetRows as WorkspaceAssetSummary[]).map((asset) => ({
    ...asset,
    excerpt: excerpts.find((item) => item.file_name === asset.file_name)?.excerpt,
  }));

  const signedAssets = await Promise.all(
    assets.map(async (asset) => {
      if (!asset.mime_type.startsWith("image/")) return asset;
      try {
        const fileRef = ref(storage, asset.storage_path);
        const signedUrl = await getDownloadURL(fileRef);
        return { ...asset, signedUrl };
      } catch (err) {
        console.warn("Failed to get download URL for asset:", asset.storage_path, err);
        return asset;
      }
    })
  );

  const palette = asRecord(brand.palette);
  const paletteColors = Object.keys(palette).length
    ? Object.fromEntries(
        Object.entries(palette).filter((entry): entry is [string, string] => typeof entry[1] === "string")
      )
    : signedAssets.find((asset) => asset.palette)?.palette ?? null;

  const briefText = excerpts
    .map((item) => [item.file_name, item.excerpt].filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 12000);

  // Scrub subscription/plan wording out of the memory block before it is joined
  // into the context string that gets POSTed to the assistant. Doing this on the
  // read side also covers documents already stored with the old "Plan: free."
  // summary baked in.
  const safeMemory = sanitizeMemoryForAi(memory);
  const safeMemoryContext = stripBillingWording(memoryContext(safeMemory));

  const assetContext = [
    safeMemoryContext,
    typeof brand.business_line === "string" ? `Business line: ${brand.business_line}` : "",
    typeof brand.quote_bank === "string" ? `Quote bank: ${brand.quote_bank}` : "",
    typeof brand.usage_notes === "string" ? `Brand asset rules: ${brand.usage_notes}` : "",
    paletteColors ? `Brand colors: ${JSON.stringify(paletteColors)}` : "",
    signedAssets.length
      ? `Uploaded assets: ${signedAssets.map((asset) => `${asset.asset_role ?? "reference"} - ${asset.file_name}`).join("; ")}`
      : "",
    briefText ? `Business brief excerpts:\n${briefText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // `memory` is returned in its sanitized form: this loader exists to build
  // assistant context, and every caller reads profile/session fields from it.
  // Billing state is untouched in Firestore — read it with loadWorkspaceMemory().
  return { memory: safeMemory, assets: signedAssets, assetContext, briefText, palette: paletteColors };
}

