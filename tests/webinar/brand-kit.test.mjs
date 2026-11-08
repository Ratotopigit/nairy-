// Brand & Files fill only what the host left empty, from the newest https image of each role.
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_KIT, brandPatch, pickImages } from "../../lib/brand-patch.ts";

const blank = { logo_url: "", image_url: "", portrait_url: "", brand_name: "", brand_tagline: "", presenter_name: "" };

test("fills only empty fields that the kit has", () => {
  const kit = { ...EMPTY_KIT, logo_url: "https://a/logo.png", image_url: "https://a/bg.jpg", brand_name: "Acme" };
  const webinar = { ...blank, logo_url: "https://mine/logo.png", brand_name: "  " };
  assert.deepEqual(brandPatch(webinar, kit), { image_url: "https://a/bg.jpg", brand_name: "Acme" });
});

test("an empty kit or a full webinar gives an empty patch", () => {
  assert.deepEqual(brandPatch(blank, EMPTY_KIT), {});
  const full = { ...blank, logo_url: "x", image_url: "x", portrait_url: "x", brand_name: "x", brand_tagline: "x", presenter_name: "x" };
  assert.deepEqual(brandPatch(full, { ...EMPTY_KIT, logo_url: "https://a" }), {});
});

test("picks the newest image per role, background before brand photo", () => {
  const rows = [
    { mime_type: "image/png", asset_role: "logo", created_at: "2026-01-01", url: "https://old-logo" },
    { mime_type: "image/png", asset_role: "logo", created_at: "2026-03-01", url: "https://new-logo" },
    { mime_type: "image/jpeg", asset_role: "brand_photo", created_at: "2026-02-01", url: "https://photo" },
    { mime_type: "image/jpeg", asset_role: "background", created_at: "2026-01-01", url: "https://bg" },
  ];
  assert.deepEqual(pickImages(rows), { logo_url: "https://new-logo", image_url: "https://bg", portrait_url: "https://photo" });
});

test("brand photo stands in for a missing background; non-images and non-https are skipped", () => {
  const rows = [
    { mime_type: "application/pdf", asset_role: "logo", created_at: "2026-05-01", url: "https://doc.pdf" },
    { mime_type: "image/png", asset_role: "logo", created_at: "2026-04-01", url: "http://insecure" },
    { mime_type: "image/png", asset_role: "logo", created_at: "2026-03-01", url: "" },
    { mime_type: "image/jpeg", asset_role: "brand_photo", url: "https://photo" },
  ];
  assert.deepEqual(pickImages(rows), { logo_url: "", image_url: "https://photo", portrait_url: "https://photo" });
});
