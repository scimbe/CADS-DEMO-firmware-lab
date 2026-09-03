// m0-03-read-a-test
// summarize(numbers) must return an object with exactly three properties:
//   count   - how many numbers were passed
//   total   - their sum
//   average - total divided by count (0 for an empty array)
// The test compares the whole object with assert.deepEqual, so a wrong
// property NAME fails just like a wrong value. Read the diff the test prints.

import "../course-hint.js"; // prints guidance if this file is run directly

export function summarize(numbers) {
  let sum = 0;
  for (const n of numbers) {
    sum = sum + n;
  }
  const count = numbers.length;
  return {
    count: count,
    sum: sum,
    average: count === 0 ? 0 : sum / count,
  };
}
