// Predict first, then run:  node examples/m3-loop-order.js
const row = ["a", "b", "c"];
row.extra = "not an element";

for (const i in row) {
  console.log("in :", i, typeof i);
}
for (const v of row) {
  console.log("of :", v);
}
console.log("length:", row.length);

let i = 0;
do {
  console.log("do :", i);
  i++;
} while (i < 0);
