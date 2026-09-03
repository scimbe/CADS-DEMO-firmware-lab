// m0-02-read-a-test (reference solution)
export function summarize(numbers) {
  let total = 0;
  for (const n of numbers) {
    total = total + n;
  }
  const count = numbers.length;
  return {
    count: count,
    total: total,
    average: count === 0 ? 0 : total / count,
  };
}
