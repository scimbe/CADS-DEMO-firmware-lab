// m1-01-let-const (reference solution)
export function countWords(text) {
  let count = 0;
  for (const word of text.split(" ")) {
    if (word !== "") {
      count = count + 1;
    }
  }
  return count;
}

export function makeLabel(prefix) {
  const suffix = "!";
  const label = prefix + suffix;
  return label;
}
