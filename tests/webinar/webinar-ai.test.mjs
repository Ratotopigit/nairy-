// AI page copy: tolerant parsing of the model's reply, and a patch that never overwrites the host's words.
import { test } from "node:test";
import assert from "node:assert/strict";
import { coerceWebinarCopy, copyPatch, extractJson, sampleFields } from "../../lib/webinar-copy.ts";

const sample = {
  title: "Your eye-catching webinar title",
  subtitle: "One sentence on the transformation an attendee walks away with.",
  bullets: ["The first thing they'll learn", "The mistake most people make, and how to avoid it", "The exact next step to take after the session"],
  cta_label: "Register now",
  presenter_title: "",
  host_bio: "",
  social_proof: "",
  thank_you_message: "You're in. We'll see you at the session.",
};
const fresh = { ...sample, name: "October masterclass", bullets: [...sample.bullets] };
const copy = coerceWebinarCopy({
  title: "Land your first 10 clients",
  subtitle: "A plan you can start tomorrow.",
  bullets: ["One", "Two", "Three"],
  cta_label: "Save my seat",
  presenter_title: "Coach, Acme",
  host_bio: "Jane runs Acme.",
  social_proof: "",
  thank_you_message: "See you there.",
});

test("parses JSON inside code fences and surrounding junk", () => {
  const reply = 'Sure! Here it is:\n```json\n{"title": "Hi {there}", "bullets": ["a"]}\n```\nAnything else? {not json}';
  const out = coerceWebinarCopy(reply);
  assert.equal(out.title, "Hi {there}");
  assert.deepEqual(out.bullets, ["a"]);
});

test("no JSON or a cut-off reply throws a readable error", () => {
  assert.throws(() => extractJson("I can't help with that."), /didn't send page copy/);
  assert.throws(() => extractJson('{"title": "cut off at 400 char'), /cut off or unreadable/);
});

test("missing fields and non-strings become empty; bullets keep strings only, max 3", () => {
  const out = coerceWebinarCopy({ title: 42, subtitle: null, bullets: ["a", 7, "", "b", "c", "d"], host_bio: { x: 1 } });
  assert.deepEqual(out, {
    title: "", subtitle: "", bullets: ["a", "b", "c"], cta_label: "", presenter_title: "", host_bio: "", social_proof: "", thank_you_message: "",
  });
  assert.deepEqual(coerceWebinarCopy(null).bullets, []);
});

test("over-long fields are clipped at a word boundary within the limits", () => {
  const out = coerceWebinarCopy({ title: "word ".repeat(60), host_bio: "x".repeat(1000), bullets: ["b ".repeat(200)] });
  assert.ok(out.title.length <= 120 && !out.title.endsWith(" ") && out.title.endsWith("word"));
  assert.equal(out.host_bio.length, 280);
  assert.ok(out.bullets[0].length <= 140);
});

test("onlyEmpty replaces sample text, empty fields and a headline equal to the name", () => {
  const w = { ...fresh, title: "October masterclass" };
  const { social_proof, ...rest } = copy; // empty in the AI copy, so never patched
  assert.equal(social_proof, "");
  assert.deepEqual(copyPatch(w, copy, { onlyEmpty: true, sample }), rest);
});

test("onlyEmpty keeps the host's own words", () => {
  const w = { ...fresh, title: "My own headline", bullets: ["My point"], host_bio: "I wrote this.", cta_label: "Join" };
  const patch = copyPatch(w, copy, { onlyEmpty: true, sample });
  assert.equal("title" in patch, false);
  assert.equal("bullets" in patch, false);
  assert.equal("host_bio" in patch, false);
  assert.equal("cta_label" in patch, false);
  assert.equal(patch.subtitle, copy.subtitle);
  assert.deepEqual(sampleFields(w, sample).includes("title"), false);
});

test("without onlyEmpty every non-empty AI field is offered; empty AI fields never blank the page", () => {
  const w = { ...fresh, title: "My own headline", social_proof: "Real proof" };
  const patch = copyPatch(w, copy, { onlyEmpty: false, sample });
  assert.equal(patch.title, copy.title);
  assert.equal("social_proof" in patch, false);
});
