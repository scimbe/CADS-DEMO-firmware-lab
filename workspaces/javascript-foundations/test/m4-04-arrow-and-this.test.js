import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTicker, runTwice } from "../src/m4/timer.js";

test("m4-04 a ticker counts when called as a method", () => {
  const t = makeTicker();
  assert.equal(t.tick(), 1);
  assert.equal(t.tick(), 2);
  assert.equal(t.count, 2);
});

test("m4-04 tick survives being detached from its object", () => {
  const t = makeTicker();
  const detached = t.tick;
  assert.equal(runTwice(detached), 2);
  assert.equal(t.count, 2);
});

test("m4-04 two tickers stay independent", () => {
  const a = makeTicker();
  const b = makeTicker();
  a.tick();
  assert.equal(a.count, 1);
  assert.equal(b.count, 0);
});
