// m4-03-closures (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function makeCounter(start) {
  let current = start;
  return {
    next() {
      const value = current;
      current += 1;
      return value;
    },
    value() {
      return current;
    },
  };
}

export function makeAdders(list) {
  const out = [];
  for (let i = 0; i < list.length; i++) {
    out.push(function (x) {
      return list[i] + x;
    });
  }
  return out;
}
