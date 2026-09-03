import { test } from "node:test";
import assert from "node:assert/strict";
import { joinWords, describeCall } from "../src/m4/format.js";

test("m4-02 joinWords uses the default separator when none is given", () => {
  assert.equal(joinWords(undefined, "a", "b"), "a, b");
  assert.equal(joinWords(" - ", "a", "b", "c"), "a - b - c");
  assert.equal(joinWords(), "");
  assert.equal(joinWords("|", "solo"), "solo");
});

test("m4-02 describeCall reports count and values from the rest parameter", () => {
  assert.equal(describeCall("a", "b", "c"), "3 args: a|b|c");
  assert.equal(describeCall(), "0 args: ");
  assert.equal(describeCall(1), "1 args: 1");
});
