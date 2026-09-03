// Predict first, then run:  node examples/m2-switch-fallthrough.js
function price(fruit) {
  switch (fruit) {
    case "Apples":
      console.log("Apples are $0.32 a pound.");
    case "Bananas":
      console.log("Bananas are $0.48 a pound.");
      break;
    case "Cherries":
      console.log("Cherries are $3.00 a pound.");
      break;
    default:
      console.log(`Sorry, we are out of ${fruit}.`);
  }
}
price("Apples");
price("Cherries");
price("Mangoes");
