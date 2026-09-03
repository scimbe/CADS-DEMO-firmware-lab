// m4-02-parameters (reference solution)

import "../course-hint.js"; // prints guidance if this file is run directly
export function joinWords(separator = ", ", ...words) {
  return words.join(separator);
}

export const describeCall = (...args) => `${args.length} args: ${args.join("|")}`;
