// m7-02-capstone-build - YOUR tests.
//
// The tests in m7-02-capstone-build.test.js check the contract. This file is
// where you check the cases you thought of yourself. Add at least two, and make
// at least one of them a case the given tests do NOT cover, for example:
//   - a label that contains a space, or an amount with a leading "+"
//   - a negative amount (a refund) and how it affects the TOTAL line
//   - a report whose last line has no trailing newline
//   - two labels with the same total (the tie-break rule)
//
// Run only this file with:  node --test --test-reporter=tap test/m7-02-capstone-build.mine.test.js
// The step's check passes once at least TWO tests in this file pass.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLine, parseReport, summarize, formatReport } from "../src/m7/report-tool.js";

// TODO: write your own tests here, for example:
//
// test("m7-02 mine: a refund lowers the total", () => {
//   assert.equal(formatReport(summarize(parseReport("coffee;3\ncoffee;-1"))), ...);
// });
