import { test } from "node:test";
import assert from "node:assert/strict";
import { findById, sameValue } from "../src/m1/lookup.js";

const items = [
  { id: 1, name: "one" },
  { id: "2", name: "two" },
];

test("m1-04 findById compares ids without type conversion", () => {
  assert.deepEqual(findById(items, 1), { id: 1, name: "one" });
  assert.deepEqual(findById(items, "2"), { id: "2", name: "two" });
  assert.equal(findById(items, "1"), undefined);
  assert.equal(findById(items, 2), undefined);
});

test("m1-04 sameValue treats NaN as the same value and never converts types", () => {
  assert.equal(sameValue(NaN, NaN), true);
  assert.equal(sameValue(1, "1"), false);
  assert.equal(sameValue(0, false), false);
  assert.equal(sameValue("a", "a"), true);
});
