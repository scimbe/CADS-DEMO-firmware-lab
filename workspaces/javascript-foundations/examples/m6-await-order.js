// Predict first, then run:  node examples/m6-await-order.js
async function work(label) {
  console.log("start", label);
  await null;
  console.log("end", label);
  return label;
}

console.log("A");
const p = work("one");
console.log("B", p instanceof Promise);
p.then((v) => console.log("then", v));
console.log("C");
setTimeout(() => console.log("timeout"), 0);
Promise.resolve().then(() => console.log("microtask"));
console.log("D");
