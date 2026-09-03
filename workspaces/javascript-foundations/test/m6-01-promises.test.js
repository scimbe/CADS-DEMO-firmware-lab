import { test } from "node:test";
import assert from "node:assert/strict";
import { wait, loadTwice } from "../src/m6/delay.js";

test("m6-01 wait returns a Promise that resolves with the delay", async () => {
  const pending = wait(5);
  assert.ok(pending instanceof Promise, "wait must return a Promise");
  assert.equal(await pending, 5);
});

test("m6-01 wait really waits", async () => {
  const started = Date.now();
  await wait(20);
  assert.ok(Date.now() - started >= 15, "wait(20) settled too early");
});

test("m6-01 loadTwice chains and collects both values", async () => {
  assert.deepEqual(await loadTwice(1), [1, 1]);
});
