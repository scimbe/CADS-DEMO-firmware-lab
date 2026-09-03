---
id: m6-01-promises
title: Promises, and what a pending value is
bloom: understand
objectives: [js.async.promises]
requires: [m5-04-transformations]
estimatedMinutes: 20
scaffold: worked
recallFrom: [m4-03-closures, m5-04-transformations]
links:
  - { step: m5-04-transformations }
  - { step: m6-02-async-await }
  - { file: "src/m6/delay.js", line: 8 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises", title: "MDN: Using promises" }
sources: [src/m6/delay.js, test/m6-01-promises.test.js, src/m4/counter-factory.js]
tasks:
  - id: delay
    title: All three promise tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m6-01 wait returns a Promise that resolves with the delay", "m6-01 wait really waits", "m6-01 loadTwice chains and collects both values"], minPass: 3 }
  - id: what-is-pending
    title: What the function returns before the work is done
    check: { type: question, prompt: { en: "wait(20) returns immediately, long before 20 milliseconds have passed. Describe what the caller is holding at that moment, what the three states of a promise are, and why the value inside it cannot simply be read out synchronously.", de: "wait(20) kehrt sofort zurück, lange bevor 20 Millisekunden vergangen sind. Beschreibe, was der Aufrufer in diesem Moment in der Hand hält, welche drei Zustände ein Promise hat, und warum der Wert darin nicht einfach synchron ausgelesen werden kann." }, rubric: "States that the caller holds a Promise object that is pending, and names the three states pending, fulfilled and rejected; explains that the value arrives later, so it can only be reached through a callback registered with .then (or await), because reading it synchronously would mean blocking the single thread that would have to run the work.", bloom: understand, minChars: 100 }
socratic:
  - { trigger: "task:delay:failed", question: { en: "Does your function return a Promise at all, or does it return the value it computed?", de: "Liefert deine Funktion überhaupt ein Promise, oder liefert sie den berechneten Wert?" }, hints: [ { en: "new Promise((resolve) => …) hands you a resolve function; call it when the work is done.", de: "new Promise((resolve) => …) gibt dir eine resolve-Funktion; ruf sie auf, wenn die Arbeit fertig ist." }, { en: "setTimeout(() => resolve(ms), ms) is the whole body of wait.", de: "setTimeout(() => resolve(ms), ms) ist der ganze Rumpf von wait." }, { en: "loadTwice must return the chain itself: wait(ms).then(…) - a then callback that returns a promise is waited for.", de: "loadTwice muss die Kette selbst zurückgeben: wait(ms).then(…) - ein then-Callback, der ein Promise liefert, wird abgewartet." } ] }
misconceptions:
  - pattern: "Promise \\{"
    question: { en: "A Promise turned up where a value was expected. Was the chain returned, or was its result used directly?", de: "Ein Promise ist dort aufgetaucht, wo ein Wert erwartet wurde. Wurde die Kette zurückgegeben, oder wurde ihr Ergebnis direkt benutzt?" }
    hints: [ { en: "A promise is a container for a value that is not there yet; printing it shows the container.", de: "Ein Promise ist ein Behälter für einen noch nicht vorhandenen Wert; ausgeben zeigt den Behälter." }, { en: "The value is reachable only inside .then(value => …) or after await.", de: "Der Wert ist nur innerhalb von .then(value => …) oder nach await erreichbar." }, { en: "Return the chain from your function so the caller can wait for it too.", de: "Gib die Kette aus deiner Funktion zurück, damit der Aufrufer ebenfalls darauf warten kann." } ]
  - pattern: "settled too early|is not a function"
    question: { en: "Either nothing waited, or something that is not a promise was chained. What exactly did the function hand back?", de: "Entweder hat nichts gewartet, oder es wurde an etwas gekettet, das kein Promise ist. Was genau hat die Funktion zurückgegeben?" }
    hints: [ { en: "setTimeout itself returns a timer handle, not a promise.", de: "setTimeout selbst liefert eine Timer-Kennung, kein Promise." }, { en: "Wrap it: return new Promise((resolve) => setTimeout(() => resolve(ms), ms));", de: "Umschließe es: return new Promise((resolve) => setTimeout(() => resolve(ms), ms));" }, { en: ".then only exists on a promise, so chaining on anything else fails with 'is not a function'.", de: ".then gibt es nur auf einem Promise, das Ketten an etwas anderes scheitert also mit 'is not a function'." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
---
## Learning goal

Read a promise as a value that has not arrived yet, produce one, and chain work onto it without pretending the result is available immediately.

## Why the result is not simply returned

JavaScript runs your code on one thread. A function that waited for a timer, a file or a network reply by blocking would stop everything else. So functions that take time return **now**, with an object representing the eventual result.

MDN's [Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) - reproduced under this course's `sources/` - describes that object as having three states:

- **pending** - the work is not finished
- **fulfilled** - it finished with a value
- **rejected** - it failed with a reason

A promise starts pending and settles exactly once, into one of the other two. It never goes back.

## Making one

```js
export function wait(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(ms), ms));
}
```

The function passed to `new Promise` runs immediately and receives `resolve` (and `reject`, used in [m6-03](step:m6-03-async-errors)). Calling `resolve(value)` settles the promise. Note that this is a closure from [M4](step:m4-03-closures): `resolve` is still reachable from inside the timer callback long after `wait` itself has returned.

You rarely need `new Promise`. It is for wrapping an older callback-style API - like `setTimeout` - which is exactly what this exercise does.

## Reading the value

The value only exists inside a callback:

```js
wait(5).then((value) => console.log(value));   // 5, later
console.log(wait(5));                          // Promise { <pending> }
```

`Promise { <pending> }` printed where you expected a value is the signature of a missing `.then` or a missing `await`, and you will meet it again in [m6-02](step:m6-02-async-await).

`.then` returns a new promise, so calls chain. The rule that makes chaining work: **if a `then` callback returns a promise, the chain waits for it** before continuing. That is how `loadTwice` can wait twice.

## The exercise

Open [`src/m6/delay.js`](file:src/m6/delay.js). Both functions throw.

- `wait(ms)` returns a promise that settles with `ms` after `ms` milliseconds.
- `loadTwice(ms)` returns a promise for `[ms, ms]`, built by chaining `.then` on `wait(ms)` twice. Use no `async`/`await` here - that is [the next step](step:m6-02-async-await), and doing it with `.then` first is what makes the next step feel like a simplification rather than magic.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m6-01-promises.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m6-01-promises.test.js
```

Three green, including the test that checks `wait(20)` really took at least 15 milliseconds.
