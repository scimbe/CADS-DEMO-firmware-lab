// m3-02-off-by-one (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function lastThree(list) {
  const out = [];
  for (let i = Math.max(0, list.length - 3); i < list.length; i++) {
    out.push(list[i]);
  }
  return out;
}

export function movingAverage(list, size) {
  const out = [];
  for (let i = 0; i + size <= list.length; i++) {
    let sum = 0;
    for (let k = 0; k < size; k++) {
      sum += list[i + k];
    }
    out.push(sum / size);
  }
  return out;
}
