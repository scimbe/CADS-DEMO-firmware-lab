// m3-01-for-and-while (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function countUp(n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    out.push(i);
  }
  return out;
}

export function sumUntil(list, stop) {
  let total = 0;
  let i = 0;
  while (i < list.length && list[i] < stop) {
    total += list[i];
    i++;
  }
  return total;
}
