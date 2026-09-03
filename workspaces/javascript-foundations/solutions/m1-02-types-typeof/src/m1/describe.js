// m1-02-types-typeof (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function typeName(value) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}
