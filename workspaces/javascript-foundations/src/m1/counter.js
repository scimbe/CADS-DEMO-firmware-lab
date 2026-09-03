// m1-01-let-const
// Two functions, two bugs. Run the test and read both error messages before
// you change anything: one is a TypeError, the other a ReferenceError.

export function countWords(text) {
  const count = 0;
  for (const word of text.split(" ")) {
    if (word !== "") {
      count = count + 1;
    }
  }
  return count;
}

export function makeLabel(prefix) {
  const label = prefix + suffix;
  const suffix = "!";
  return label;
}
