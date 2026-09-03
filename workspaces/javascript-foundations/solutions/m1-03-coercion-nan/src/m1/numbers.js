// m1-03-coercion-nan (reference solution)
export function sumStrings(list) {
  let total = 0;
  for (const item of list) {
    total = total + Number(item);
  }
  return total;
}

export function isValidNumber(text) {
  const n = Number(text);
  if (Number.isNaN(n)) {
    return false;
  }
  return true;
}
