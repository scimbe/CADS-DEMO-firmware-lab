// m1-04-equality (reference solution)
export function findById(items, id) {
  for (const item of items) {
    if (item.id === id) {
      return item;
    }
  }
  return undefined;
}

export function sameValue(a, b) {
  return Object.is(a, b);
}
