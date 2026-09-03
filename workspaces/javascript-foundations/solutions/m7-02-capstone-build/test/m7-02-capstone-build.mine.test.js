// m7-02-capstone-build - reference "own tests" (two cases the given suite skips).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLine, parseReport, summarize, formatReport } from "../src/m7/report-tool.js";

test("m7-02 mine: a refund lowers the total", () => {
  assert.equal(
    formatReport(summarize(parseReport("coffee;3\ncoffee;-1"))),
    ["coffee: 2.00", "TOTAL: 2.00"].join("\n"),
  );
});

test("m7-02 mine: labels may contain spaces and amounts a leading plus", () => {
  assert.deepEqual(parseLine("flat white;+2.5"), { label: "flat white", amount: 2.5 });
});
