// Pure helpers for lib/brand-kit.ts, kept free of Firebase so node:test can import them.
import type { Webinar } from "./webinars";

export type BrandKit = {
  logo_url: string;
  image_url: string;
  portrait_url: string;
  brand_name: string;
  brand_tagline: string;
  presenter_name: string;
};

export type BrandField = keyof BrandKit;
export const BRAND_FIELDS: BrandField[] = ["logo_url", "image_url", "portrait_url", "brand_name", "brand_tagline", "presenter_name"];
export const BRAND_IMAGE_FIELDS: BrandField[] = ["logo_url", "image_url", "portrait_url"];

export const EMPTY_KIT: BrandKit = { logo_url: "", image_url: "", portrait_url: "", brand_name: "", brand_tagline: "", presenter_name: "" };

export type AssetRow = { mime_type?: string; asset_role?: string | null; created_at?: string; url?: string };

/** Newest https image of each role. Rows may arrive in any order. */
export function pickImages(rows: AssetRow[]): Pick<BrandKit, "logo_url" | "image_url" | "portrait_url"> {
  const time = (r: AssetRow) => (r.created_at ? new Date(r.created_at).getTime() || 0 : 0);
  const images = rows
    .filter((r) => (r.mime_type ?? "").startsWith("image/") && typeof r.url === "string" && r.url.startsWith("https://"))
    .sort((a, b) => time(b) - time(a));
  const newest = (role: string) => images.find((r) => r.asset_role === role)?.url ?? "";
  return {
    logo_url: newest("logo"),
    image_url: newest("background") || newest("brand_photo"),
    portrait_url: newest("brand_photo"),
  };
}

/** Only the fields that are empty on the webinar and filled in the kit: a host's own choices are never overwritten. */
export function brandPatch(webinar: Pick<Webinar, BrandField>, kit: BrandKit): Partial<BrandKit> {
  const patch: Partial<BrandKit> = {};
  for (const key of BRAND_FIELDS) {
    if (!(webinar[key] ?? "").trim() && (kit[key] ?? "").trim()) patch[key] = kit[key];
  }
  return patch;
}
