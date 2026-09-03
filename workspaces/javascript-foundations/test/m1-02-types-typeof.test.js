import { test } from "node:test";
import assert from "node:assert/strict";
import { typeName } from "../src/m1/describe.js";

test("m1-02 typeName reports primitives via typeof", () => {
  assert.equal(typeName(42), "number");
  assert.equal(typeName("hi"), "string");
  assert.equal(typeName(true), "boolean");
  assert.equal(typeName(undefined), "undefined");
  assert.equal(typeName(10n), "bigint");
  assert.equal(typeName(() => 1), "function");
});

test("m1-02 typeName distinguishes null and arrays from objects", () => {
  assert.equal(typeName(null), "null");
  assert.equal(typeName([1, 2]), "array");
  assert.equal(typeName({ a: 1 }), "object");
});
