import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../src/m0/summary.js";

test("m0-02 summarize returns count, total and average", () => {
  assert.deepEqual(summarize([2, 4, 6]), { count: 3, total: 12, average: 4 });
});

test("m0-02 summarize of an empty array has average 0", () => {
  assert.deepEqual(summarize([]), { count: 0, total: 0, average: 0 });
});
