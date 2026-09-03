// m4-04-arrow-and-this
// makeTicker() returns a ticker: tick() counts up and returns the new count,
// and `count` reports the current value. Two tickers are independent.
//
// runTwice(fn) receives the tick FUNCTION, not the ticker. With the method
// below, `this` is undefined inside module code (modules are strict mode), so
// the detached call fails with
//   TypeError: Cannot read properties of undefined (reading 'count')
// Make the ticker work even when tick is passed around on its own.

import "../course-hint.js"; // prints guidance if this file is run directly

export function makeTicker() {
  return {
    count: 0,
    tick() {
      this.count += 1;
      return this.count;
    },
  };
}

export function runTwice(fn) {
  fn();
  return fn();
}
