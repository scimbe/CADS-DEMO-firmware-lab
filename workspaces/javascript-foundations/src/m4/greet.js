// m4-01-declare-and-call
// This file does not even load. Run the test and read the ReferenceError.
//
// buildBanner(name)  -> "== Hi, <name> =="
// DEFAULT_BANNER     -> buildBanner("world"), computed once when the module loads
// bannerLength(name) -> the length of the banner
//
// `salute` is a function DECLARATION: hoisted, callable above its definition.
// `decorate` is a function EXPRESSION in a const: it exists only from the line
// that initialises it onward. Move exactly what has to move - do not turn the
// arrow function into a declaration.

import "../course-hint.js"; // prints guidance if this file is run directly

export const DEFAULT_BANNER = buildBanner("world");

export function buildBanner(name) {
  return decorate(salute(name));
}

function salute(name) {
  return "Hi, " + name;
}

const decorate = (text) => "== " + text + " ==";

export const bannerLength = (name) => buildBanner(name).length;
