// m1-03-coercion-nan
// sumStrings(["1", "2", "3"]) must return the number 6.
// isValidNumber("12.5") is true, isValidNumber("abc") is false.
// Both functions currently return wrong answers without throwing. Run the
// test, look at the actual values, and explain each one before fixing it.

import "../course-hint.js"; // prints guidance if this file is run directly

export function sumStrings(list) {
  let total = 0;
  for (const item of list) {
    total = total + item;
  }
  return total;
}

export function isValidNumber(text) {
  const n = Number(text);
  if (n === NaN) {
    return false;
  }
  return true;
}
