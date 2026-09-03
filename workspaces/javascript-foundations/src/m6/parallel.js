// m6-04-concurrency
// step(label, ms) resolves with the label after ms milliseconds - given.
//
// inSequence(jobs)  -> the results in order, each job started only after the
//                      previous one settled
// together(jobs)    -> the results in order, all jobs started at once
// settleAll(jobs)   -> one entry per job even when some reject:
//                      { status: "fulfilled", value } or { status: "rejected", reason }
//                      (reason is the error MESSAGE, not the Error object)
// The test measures elapsed time, so `together` really has to run in parallel.

import "../course-hint.js"; // prints guidance if this file is run directly

export function step(label, ms) {
  return new Promise((resolve) => setTimeout(() => resolve(label), ms));
}

export async function inSequence(jobs) {
  throw new Error("TODO: await one job after the other");
}

export async function together(jobs) {
  throw new Error("TODO: start every job, then await them all");
}

export async function settleAll(jobs) {
  throw new Error("TODO: report every outcome, successful or not");
}
