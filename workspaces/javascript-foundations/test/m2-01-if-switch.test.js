import { test } from "node:test";
import assert from "node:assert/strict";
import { letterGrade, dayKind } from "../src/m2/grade.js";

test("m2-01 letterGrade handles the boundaries", () => {
  assert.equal(letterGrade(100), "A");
  assert.equal(letterGrade(90), "A");
  assert.equal(letterGrade(89), "B");
  assert.equal(letterGrade(80), "B");
  assert.equal(letterGrade(79), "C");
  assert.equal(letterGrade(70), "C");
  assert.equal(letterGrade(69), "F");
});

test("m2-01 dayKind does not fall through from weekend to weekday", () => {
  assert.equal(dayKind("sat"), "weekend");
  assert.equal(dayKind("sun"), "weekend");
  assert.equal(dayKind("mon"), "weekday");
  assert.equal(dayKind("fri"), "weekday");
  assert.equal(dayKind("xyz"), "unknown");
});
