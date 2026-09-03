import { test } from "node:test";
import assert from "node:assert/strict";
import { makeCounter, makeAdders } from "../src/m4/counter-factory.js";

test("m4-03 a counter keeps its own state", () => {
  const c = makeCounter(10);
  assert.equal(c.next(), 10);
  assert.equal(c.next(), 11);
  assert.equal(c.value(), 12);
});

test("m4-03 two counters do not share state", () => {
  const a = makeCounter(0);
  const b = makeCounter(0);
  a.next();
  a.next();
  assert.equal(a.value(), 2);
  assert.equal(b.value(), 0);
});

test("m4-03 every adder captures its own number", () => {
  const adders = makeAdders([1, 10, 100]);
  assert.equal(adders[0](5), 6);
  assert.equal(adders[1](5), 15);
  assert.equal(adders[2](5), 105);
});
