// Step m0-02 (PLACEHOLDER): `node --test exercises/m0-02-equality.test.js`
import { test } from "node:test";
import assert from "node:assert/strict";
import { isSame } from "../src/hello.js";

test("same type and value", () => {
  assert.equal(isSame(1, 1), true);
});

test("number and string are not the same", () => {
  assert.equal(isSame(1, "1"), false);
});
