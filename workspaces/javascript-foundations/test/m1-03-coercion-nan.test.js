import { test } from "node:test";
import assert from "node:assert/strict";
import { sumStrings, isValidNumber } from "../src/m1/numbers.js";

test("m1-03 sumStrings adds numeric strings as numbers", () => {
  assert.equal(sumStrings(["1", "2", "3"]), 6);
  assert.equal(sumStrings(["2.5", "0.5"]), 3);
  assert.equal(sumStrings([]), 0);
});

test("m1-03 isValidNumber rejects text that converts to NaN", () => {
  assert.equal(isValidNumber("12.5"), true);
  assert.equal(isValidNumber("abc"), false);
  assert.equal(isValidNumber("1x"), false);
});
