// m2-02-truthy-falsy (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function withDefaults(options) {
  const port = options.port === undefined ? 8080 : options.port;
  const label = options.label === undefined ? "untitled" : options.label;
  const verbose = options.verbose === undefined ? true : options.verbose;
  return { port, label, verbose };
}
