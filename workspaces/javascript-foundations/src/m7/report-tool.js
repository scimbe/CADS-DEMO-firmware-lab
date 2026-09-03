// m7-01-capstone-design / m7-02-capstone-build
//
// A small data-processing tool. Everything here is yours to write; the tests in
// test/m7-02-capstone-build.test.js define the contract exactly.
//
// Input is a plain-text report, one record per line:
//
//     # comments and empty lines are ignored
//     coffee;3.50
//     tea;2
//     coffee;1.50
//
// parseLine(line)
//   -> { label, amount } for a record line (amount is a Number)
//   -> null for an empty line, a whitespace-only line or a comment ("#")
//   -> throws a ReportError with .line set to the offending text when the line
//      has no ";", an empty label, or an amount that is not a finite number
//
// parseReport(text) -> an array of records, in file order
//
// summarize(records)
//   -> { count, sum, byLabel } where byLabel maps each label to its total,
//      and sum is the total over all records. An empty report gives
//      { count: 0, sum: 0, byLabel: {} }.
//
// formatReport(summary)
//   -> one line per label, largest total first, ties broken alphabetically:
//         "coffee: 5.00"
//         "tea: 2.00"
//         "TOTAL: 7.00"
//      Amounts always carry two decimals. An empty summary is just "TOTAL: 0.00".
//
// loadReport(readText) - async: awaits readText(), parses and summarizes it,
//   and returns the formatted string. A rejection from readText() must surface
//   as a ReportError with the message "cannot read report" and the original
//   error kept as its cause.
//
// ReportError extends Error, has name "ReportError", an optional .line, and
// forwards the standard error options so `new ReportError(msg, undefined,
// { cause })` keeps the original error reachable as .cause.

export class ReportError extends Error {
  constructor(message, line, options) {
    super(message);
    throw new Error("TODO: set name and line, and call super correctly");
  }
}

export function parseLine(line) {
  throw new Error("TODO: parse one line");
}

export function parseReport(text) {
  throw new Error("TODO: parse every line, skipping the ones parseLine ignores");
}

export function summarize(records) {
  throw new Error("TODO: aggregate count, sum and per-label totals");
}

export function formatReport(summary) {
  throw new Error("TODO: render the sorted report and the TOTAL line");
}

export async function loadReport(readText) {
  throw new Error("TODO: await the text, then parse, summarize and format it");
}
