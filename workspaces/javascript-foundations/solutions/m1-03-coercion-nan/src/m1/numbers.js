// m1-03-coercion-nan (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function sumStrings(list) {
  let total = 0;
  for (const item of list) {
    total = total + Number(item);
  }
  return total;
}

export function isValidNumber(text) {
  const n = Number(text);
  if (Number.isNaN(n)) {
    return false;
  }
  return true;
}
