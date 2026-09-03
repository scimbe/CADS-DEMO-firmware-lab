import { test } from "node:test";
import assert from "node:assert/strict";
import { countUp, sumUntil } from "../src/m3/tally.js";

test("m3-01 countUp builds 1..n and an empty array for 0", () => {
  assert.deepEqual(countUp(5), [1, 2, 3, 4, 5]);
  assert.deepEqual(countUp(1), [1]);
  assert.deepEqual(countUp(0), []);
});

test("m3-01 sumUntil stops at the first element that reaches stop", () => {
  assert.equal(sumUntil([1, 2, 9, 3], 9), 3);
  assert.equal(sumUntil([4, 4, 4], 100), 12);
  assert.equal(sumUntil([10, 1], 10), 0);
  assert.equal(sumUntil([], 5), 0);
});
