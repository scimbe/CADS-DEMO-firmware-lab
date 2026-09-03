// m2-03-try-catch-finally
// safeParse(text, fallback): JSON.parse(text); if parsing throws, return fallback.
// withCleanup(work, log): call work(); whatever happens, push "cleanup" to log
//   afterwards. If work() throws, the error must still reach the caller
//   (rethrow it, or do not catch it at all).

import "../course-hint.js"; // prints guidance if this file is run directly

export function safeParse(text, fallback) {
  throw new Error("TODO: parse text, return fallback on failure");
}

export function withCleanup(work, log) {
  log.push("start");
  const result = work();
  log.push("cleanup");
  return result;
}
