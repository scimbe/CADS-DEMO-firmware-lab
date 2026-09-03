// m4-03-closures
// makeCounter(start) -> an object { next(), value() }. next() returns the
//   current value and then increments; two counters must not share state.
// makeAdders(list) -> one function per number in the list; adders[i](x)
//   returns list[i] + x. The version below captures the wrong thing.

import "../course-hint.js"; // prints guidance if this file is run directly

export function makeCounter(start) {
  throw new Error("TODO: keep `start` in a closure");
}

export function makeAdders(list) {
  const out = [];
  let i;
  for (i = 0; i < list.length; i++) {
    out.push(function (x) {
      return list[i] + x;
    });
  }
  return out;
}
