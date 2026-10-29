// The training template sets the tail of a headline in its highlight colour.
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitHeadline } from "../../lib/headline.ts";

test("splits at a colon", () => {
  assert.deepEqual(splitHeadline("Buying your first home: what to know before you view"), ["Buying your first home:", "what to know before you view"]);
});

test("splits at a spaced dash, never inside a hyphenated word", () => {
  assert.deepEqual(splitHeadline("Grow your list - without paid ads"), ["Grow your list", "without paid ads"]);
  assert.deepEqual(splitHeadline("Your check-up explained simply today"), ["Your check-up explained", "simply today"]);
});

test("otherwise highlights the last ~40% of the words", () => {
  assert.deepEqual(splitHeadline("Build a client pipeline that doesn't rely on referrals"), ["Build a client pipeline that", "doesn't rely on referrals"]);
});

test("short or empty titles get no highlight", () => {
  assert.deepEqual(splitHeadline("Sleep better"), ["Sleep better", ""]);
  assert.deepEqual(splitHeadline("  "), ["", ""]);
});
