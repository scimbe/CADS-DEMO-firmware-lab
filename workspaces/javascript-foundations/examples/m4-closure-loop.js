// Predict first, then run:  node examples/m4-closure-loop.js
const withVar = [];
for (var a = 0; a < 3; a++) {
  withVar.push(() => a);
}
console.log(withVar.map((f) => f()));

const withLet = [];
for (let b = 0; b < 3; b++) {
  withLet.push(() => b);
}
console.log(withLet.map((f) => f()));

function outer() {
  let n = 0;
  return () => ++n;
}
const one = outer();
const two = outer();
console.log(one(), one(), two());
