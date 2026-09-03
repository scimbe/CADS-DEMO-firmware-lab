import { test } from "node:test";
import assert from "node:assert/strict";
import { greet } from "../src/m0/hello.js";

test("m0-02 greet returns the greeting", () => {
  assert.equal(greet(), "Hello, JavaScript!");
});
