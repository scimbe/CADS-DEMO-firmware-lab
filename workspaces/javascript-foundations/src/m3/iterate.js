// m3-03-for-of-and-in
// ownValues(obj)  -> the values of the object's own enumerable properties,
//                    in insertion order: ownValues({a: 1, b: 2}) is [1, 2]
// firstMatch(list, predicate) -> the first element the predicate accepts,
//                    or undefined. Must not visit elements after the match.
// ownValues uses for...in on an array-like and hands back keys, not values;
// firstMatch uses for...in on an array, so it hands back index STRINGS.

export function ownValues(obj) {
  const out = [];
  for (const key in obj) {
    out.push(key);
  }
  return out;
}

export function firstMatch(list, predicate) {
  for (const item in list) {
    if (predicate(item)) {
      return item;
    }
  }
  return undefined;
}
