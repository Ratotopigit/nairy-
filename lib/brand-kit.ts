import { collection, getDocs, query, where } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { db, storage } from "./firebase/config";
import { loadWorkspaceMemory } from "./workspace-memory";
import { WEBINAR_LIMITS } from "./webinars";
import { EMPTY_KIT, pickImages, type BrandKit } from "./brand-patch";

export { brandPatch, BRAND_IMAGE_FIELDS, type BrandKit } from "./brand-patch";

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/**
 * What the host uploaded in Brand & Files, ready to drop into a webinar.
 * shortcut: webinars link to the Brand & Files download URLs instead of copying the file,
 * so deleting a file there breaks the image on every webinar using it; copy into the webinar's Storage folder when that bites.
 * Never throws: anything that fails comes back empty.
 */
export function loadBrandKit(uid: string): Promise<BrandKit> {
  return load(uid).catch((e) => {
    console.warn("brand kit load failed:", e);
    return { ...EMPTY_KIT };
  });
}

async function load(uid: string): Promise<BrandKit> {
  const [memory, rows] = await Promise.all([
    loadWorkspaceMemory(uid),
    getDocs(query(collection(db, "workspace_assets"), where("owner_id", "==", uid)))
      .then((snap) => snap.docs.map((d) => d.data() as Record<string, unknown>))
      .catch((e) => {
        console.warn("brand kit: assets load failed:", e);
        return [] as Record<string, unknown>[];
      }),
  ]);

  const images = rows.filter((r) => typeof r.mime_type === "string" && r.mime_type.startsWith("image/"));
  const withUrls = await Promise.all(
    images.map(async (r) => {
      let url = typeof r.download_url === "string" ? r.download_url : "";
      // Older uploads were saved without their link.
      if (!url && typeof r.storage_path === "string") url = await getDownloadURL(ref(storage, r.storage_path)).catch(() => "");
      return { mime_type: r.mime_type as string, asset_role: r.asset_role as string, created_at: r.created_at as string, url };
    }),
  );

  const business = (memory?.business_profile ?? {}) as Record<string, unknown>;
  const brand = (memory?.brand_profile ?? {}) as Record<string, unknown>;
  const first = text(memory?.first_name ?? business.first_name, 60);
  const last = text(memory?.last_name ?? business.last_name, 60);
  return {
    ...EMPTY_KIT,
    ...pickImages(withUrls),
    brand_name: text(business.brand_name, WEBINAR_LIMITS.brandName),
    // Brand & Files' one-liner; cut, not dropped, when it runs past the tagline limit.
    brand_tagline: text(brand.business_line, WEBINAR_LIMITS.brandTagline),
    presenter_name: [first, last].filter(Boolean).join(" ").slice(0, 60),
  };
}
