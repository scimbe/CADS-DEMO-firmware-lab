---
id: m6-02-async-await
title: async, await and the missing await
bloom: apply
objectives: [js.async.promises]
requires: [m6-01-promises]
estimatedMinutes: 20
scaffold: faded
recallFrom: [m6-01-promises, m5-04-transformations]
links:
  - { step: m6-01-promises }
  - { step: m6-03-async-errors }
  - { file: "src/m6/store.js", line: 20 }
  - { file: "examples/m6-await-order.js" }
sources: [src/m6/store.js, test/m6-02-async-await.test.js, examples/m6-await-order.js]
tasks:
  - id: guess-order
    title: Predict the order of the printed lines
    check: { type: predict, prompt: { en: "examples/m6-await-order.js prints A, B, C, D, two lines from an async function, a then callback, a microtask and a timeout. Write down the exact order before running it.", de: "examples/m6-await-order.js gibt A, B, C, D, zwei Zeilen aus einer async-Funktion, einen then-Callback, einen Microtask und einen Timeout aus. Schreib die genaue Reihenfolge auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m6-await-order.js", expectExitCode: 0, expectStdout: "timeout" }, rubric: "Recognises that an async function body runs synchronously up to its first await, so 'start one' appears before B; that everything after the await is queued and runs only once the synchronous code is finished, hence A, start one, B, C, D and then end one; and that promise callbacks (microtasks) run before a setTimeout callback even with a delay of 0.", bloom: evaluate }
  - id: store
    title: All three store tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m6-02 nameOf resolves with a string, not a Promise", "m6-02 nameOf falls back for unknown ids", "m6-02 namesOf resolves with plain strings in order"], minPass: 3 }
  - id: spot-missing-await
    title: How you spot a missing await
    check: { type: question, prompt: { en: "A missing await raises no error at all. Name two symptoms that give it away in a test failure or a log line, and say where you would look first.", de: "Ein fehlendes await erzeugt überhaupt keinen Fehler. Nenne zwei Symptome, die es in einem Testfehlschlag oder einer Logzeile verraten, und sag, wo du zuerst nachsehen würdest." }, rubric: "Names symptoms such as a Promise printed where a value was expected (Promise { <pending> } or a Promise on the actual side of a diff), a value that is undefined because a property was read off a promise, a truthiness test that always takes the same branch because a promise is always truthy, or work that completes in the wrong order. Says the first place to look is the call that produced the value: whether an await stands in front of it, and whether it sits inside an async function.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:store:failed", question: { en: "Look at the actual value in the diff. Is it a Promise, or an array of Promises?", de: "Sieh dir den tatsächlichen Wert im Diff an. Ist es ein Promise oder ein Array von Promises?" }, hints: [ { en: "readRecord returns a promise, and a promise is always truthy - so the ternary always took the first branch.", de: "readRecord liefert ein Promise, und ein Promise ist immer truthy - der Ternär hat also stets den ersten Zweig genommen." }, { en: "await the call before you test the record.", de: "Warte den Aufruf mit await ab, bevor du den Datensatz prüfst." }, { en: "map with an async callback gives an array of promises; Promise.all turns that into a promise for an array.", de: "map mit einem async-Callback liefert ein Array von Promises; Promise.all macht daraus ein Promise auf ein Array." } ] }
