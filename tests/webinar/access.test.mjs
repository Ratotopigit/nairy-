// Free or paid, live or automated: which links are trusted, and how old documents read.
import { test } from "node:test";
import assert from "node:assert/strict";
import { coerceAccess, isValidPaymentUrl, isValidVideoUrl, publishedSwitchCheck, stockCopyOverride, videoEmbedUrl } from "../../lib/webinar-access.ts";

test("payment links must be https", () => {
  assert.equal(isValidPaymentUrl("https://buy.stripe.com/abc"), true);
  assert.equal(isValidPaymentUrl("http://buy.stripe.com/abc"), false);
  assert.equal(isValidPaymentUrl("javascript:alert(1)"), false);
  assert.equal(isValidPaymentUrl("buy.stripe.com/abc"), false);
  assert.equal(isValidPaymentUrl(""), false);
  assert.equal(isValidPaymentUrl("https://stripe.com@evil.com/pay"), false);
  assert.equal(isValidPaymentUrl(`https://a.com/${"x".repeat(1000)}`), false);
});

test("YouTube links become a no-cookie player built from the id", () => {
  const embed = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s",
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/live/dQw4w9WgXcQ",
  ]) {
    assert.equal(videoEmbedUrl(url), embed, url);
  }
});

test("Vimeo links become a player built from the id", () => {
  assert.equal(videoEmbedUrl("https://vimeo.com/76979871"), "https://player.vimeo.com/video/76979871");
  assert.equal(videoEmbedUrl("https://player.vimeo.com/video/76979871?h=abc"), "https://player.vimeo.com/video/76979871");
});

test("lookalike hosts, http and links without a usable id are refused", () => {
  for (const url of [
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
    "https://evil.com/youtube.com/watch?v=dQw4w9WgXcQ",
    "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com@evil.com/watch?v=dQw4w9WgXcQ",
    "https://vimeo.com.evil.com/76979871",
    "https://evilvimeo.com/76979871",
    "https://youtu.be.evil.com/dQw4w9WgXcQ",
    "https://www.youtube.com/watch",
    "https://www.youtube.com/watch?v=short",
    'https://www.youtube.com/watch?v="><script>x',
    "https://www.youtube.com/playlist?list=abc",
    "https://vimeo.com/channels/staffpicks",
    "https://vimeo.com/76979871/abcdef",
    "javascript:alert(1)",
    "",
  ]) {
    assert.equal(isValidVideoUrl(url), false, url);
    assert.equal(videoEmbedUrl(url), null, url);
  }
});

test("old documents read as free and live", () => {
  assert.deepEqual(coerceAccess({}), { access_type: "free", ticket_price: "", payment_url: "", delivery_type: "live", video_url: "" });
});

test("untrusted values fall back to the defaults", () => {
  assert.deepEqual(
    coerceAccess({ access_type: "PAID", ticket_price: 49, payment_url: { href: "https://x" }, delivery_type: "recorded", video_url: ["https://x"] }),
    { access_type: "free", ticket_price: "", payment_url: "", delivery_type: "live", video_url: "" },
  );
  assert.equal(coerceAccess({ payment_url: `https://a.com/${"x".repeat(1000)}` }).payment_url, "");
  assert.equal(coerceAccess({ ticket_price: "x".repeat(100) }).ticket_price.length, 40);
});

test("stock Training copy changes only for paid and automated", () => {
  const liveFree = { access_type: "free", delivery_type: "live" };
  for (const key of ["cta_note", "fine_print", "access_sub", "final_title", "final_note", "thanks_text", "step1_title"]) {
    assert.equal(stockCopyOverride(liveFree, key), undefined, key);
  }
  const paid = { access_type: "paid", delivery_type: "live" };
  assert.equal(stockCopyOverride(paid, "fine_print"), ""); // "No credit card needed."
  assert.equal(stockCopyOverride({ ...paid, delivery_type: "automated" }, "final_note"), "");
  const automated = { access_type: "free", delivery_type: "automated" };
  assert.equal(stockCopyOverride(automated, "final_note"), ""); // reminder consent
  assert.doesNotMatch(stockCopyOverride(automated, "thanks_text"), /email/i);
  assert.doesNotMatch(stockCopyOverride(automated, "step1_title"), /calendar/i);
  assert.equal(stockCopyOverride(automated, "audience"), undefined);
});

test("a published page refuses a switch whose link is missing or invalid", () => {
  const w = { access_type: "free", delivery_type: "live", payment_url: "", video_url: "", next_session_at: "" };
  assert.ok("refuse" in publishedSwitchCheck(w, { access_type: "paid", delivery_type: "live" }));
  assert.ok("refuse" in publishedSwitchCheck({ ...w, payment_url: "http://x.co" }, { access_type: "paid", delivery_type: "live" }));
  assert.ok("refuse" in publishedSwitchCheck(w, { access_type: "free", delivery_type: "automated" }));
  // Paid automated needs no public video.
  assert.ok("confirm" in publishedSwitchCheck({ ...w, access_type: "paid", payment_url: "https://x.co" }, { access_type: "paid", delivery_type: "automated" }));
});

test("the warning names the date and video link that will be removed", () => {
  const w = { access_type: "free", delivery_type: "live", payment_url: "https://x.co", video_url: "https://youtu.be/dQw4w9WgXcQ", next_session_at: "2030-01-02T10:00:00.000Z" };
  const toAutomated = publishedSwitchCheck(w, { access_type: "free", delivery_type: "automated" });
  assert.match(toAutomated.confirm, /date \(.+\) is removed/);
  const toPaid = publishedSwitchCheck(w, { access_type: "paid", delivery_type: "live" });
  assert.ok(toPaid.confirm.includes(w.video_url));
  assert.match(toPaid.confirm, /is removed/);
});

test("stored values come back unchanged", () => {
  const data = { access_type: "paid", ticket_price: "$49", payment_url: "https://buy.stripe.com/a", delivery_type: "automated", video_url: "https://youtu.be/dQw4w9WgXcQ" };
  assert.deepEqual(coerceAccess(data), data);
});
