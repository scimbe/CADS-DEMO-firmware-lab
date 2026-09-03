// m6-01-promises (reference solution)
export function wait(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(ms), ms));
}

export function loadTwice(ms) {
  return wait(ms).then((first) => wait(ms).then((second) => [first, second]));
}
