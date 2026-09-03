// m6-01-promises
// wait(ms)            -> a Promise that settles after ms milliseconds with the value ms
// loadTwice(ms)       -> a Promise for [ms, ms], produced by chaining .then()
//                        twice on wait(ms) - no async/await in this step
// Neither returns a Promise yet, so the caller has nothing to await.

export function wait(ms) {
  throw new Error("TODO: return a Promise that resolves after ms");
}

export function loadTwice(ms) {
  throw new Error("TODO: chain .then() on wait(ms) and collect both values");
}
