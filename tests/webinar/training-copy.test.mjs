// The editable text of the Training templates: stored safely, shown with the right fallback.
import { test } from "node:test";
import assert from "node:assert/strict";
import { COPY_FIELDS, SAMPLE_COPY, cleanCopy, copyLines, copyOf, safeUrl } from "../../lib/training-copy.ts";

test("cleanCopy keeps known string keys, drops the rest and clamps length", () => {
  const long = "x".repeat(5000);
  const out = cleanCopy({ audience: "For coaches", offer_url: 7, nope: "x", disclaimer: long });
  assert.equal(out.audience, "For coaches");
  assert.equal("offer_url" in out, false);
  assert.equal("nope" in out, false);
  assert.equal(out.disclaimer.length, COPY_FIELDS.find((f) => f.key === "disclaimer").max);
  assert.deepEqual(cleanCopy(null), {});
  assert.deepEqual(cleanCopy("text"), {});
});

test("copyOf: the host's text wins, an emptied field hides, an untouched one falls back", () => {
  assert.equal(copyOf({ cta_note: " Mine " }, "cta_note"), "Mine");
  assert.equal(copyOf({ cta_note: "" }, "cta_note"), "");
  assert.equal(copyOf({}, "cta_note"), "Free. Takes 20 seconds to register.");
  assert.equal(copyOf(undefined, "cta_note"), "Free. Takes 20 seconds to register.");
});

test("claims, testimonials, offers and links are never made up for a live page", () => {
  for (const key of ["audience", "trust_items", "testimonial_quote", "disclaimer", "privacy_url", "offer_title", "offer_url"]) {
    assert.equal(copyOf({}, key), "", key);
  }
});

test("samples exist for previews", () => {
  assert.ok(SAMPLE_COPY.testimonial_quote);
  assert.ok(SAMPLE_COPY.offer_title);
});

test("copyLines drops blank lines", () => {
  assert.deepEqual(copyLines("a\n\n  b  \r\nc\n"), ["a", "b", "c"]);
});

test("safeUrl accepts https links only", () => {
  assert.equal(safeUrl(" https://example.com/x "), "https://example.com/x");
  for (const bad of ["http://example.com", "javascript:alert(1)", "//example.com", "https://a b", "", "https://x.com/\"onclick"]) {
    assert.equal(safeUrl(bad), "", bad);
  }
});
