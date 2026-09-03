// m5-04-transformations
// totals(rows)   -> { count, sum, max } over rows[i].amount
// topLabels(rows, n) -> the labels of the n largest amounts, largest first
// Array.prototype.sort compares STRINGS by default, so [10, 9, 100] sorts to
// [10, 100, 9]. sort also sorts in place - do not disturb the caller's array.

export function totals(rows) {
  throw new Error("TODO: derive count, sum and max with array methods");
}

export function topLabels(rows, n) {
  const sorted = rows.sort((a, b) => b.amount - a.amount);
  return sorted.slice(0, n).map((row) => row.label);
}
