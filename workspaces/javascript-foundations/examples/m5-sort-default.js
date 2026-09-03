// Predict first, then run:  node examples/m5-sort-default.js
const numbers = [10, 9, 100, 1];
console.log(numbers.sort());
console.log([10, 9, 100, 1].sort((x, y) => x - y));

const items = [{ n: 2 }, { n: 1 }];
const sorted = items.sort((x, y) => x.n - y.n);
console.log(sorted === items);

const sparse = [1, , 3];
console.log(sparse.length, sparse[1], 1 in sparse);
console.log(sparse.map((v) => v * 2));
