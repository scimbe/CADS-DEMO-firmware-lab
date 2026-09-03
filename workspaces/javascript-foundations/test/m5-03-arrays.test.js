import { test } from "node:test";
import assert from "node:assert/strict";
import { addTask, removeAt, trimTo } from "../src/m5/collection.js";

test("m5-03 addTask appends without touching the input", () => {
  const list = ["a"];
  assert.deepEqual(addTask(list, "b"), ["a", "b"]);
  assert.deepEqual(list, ["a"]);
});

test("m5-03 removeAt drops one element without touching the input", () => {
  const list = ["a", "b", "c"];
  assert.deepEqual(removeAt(list, 1), ["a", "c"]);
  assert.deepEqual(removeAt(list, 9), ["a", "b", "c"]);
  assert.deepEqual(list, ["a", "b", "c"]);
});

test("m5-03 trimTo shortens without touching the input", () => {
  const list = [1, 2, 3];
  assert.deepEqual(trimTo(list, 2), [1, 2]);
  assert.deepEqual(trimTo(list, 9), [1, 2, 3]);
  assert.deepEqual(list, [1, 2, 3]);
});
