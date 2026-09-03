import { test } from "node:test";
import assert from "node:assert/strict";
import { step, inSequence, together, settleAll } from "../src/m6/parallel.js";

test("m6-04 inSequence keeps order and adds up the waits", async () => {
  const started = Date.now();
  const result = await inSequence([() => step("a", 30), () => step("b", 30)]);
  const elapsed = Date.now() - started;
  assert.deepEqual(result, ["a", "b"]);
  assert.ok(elapsed >= 50, `sequential run took only ${elapsed} ms`);
});

test("m6-04 together keeps order but overlaps the waits", async () => {
  const started = Date.now();
  const result = await together([() => step("a", 40), () => step("b", 40)]);
  const elapsed = Date.now() - started;
  assert.deepEqual(result, ["a", "b"]);
  assert.ok(elapsed < 70, `parallel run took ${elapsed} ms, so it was sequential`);
});

test("m6-04 settleAll reports every outcome", async () => {
  const result = await settleAll([
    () => Promise.resolve("fine"),
    () => Promise.reject(new Error("broken")),
  ]);
  assert.deepEqual(result, [
    { status: "fulfilled", value: "fine" },
    { status: "rejected", reason: "broken" },
  ]);
});