misconceptions:
  - pattern: "Promise \\{"
    question: { en: "A Promise reached an assertion. Which call produced it, and is there an await in front of that call?", de: "Ein Promise ist bei einer Assertion angekommen. Welcher Aufruf hat es erzeugt, und steht ein await davor?" }
    hints: [ { en: "Every async function returns a promise, even when its body looks synchronous.", de: "Jede async-Funktion liefert ein Promise, auch wenn ihr Rumpf synchron aussieht." }, { en: "A missing await produces no error - just a Promise where a value belonged.", de: "Ein fehlendes await erzeugt keinen Fehler - nur ein Promise dort, wo ein Wert hingehörte." }, { en: "await may only be used inside an async function; the enclosing function here already is one.", de: "await darf nur in einer async-Funktion stehen; die umgebende Funktion ist hier bereits eine." } ]
  - pattern: "undefined !== 'unknown'|'Ada' !== undefined"
    question: { en: "The fallback never fired, or a name came back undefined. What was actually tested for truthiness?", de: "Der Ersatzwert griff nie, oder ein Name kam als undefined zurück. Was wurde tatsächlich auf Truthiness geprüft?" }
    hints: [ { en: "A pending promise is an object, and every object is truthy - the m2-02 rule again.", de: "Ein ausstehendes Promise ist ein Objekt, und jedes Objekt ist truthy - wieder die Regel aus m2-02." }, { en: "Await first, then test the record: const record = await readRecord(id);", de: "Erst awaiten, dann den Datensatz prüfen: const record = await readRecord(id);" }, { en: "readRecord resolves with null for an unknown id, which is falsy once it is awaited.", de: "readRecord löst bei unbekannter id mit null auf, und das ist nach dem await falsy." } ]
---
## Learning goal

Write asynchronous code that reads top to bottom, and recognise the silent failure a missing `await` produces.

## Two keywords over one mechanism

```js
export async function nameOf(id) {
  const record = await readRecord(id);
  return record ? record.name : "unknown";
}
```

`async` marks a function whose result is a promise, whatever the body returns. `await` pauses inside that function until a promise settles, and evaluates to its value. Nothing new is happening underneath: MDN's [Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) describes `async`/`await` as syntax over the promise chain you wrote in [m6-01](step:m6-01-promises).

Two facts follow directly, and both matter:

- **An `async` function always returns a promise.** Even `async function f() { return 1; }` returns a promise for `1`. Its caller has to `await` it.
- **`await` pauses only the function it is in.** The rest of the program keeps running. It is not a blocking sleep.

## The missing await

This is the defining bug of asynchronous JavaScript, and it produces no error at all:

```js
const record = readRecord(id);       // a pending Promise
return record ? record.name : "unknown";
```

A pending promise is an object, and [every object is truthy](step:m2-02-truthy-falsy), so the ternary always takes the first branch. `record.name` is `undefined`, because a promise has no `name` property. The function returns `undefined`. Nothing throws.

When the value reaches an assertion, the diff says it plainly:

```
+ Promise {
+   {
+     ok: true
+   }
- {
-   ok: true
  }
```

`+ Promise {` on the actual side means exactly one thing: an `await` is missing somewhere above.

## Ordering

Predict [`examples/m6-await-order.js`](file:examples/m6-await-order.js) before you run it:

```bash
node examples/m6-await-order.js
```

Two rules explain the whole output. An `async` body runs **synchronously up to its first `await`**; everything after that await is queued for later. And queued promise callbacks - microtasks - run before any `setTimeout` callback, even one with a delay of 0.

## Awaiting several things

`await` inside a loop makes calls run one after another. Mapping with an async callback does not do what it looks like either:

```js
ids.map((id) => nameOf(id))              // an array of promises
await Promise.all(ids.map((id) => nameOf(id)))   // a promise for an array of values
```

`Promise.all` is the bridge from many promises to one. [m6-04](step:m6-04-concurrency) is about when to use it.

## The exercise

Open [`src/m6/store.js`](file:src/m6/store.js). `readRecord` is given and correct - do not change it.

- `nameOf(id)` forgets to await. Fix it so it resolves with a string, and with `"unknown"` for an id that has no record.
- `namesOf(ids)` maps and returns an array of promises. Make it resolve with plain strings, in order.

## How you know it worked

```bash
node --test test/m6-02-async-await.test.js
```

Three green, and your prediction recorded. Next: [what happens when an awaited thing fails](step:m6-03-async-errors).
