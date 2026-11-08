// Page builder block moves. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { findPath, insertAt, moveTo, nudge, removeRef } from "../../components/webinar/builder/tree.ts";

const leaf = (id) => ({ id, type: "text", text: id, style: {} });
const page = () => [leaf("a"), { id: "cols", type: "columns", style: {}, columns: [[leaf("x"), leaf("y")], []] }, leaf("b")];
const ids = (blocks) => blocks.map((b) => (b.type === "columns" ? `[${b.columns.map((c) => c.map((x) => x.id).join(",")).join("|")}]` : b.id)).join(" ");

test("reorder at the top level", () => {
  assert.equal(ids(moveTo(page(), [0], [3])), "[x,y|] b a");
  assert.equal(ids(moveTo(page(), [2], [0])), "b a [x,y|]");
  assert.equal(ids(moveTo(page(), [0], [1])), "a [x,y|] b", "dropping in place changes nothing");
});

test("into, within and out of columns", () => {
  assert.equal(ids(moveTo(page(), [0], [1, 1, 0])), "[x,y|a] b", "into an empty column, index shifts handled");
  assert.equal(ids(moveTo(page(), [1, 0, 0], [1, 0, 2])), "a [y,x|] b");
  assert.equal(ids(moveTo(page(), [1, 0, 1], [3])), "a [x|] b y");
});

test("no columns inside columns", () => {
  const p = page();
  assert.equal(moveTo(p, [1], [1, 0, 0]), null);
  assert.equal(insertAt(p, [1, 0, 0], { id: "c2", type: "columns", style: {}, columns: [[]] }), null);
});

test("nudge steps out of a column at its edges", () => {
  assert.equal(ids(nudge(page(), [1, 0, 0], -1)), "a x [y|] b");
  assert.equal(ids(nudge(page(), [1, 0, 1], 1)), "a [x|] y b");
  assert.equal(ids(nudge(page(), [1, 0, 0], 1)), "a [y,x|] b");
  assert.equal(nudge(page(), [0], -1), null);
  assert.equal(ids(nudge(page(), [0], 1)), "[x,y|] a b");
});

test("find and remove", () => {
  const p = page();
  assert.deepEqual(findPath(p, "y"), [1, 0, 1]);
  assert.equal(ids(removeRef(p, p[1].columns[0][0])), "a [y|] b");
});
