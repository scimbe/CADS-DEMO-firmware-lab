import { test } from "node:test";
import assert from "node:assert/strict";
import { READY } from "../src/m0/ready.js";

test("m0-01 the workspace is ready", () => {
  assert.equal(
    READY,
    true,
    "Set READY to true in src/m0/ready.js - do not change this test file.",
  );
});
