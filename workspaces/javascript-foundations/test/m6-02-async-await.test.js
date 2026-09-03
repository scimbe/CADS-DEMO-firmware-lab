import { test } from "node:test";
import assert from "node:assert/strict";
import { nameOf, namesOf } from "../src/m6/store.js";

test("m6-02 nameOf resolves with a string, not a Promise", async () => {
  assert.equal(await nameOf(1), "Ada");
  assert.equal(await nameOf(2), "Grace");
});

test("m6-02 nameOf falls back for unknown ids", async () => {
  assert.equal(await nameOf(99), "unknown");
});

test("m6-02 namesOf resolves with plain strings in order", async () => {
  assert.deepEqual(await namesOf([2, 1, 99]), ["Grace", "Ada", "unknown"]);
});
