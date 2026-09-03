// m4-02-parameters
// joinWords(separator, ...words) -> the words joined by the separator.
//   The separator defaults to ", ". joinWords() is "".
// describeCall(...args) -> "n args: a|b|c" using the rest parameter, NOT the
//   arguments object (an arrow function has no arguments object).
// Both currently throw.

export function joinWords(separator, ...words) {
  throw new Error("TODO: default the separator and join the rest parameter");
}

export const describeCall = (...args) => {
  throw new Error("TODO: report the count and the values");
};
