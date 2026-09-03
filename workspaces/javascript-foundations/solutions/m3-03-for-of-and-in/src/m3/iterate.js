// m3-03-for-of-and-in (reference solution)
export function ownValues(obj) {
  const out = [];
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      out.push(obj[key]);
    }
  }
  return out;
}

export function firstMatch(list, predicate) {
  for (const item of list) {
    if (predicate(item)) {
      return item;
    }
  }
  return undefined;
}
