// Step m0-01 (PLACEHOLDER): `node --test exercises/m0-01-hello.test.js`
import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/hello.js";

test("greets by name", () => {
  assert.equal(greet("CaDS"), "Hello, CaDS!");
});

test("greets an empty name", () => {
  assert.equal(greet(""), "Hello, !");
});
