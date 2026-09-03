import { test } from "node:test";
import assert from "node:assert/strict";
import { lastThree, movingAverage } from "../src/m3/window.js";

test("m3-02 lastThree returns exactly the last three elements", () => {
  assert.deepEqual(lastThree([1, 2, 3, 4, 5]), [3, 4, 5]);
  assert.deepEqual(lastThree([1, 2]), [1, 2]);
  assert.deepEqual(lastThree([]), []);
});

test("m3-02 movingAverage returns one value per full window", () => {
  assert.deepEqual(movingAverage([1, 2, 3, 4], 2), [1.5, 2.5, 3.5]);
  assert.deepEqual(movingAverage([2, 4, 6], 3), [4]);
  assert.deepEqual(movingAverage([1, 2], 3), []);
});
