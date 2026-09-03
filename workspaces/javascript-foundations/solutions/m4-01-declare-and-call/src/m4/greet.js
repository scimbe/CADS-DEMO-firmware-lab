// m4-01-declare-and-call (reference solution)
// `decorate` moved above the module-level call that needs it.

import "../course-hint.js"; // prints guidance if this file is run directly
const decorate = (text) => "== " + text + " ==";

export function buildBanner(name) {
  return decorate(salute(name));
}

function salute(name) {
  return "Hi, " + name;
}

export const DEFAULT_BANNER = buildBanner("world");

export const bannerLength = (name) => buildBanner(name).length;
