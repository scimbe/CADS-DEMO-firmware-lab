// m1-04-equality
// findById(items, id): the item whose id is strictly equal to id, else undefined.
//   findById(items, "1") must NOT find the item with the number id 1.
// sameValue(a, b): true when a and b are the same value, including NaN.
//   sameValue(NaN, NaN) must be true; sameValue(1, "1") must be false.

import "../course-hint.js"; // prints guidance if this file is run directly

export function findById(items, id) {
  for (const item of items) {
    if (item.id == id) {
      return item;
    }
  }
  return undefined;
}

export function sameValue(a, b) {
  return a == b;
}
