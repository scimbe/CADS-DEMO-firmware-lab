import { test } from "node:test";
import assert from "node:assert/strict";
import { failing, tryLoad, mustLoad } from "../src/m6/robust.js";

test("m6-03 tryLoad reports a resolved value", async () => {
  assert.deepEqual(await tryLoad(() => Promise.resolve(7)), { ok: true, value: 7 });
});

test("m6-03 tryLoad catches a rejection instead of leaking it", async () => {
  assert.deepEqual(await tryLoad(() => failing("disk gone")), {
    ok: false,
    error: "disk gone",
  });
});

test("m6-03 mustLoad passes a value through", async () => {
  assert.equal(await mustLoad(() => Promise.resolve("ok")), "ok");
});

test("m6-03 mustLoad wraps a rejection and keeps the cause", async () => {
  await assert.rejects(
    () => mustLoad(() => failing("disk gone")),
    (error) => {
      assert.equal(error.message, "load failed: disk gone");
      assert.equal(error.cause?.message, "disk gone");
      return true;
    },
  );
});
