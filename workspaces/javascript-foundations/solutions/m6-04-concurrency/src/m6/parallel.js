// m6-04-concurrency (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function step(label, ms) {
  return new Promise((resolve) => setTimeout(() => resolve(label), ms));
}

export async function inSequence(jobs) {
  const out = [];
  for (const job of jobs) {
    out.push(await job());
  }
  return out;
}

export async function together(jobs) {
  return Promise.all(jobs.map((job) => job()));
}

export async function settleAll(jobs) {
  const settled = await Promise.allSettled(jobs.map((job) => job()));
  return settled.map((entry) =>
    entry.status === "fulfilled"
      ? { status: "fulfilled", value: entry.value }
      : { status: "rejected", reason: entry.reason.message },
  );
}
