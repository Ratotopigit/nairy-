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

  const assetContext = [
    memoryContext(memory),
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

  return { memory, assets: signedAssets, assetContext, briefText, palette: paletteColors };
}
