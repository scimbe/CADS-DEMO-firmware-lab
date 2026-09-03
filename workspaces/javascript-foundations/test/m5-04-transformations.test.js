import { test } from "node:test";
import assert from "node:assert/strict";
import { totals, topLabels } from "../src/m5/report.js";

const rows = [
  { label: "a", amount: 9 },
  { label: "b", amount: 100 },
  { label: "c", amount: 10 },
];

test("m5-04 totals aggregates count, sum and max", () => {
  assert.deepEqual(totals(rows), { count: 3, sum: 119, max: 100 });
  assert.deepEqual(totals([]), { count: 0, sum: 0, max: 0 });
});

test("m5-04 topLabels orders by amount, largest first", () => {
  assert.deepEqual(topLabels(rows, 2), ["b", "c"]);
  assert.deepEqual(topLabels(rows, 9), ["b", "c", "a"]);
});

test("m5-04 topLabels leaves the caller's array in its original order", () => {
  const input = [
    { label: "a", amount: 9 },
    { label: "b", amount: 100 },
  ];
  topLabels(input, 1);
  assert.deepEqual(input.map((r) => r.label), ["a", "b"]);
});
