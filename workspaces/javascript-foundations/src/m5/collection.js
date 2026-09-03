// m5-03-arrays
// addTask(list, task)   -> a NEW array with the task appended
// removeAt(list, index) -> a NEW array without the element at index;
//                          an index outside the array changes nothing
// trimTo(list, size)    -> a NEW array with at most `size` elements
// The current code mutates the caller's array with push and splice. The test
// checks that the input is untouched.

export function addTask(list, task) {
  list.push(task);
  return list;
}

export function removeAt(list, index) {
  list.splice(index, 1);
  return list;
}

export function trimTo(list, size) {
  list.length = size;
  return list;
}
