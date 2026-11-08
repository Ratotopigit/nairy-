// Page builder blocks: stored pages are untrusted, so coercion must rebuild them safely.
import { test } from "node:test";
import assert from "node:assert/strict";
import { BLOCK_CATALOG, BLOCK_LIMITS, coerceBlocks, coercePages, createBlock, fillWatchBlocks, safeHttpsUrl, starterBlocks, storedPagesBytes, toStoredPages } from "../../lib/page-blocks.ts";

test("a non-array is an empty page", () => {
  for (const v of [undefined, null, "x", 3, {}, { 0: { type: "text" } }]) assert.deepEqual(coerceBlocks(v), []);
});

test("unknown types and junk entries are dropped", () => {
  const out = coerceBlocks([{ type: "script", code: "x" }, null, "text", 5, { type: "text", text: "hi" }, { text: "no type" }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].type, "text");
  assert.equal(out[0].text, "hi");
});

test("javascript:, http: and junk URLs are blanked; https kept", () => {
  const [img, btn, vid, pres, ok] = coerceBlocks([
    { type: "image", url: "javascript:alert(1)" },
    { type: "button", action: "link", href: "http://example.com" },
    { type: "video", source: "custom", url: " JaVaScRiPt:alert(1)" },
    { type: "presenter", photo: "data:image/png;base64,AAAA" },
    { type: "image", url: "https://example.com/a.png" },
  ]);
  assert.equal(img.url, "");
  assert.equal(btn.href, "");
  assert.equal(vid.url, "");
  assert.equal(pres.photo, "");
  assert.equal(ok.url, "https://example.com/a.png");
});

test("columns nest one level only, and are capped", () => {
  const inner = { type: "columns", columns: [[{ type: "text", text: "deep" }]] };
  const [cols] = coerceBlocks([
    {
      type: "columns",
      columns: [[inner, { type: "text", text: "a" }], [{ type: "heading", text: "b" }], [], [{ type: "text", text: "4th" }]],
    },
  ]);
  assert.equal(cols.type, "columns");
  assert.equal(cols.columns.length, BLOCK_LIMITS.columns);
  assert.deepEqual(cols.columns[0].map((b) => b.type), ["text"]); // nested columns dropped
  assert.ok(cols.columns.flat().every((b) => b.type !== "columns"));
  const many = Array.from({ length: 30 }, () => ({ type: "text", text: "x" }));
  assert.equal(coerceBlocks([{ type: "columns", columns: [many] }])[0].columns[0].length, BLOCK_LIMITS.blocksPerColumn);
  assert.deepEqual(coerceBlocks([{ type: "columns", columns: "nope" }]), []);
});

test("limits are enforced", () => {
  const page = Array.from({ length: 100 }, () => ({ type: "divider" }));
  assert.equal(coerceBlocks(page).length, BLOCK_LIMITS.blocksPerPage);
  const [h, t, list, sp, img, styled] = coerceBlocks([
    { type: "heading", text: "h".repeat(5000), level: 9 },
    { type: "text", text: "t".repeat(9000) },
    { type: "list", items: Array.from({ length: 40 }, () => "i".repeat(900)), marker: "star" },
    { type: "spacer", height: 99999 },
    { type: "image", url: "https://e.com/a.png", width: 5 },
    { type: "text", style: { bg: "red", color: "#ABCDEF", align: "justify", pad: -4 } },
  ]);
  assert.equal(h.text.length, BLOCK_LIMITS.heading);
  assert.equal(h.level, 1);
  assert.equal(t.text.length, BLOCK_LIMITS.text);
  assert.equal(list.items.length, BLOCK_LIMITS.listItems);
  assert.equal(list.items[0].length, BLOCK_LIMITS.listItem);
  assert.equal(list.marker, "tick");
  assert.equal(sp.height, 400);
  assert.equal(img.width, 20);
  assert.deepEqual(styled.style, { bg: "", color: "#ABCDEF", align: "center", pad: 0 });
});

test("html code is kept as text but bounded", () => {
  const code = "<script>alert(document.cookie)</script>";
  const [a, b] = coerceBlocks([
    { type: "html", code, height: 1 },
    { type: "html", code: "x".repeat(BLOCK_LIMITS.html + 500), height: 99999 },
  ]);
  assert.equal(a.code, code);
  assert.equal(a.height, 40);
  assert.equal(b.code.length, BLOCK_LIMITS.html);
  assert.equal(b.height, 2000);
});

test("ids are cleaned or replaced", () => {
  const [a, b] = coerceBlocks([{ type: "divider", id: "ab\"><x" }, { type: "divider" }]);
  assert.equal(a.id, "abx");
  assert.match(b.id, /^[A-Za-z0-9]+$/);
});

