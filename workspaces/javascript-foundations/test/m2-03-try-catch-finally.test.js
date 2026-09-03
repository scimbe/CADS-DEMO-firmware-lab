import { test } from "node:test";
import assert from "node:assert/strict";
import { safeParse, withCleanup } from "../src/m2/safe-parse.js";

test("m2-03 safeParse returns the parsed value or the fallback", () => {
  assert.deepEqual(safeParse('{"a":1}', null), { a: 1 });
  assert.equal(safeParse("not json", "fallback"), "fallback");
  assert.deepEqual(safeParse("[1,2", []), []);
});

test("m2-03 withCleanup always runs the cleanup, even when work throws", () => {
  const log = [];
  assert.equal(withCleanup(() => 42, log), 42);
  assert.deepEqual(log, ["start", "cleanup"]);

  const log2 = [];
  assert.throws(
    () =>
      withCleanup(() => {
        throw new Error("boom");
      }, log2),
    { message: "boom" },
  );
  assert.deepEqual(log2, ["start", "cleanup"]);
});
