// m4-02-parameters (reference solution)
export function joinWords(separator = ", ", ...words) {
  return words.join(separator);
}

export const describeCall = (...args) => `${args.length} args: ${args.join("|")}`;
