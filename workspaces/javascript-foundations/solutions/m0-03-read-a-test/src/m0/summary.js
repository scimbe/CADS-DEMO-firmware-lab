// m0-03-read-a-test (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function summarize(numbers) {
  let total = 0;
  for (const n of numbers) {
    total = total + n;
  }
  const count = numbers.length;
  return {
    count: count,
    total: total,
    average: count === 0 ? 0 : total / count,
  };
}
