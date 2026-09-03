// Predict first, then run:  node examples/m7-pipeline.js
const lines = ["coffee;3.50", "tea;abc", "coffee;1.50"];

const parsed = lines.map((line) => {
  const [label, raw] = line.split(";");
  return { label, amount: Number(raw) };
});
console.log(parsed);

const sum = parsed.reduce((acc, r) => acc + r.amount, 0);
console.log("sum:", sum);
console.log("sum.toFixed(2):", sum.toFixed(2));
console.log("guarded:", parsed.filter((r) => Number.isFinite(r.amount)).reduce((a, r) => a + r.amount, 0));
