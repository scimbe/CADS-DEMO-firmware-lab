// m5-03-arrays (reference solution)
export function addTask(list, task) {
  return [...list, task];
}

export function removeAt(list, index) {
  if (index < 0 || index >= list.length) return [...list];
  return [...list.slice(0, index), ...list.slice(index + 1)];
}

export function trimTo(list, size) {
  return list.slice(0, size);
}
