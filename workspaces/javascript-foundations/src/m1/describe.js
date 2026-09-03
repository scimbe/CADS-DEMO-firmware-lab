// m1-02-types-typeof
// typeName(value) returns a readable type name:
//   "null" for null, "array" for arrays, otherwise the typeof result
//   ("number", "string", "boolean", "undefined", "object", "function", "bigint", "symbol").
// typeof alone is not enough: typeof null is "object" and typeof [] is "object".
// Hints for the two missing branches are in the comments.

import "../course-hint.js"; // prints guidance if this file is run directly

export function typeName(value) {
  // 1. null first: value === null  ->  "null"
  // 2. arrays next: Array.isArray(value)  ->  "array"
  return typeof value;
}
