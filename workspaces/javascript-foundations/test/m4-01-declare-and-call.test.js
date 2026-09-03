import { test } from "node:test";
import assert from "node:assert/strict";
import { buildBanner, bannerLength, DEFAULT_BANNER } from "../src/m4/greet.js";

test("m4-01 buildBanner decorates the salute", () => {
  assert.equal(buildBanner("Ada"), "== Hi, Ada ==");
});

test("m4-01 the module-level banner is computed at load time", () => {
  assert.equal(DEFAULT_BANNER, "== Hi, world ==");
});

test("m4-01 bannerLength counts the finished banner", () => {
  assert.equal(bannerLength("Ada"), 13);
});
