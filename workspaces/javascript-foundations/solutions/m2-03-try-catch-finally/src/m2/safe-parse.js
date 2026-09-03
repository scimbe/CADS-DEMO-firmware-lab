// m2-03-try-catch-finally (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function safeParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return fallback;
  }
}

export function withCleanup(work, log) {
  log.push("start");
  try {
    return work();
  } finally {
    log.push("cleanup");
  }
}
