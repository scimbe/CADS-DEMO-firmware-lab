// Predict first, then run:  node examples/m2-finally-order.js
function f() {
  try {
    console.log(0);
    throw "bogus";
  } catch (e) {
    console.log(1);
    return true;
  } finally {
    console.log(3);
    return false;
  }
}
console.log(f());
