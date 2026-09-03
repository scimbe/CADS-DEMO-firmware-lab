import { test } from "node:test";
import assert from "node:assert/strict";
import { ownValues, firstMatch } from "../src/m3/iterate.js";

test("m3-03 ownValues returns values, not keys", () => {
  assert.deepEqual(ownValues({ a: 1, b: 2 }), [1, 2]);
  assert.deepEqual(ownValues({}), []);
});

test("m3-03 firstMatch yields elements, not index strings", () => {
  assert.equal(firstMatch([3, 8, 11], (n) => n > 5), 8);
  assert.equal(firstMatch(["a", "bb"], (s) => s.length === 2), "bb");
  assert.equal(firstMatch([1, 2], (n) => n > 99), undefined);
});

test("m3-03 firstMatch does not visit elements after the match", () => {
  const seen = [];
  firstMatch([1, 2, 3], (n) => {
    seen.push(n);
    return n === 2;
  });
  assert.deepEqual(seen, [1, 2]);
});
