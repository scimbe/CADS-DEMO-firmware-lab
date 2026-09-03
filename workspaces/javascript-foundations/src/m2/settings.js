// m2-02-truthy-falsy
// withDefaults(options) fills in defaults ONLY for properties that are undefined:
//   port -> 8080, label -> "untitled", verbose -> true
// A caller who passes port 0, label "" or verbose false means it.
// The current code uses truthiness and silently overwrites those values.

import "../course-hint.js"; // prints guidance if this file is run directly

export function withDefaults(options) {
  const port = options.port ? options.port : 8080;
  const label = options.label || "untitled";
  const verbose = options.verbose || true;
  return { port, label, verbose };
}
