import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ReportError,
  parseLine,
  parseReport,
  summarize,
  formatReport,
  loadReport,
} from "../src/m7/report-tool.js";

const SAMPLE = ["# drinks", "", "coffee;3.50", "tea;2", "coffee;1.50"].join("\n");

test("m7-02 parseLine reads a record and ignores comments and blanks", () => {
  assert.deepEqual(parseLine("coffee;3.50"), { label: "coffee", amount: 3.5 });
  assert.equal(parseLine("# note"), null);
  assert.equal(parseLine(""), null);
  assert.equal(parseLine("   "), null);
});

test("m7-02 parseLine rejects malformed records with a ReportError", () => {
  for (const bad of ["coffee", ";3", "coffee;", "coffee;abc"]) {
    assert.throws(
      () => parseLine(bad),
      (error) => {
        assert.ok(error instanceof ReportError, `${bad}: not a ReportError`);
        assert.ok(error instanceof Error, `${bad}: not an Error`);
        assert.equal(error.name, "ReportError");
        assert.equal(error.line, bad);
        return true;
      },
    );
  }
});

test("m7-02 parseReport keeps file order and drops ignored lines", () => {
  assert.deepEqual(parseReport(SAMPLE), [
    { label: "coffee", amount: 3.5 },
    { label: "tea", amount: 2 },
    { label: "coffee", amount: 1.5 },
  ]);
  assert.deepEqual(parseReport(""), []);
});

test("m7-02 summarize aggregates per label and overall", () => {
  assert.deepEqual(summarize(parseReport(SAMPLE)), {
    count: 3,
    sum: 7,
    byLabel: { coffee: 5, tea: 2 },
  });
  assert.deepEqual(summarize([]), { count: 0, sum: 0, byLabel: {} });
});

test("m7-02 formatReport sorts by total, then alphabetically", () => {
  assert.equal(
    formatReport(summarize(parseReport(SAMPLE))),
    ["coffee: 5.00", "tea: 2.00", "TOTAL: 7.00"].join("\n"),
  );
  assert.equal(
    formatReport(summarize(parseReport("b;1\na;1"))),
    ["a: 1.00", "b: 1.00", "TOTAL: 2.00"].join("\n"),
  );
  assert.equal(formatReport(summarize([])), "TOTAL: 0.00");
});

test("m7-02 loadReport awaits the reader and formats the result", async () => {
  const text = await loadReport(async () => SAMPLE);
  assert.equal(text, ["coffee: 5.00", "tea: 2.00", "TOTAL: 7.00"].join("\n"));
});

test("m7-02 loadReport wraps a reader failure and keeps the cause", async () => {
  await assert.rejects(
    () => loadReport(() => Promise.reject(new Error("no such file"))),
    (error) => {
      assert.ok(error instanceof ReportError);
      assert.equal(error.message, "cannot read report");
      assert.equal(error.cause?.message, "no such file");
      return true;
    },
  );
});
