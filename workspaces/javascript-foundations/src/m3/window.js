// m3-02-off-by-one
// lastThree(list)          -> the last three elements (fewer if the list is shorter)
// movingAverage(list, size) -> one average per full window of `size` elements:
//                              movingAverage([1, 2, 3, 4], 2) is [1.5, 2.5, 3.5]
// Both functions have an off-by-one error. Run the test first and read the
// TypeError before you change a comparison operator.

import "../course-hint.js"; // prints guidance if this file is run directly

export function lastThree(list) {
  const out = [];
  for (let i = list.length - 3; i <= list.length; i++) {
    out.push(list[i]);
  }
  return out;
}

export function movingAverage(list, size) {
  const out = [];
  for (let i = 0; i <= list.length - size; i++) {
    let sum = 0;
    for (let k = 0; k <= size; k++) {
      sum += list[i + k];
    }
    out.push(sum / size);
  }
  return out;
}
