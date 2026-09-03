import { test } from "node:test";
import assert from "node:assert/strict";
import meta, { square, cube } from "../src/m0/math-utils.js";

test("m0-03 named exports square and cube", () => {
  assert.equal(square(4), 16);
  assert.equal(cube(3), 27);
});

test("m0-03 default export is the meta object", () => {
  assert.deepEqual(meta, { name: "math-utils" });
});
