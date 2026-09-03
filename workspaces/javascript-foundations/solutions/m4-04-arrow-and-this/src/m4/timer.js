// m4-04-arrow-and-this (reference solution)
// The count lives in a closure, so tick() never depends on `this`.

import "../course-hint.js"; // prints guidance if this file is run directly
export function makeTicker() {
  let count = 0;
  return {
    get count() {
      return count;
    },
    tick: () => {
      count += 1;
      return count;
    },
  };
}

export function runTwice(fn) {
  fn();
  return fn();
}
