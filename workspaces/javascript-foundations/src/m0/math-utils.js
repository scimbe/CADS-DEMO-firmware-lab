// m0-04-modules
// This file is an ES module (package.json says "type": "module"), but nothing
// is exported yet. The test imports { square, cube } and the default export
// (an object { name: "math-utils" }). Add the export statements.

function square(x) {
  return x * x;
}

function cube(x) {
  return x * x * x;
}

const meta = { name: "math-utils" };
