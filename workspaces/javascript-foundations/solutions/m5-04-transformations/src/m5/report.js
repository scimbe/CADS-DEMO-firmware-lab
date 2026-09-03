// m5-04-transformations (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function totals(rows) {
  const amounts = rows.map((row) => row.amount);
  return {
    count: amounts.length,
    sum: amounts.reduce((acc, n) => acc + n, 0),
    max: amounts.reduce((acc, n) => (n > acc ? n : acc), 0),
  };
}

export function topLabels(rows, n) {
  return [...rows]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n)
    .map((row) => row.label);
}
