import { test } from "node:test";
import assert from "node:assert/strict";
import { countWords, makeLabel } from "../src/m1/counter.js";

test("m1-01 countWords counts the words of a sentence", () => {
  assert.equal(countWords("let and const are block scoped"), 6);
  assert.equal(countWords(""), 0);
});

test("m1-01 makeLabel appends the suffix", () => {
  assert.equal(makeLabel("Done"), "Done!");
});