test("coercePages keeps known pages with blocks only", () => {
  assert.deepEqual(coercePages(null), {});
  assert.deepEqual(coercePages("x"), {});
  const pages = coercePages({ registration: [{ type: "text", text: "a" }], thanks: [], replay: "x", watch: [{ type: "watch-player", extra: "<x>" }], evil: [{ type: "text" }] });
  assert.deepEqual(Object.keys(pages), ["registration", "watch"]);
  assert.deepEqual(Object.keys(pages.watch[0]).sort(), ["id", "style", "type"]); // nothing extra survives
  assert.equal(pages.registration[0].text, "a");
});

test("fresh and starter blocks survive coercion unchanged", () => {
  for (const page of ["registration", "thanks", "replay", "watch"]) {
    const blocks = starterBlocks(page);
    assert.deepEqual(coerceBlocks(JSON.parse(JSON.stringify(blocks))), blocks);
  }
  const cols = createBlock("columns");
  assert.deepEqual(coerceBlocks([cols]), [cols]);
});

/** Firestore rejects an array directly inside an array, at any depth. */
function hasNestedArray(v, inArray = false) {
  if (Array.isArray(v)) return inArray || v.some((x) => hasNestedArray(x, true));
  if (v && typeof v === "object") return Object.values(v).some((x) => hasNestedArray(x, false));
  return false;
}

test("stored pages have no nested arrays and round-trip through coercePages", () => {
  const cols = createBlock("columns");
  cols.columns.push([createBlock("list"), createBlock("form")]);
  const pages = { registration: [createBlock("heading"), cols], thanks: starterBlocks("thanks") };
  assert.ok(hasNestedArray(pages)); // the in-memory form is what Firestore refused
  const stored = JSON.parse(JSON.stringify(toStoredPages(pages)));
  assert.equal(hasNestedArray(stored), false);
  assert.deepEqual(stored.registration[1].columns.map((c) => c.blocks.length), [1, 1, 2]);
  assert.deepEqual(coercePages(stored), pages);
  // Documents saved before the fix (nested arrays) still read.
  assert.deepEqual(coercePages(JSON.parse(JSON.stringify(pages))), pages);
  assert.ok(storedPagesBytes(pages) > 0);
});

test("at most 3 html blocks per page, columns included", () => {
  const html = { type: "html", code: "<b>x</b>" };
  const out = coerceBlocks([html, html, { type: "columns", columns: [[html, { type: "text", text: "t" }], [html]] }, html]);
  const count = out.flatMap((b) => (b.type === "columns" ? b.columns.flat() : [b])).filter((b) => b.type === "html").length;
  assert.equal(count, BLOCK_LIMITS.htmlPerPage);
  assert.equal(BLOCK_LIMITS.html, 10000);
});

test("a URL that is too long is dropped, not cut", () => {
  assert.equal(safeHttpsUrl(`https://e.com/${"a".repeat(BLOCK_LIMITS.url)}`), "");
  assert.equal(safeHttpsUrl("https://e.com/ok"), "https://e.com/ok");
});

test("a new button defaults to a link outside the registration page", () => {
  assert.equal(createBlock("button", "registration").action, "form");
  assert.equal(createBlock("button").action, "form");
  assert.equal(createBlock("button", "thanks").action, "link");
  assert.equal(createBlock("button", "replay").action, "link");
});

test("the watch player is offered on the watch room only, and the form never there", () => {
  const pagesOf = (type) => BLOCK_CATALOG.find((c) => c.type === type).pages;
  assert.deepEqual(pagesOf("watch-player"), ["watch"]);
  assert.ok(!pagesOf("form").includes("watch"));
  assert.ok(pagesOf("button").includes("watch"));
  assert.deepEqual(starterBlocks("watch").map((b) => b.type), ["heading", "watch-player", "button", "text"]);
});

test("the standard watch room fills headline, subtitle and offer, and drops what isn't set", () => {
  const room = { headline: "", offer_label: "", offer_url: "" };
  const types = (w) => fillWatchBlocks(starterBlocks("watch"), w).map((b) => b.type);
  assert.deepEqual(types({ title: "T", subtitle: "", watch_room: room }), ["heading", "watch-player"]);
  const full = fillWatchBlocks(starterBlocks("watch"), {
    title: "T",
    subtitle: "Sub",
    watch_room: { headline: "Room", offer_label: "Buy", offer_url: "https://pay.example.com/x" },
  });
  assert.deepEqual(full.map((b) => b.type), ["heading", "watch-player", "button", "text"]);
  assert.equal(full[0].text, "Room");
  assert.equal(full[2].href, "https://pay.example.com/x");
  assert.equal(full[2].label, "Buy");
  assert.equal(full[3].text, "Sub");
  // A label without a safe link is no offer.
  assert.deepEqual(types({ title: "T", subtitle: "", watch_room: { headline: "", offer_label: "Buy", offer_url: "http://x.com" } }), ["heading", "watch-player"]);
});
