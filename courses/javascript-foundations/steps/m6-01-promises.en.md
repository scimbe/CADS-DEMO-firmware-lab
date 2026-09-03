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
    check: { type: question, prompt: { en: "wait(20) returns at once. What does the caller hold, and why can it not be read straight away?", de: "wait(20) kehrt sofort zurück. Was hält der Aufrufer, und warum ist es nicht direkt lesbar?" }, rubric: "Names the object and the state it is in, lists the states it can settle into, and gives a reason for the indirection that refers to the single thread rather than to convention. Does not pass: an answer that says the value is simply not ready, with no reason, or one that names a state the object cannot return to.", bloom: understand, minChars: 60 }
socratic:
  - trigger: "task:delay:failed"
    question: { en: "Does your function hand back the object the caller can wait on, or the value it computed?", de: "Gibt deine Funktion das Objekt zum Warten zurück, oder den berechneten Wert?" }
    hints: [ { en: "Print what the first function returns without waiting for it, and read what is printed.", de: "Gib zurück, was die erste Funktion liefert, ohne zu warten, und lies die Ausgabe." }, { en: "The timer facility takes a callback and gives back a handle, so it has to be wrapped to be awaited.", de: "Die Timer-Funktion nimmt einen Callback und liefert eine Kennung, sie muss also zum Warten eingepackt werden." }, { en: "For the second function, a callback that itself returns one of these objects makes the chain wait for it.", de: "Bei der zweiten Funktion lässt ein Callback, der selbst so ein Objekt liefert, die Kette darauf warten." } ]
  - trigger: "task:what-is-pending:failed"
    question: { en: "Does your answer say why the value cannot simply be returned, or only that it is not there yet?", de: "Sagt deine Antwort, warum der Wert nicht einfach zurückkommt, oder nur, dass er fehlt?" }
    hints: [ { en: "Ask what the program would have to do while it waited, and what else runs during that time.", de: "Frag, was das Programm währenddessen tun müsste, und was in dieser Zeit sonst läuft." }, { en: "Count how many threads are available to run both the waiting and the work.", de: "Zähl, wie viele Threads für das Warten und die Arbeit zur Verfügung stehen." }, { en: "Three states exist and the transition happens once, which is why a callback is the only way in.", de: "Es gibt drei Zustände und der Übergang passiert einmal, deshalb ist ein Callback der einzige Zugang." } ]
misconceptions:
  - pattern: "Promise \\{"
    question: { en: "A Promise turned up where a value was expected. Was the chain returned, or was its result used directly?", de: "Ein Promise ist dort aufgetaucht, wo ein Wert erwartet wurde. Wurde die Kette zurückgegeben, oder wurde ihr Ergebnis direkt benutzt?" }
    hints: [ { en: "A promise is a container for a value that is not there yet; printing it shows the container.", de: "Ein Promise ist ein Behälter für einen noch nicht vorhandenen Wert; ausgeben zeigt den Behälter." }, { en: "The value is reachable only inside .then(value => …) or after await.", de: "Der Wert ist nur innerhalb von .then(value => …) oder nach await erreichbar." }, { en: "Return the chain from your function so the caller can wait for it too.", de: "Gib die Kette aus deiner Funktion zurück, damit der Aufrufer ebenfalls darauf warten kann." } ]
  - pattern: "settled too early|is not a function"
    question: { en: "Either nothing waited, or something that is not a promise was chained. What exactly did the function hand back?", de: "Entweder hat nichts gewartet, oder es wurde an etwas gekettet, das kein Promise ist. Was genau hat die Funktion zurückgegeben?" }
    hints: [ { en: "setTimeout itself returns a timer handle, not a promise.", de: "setTimeout selbst liefert eine Timer-Kennung, kein Promise." }, { en: "Wrap it: return new Promise((resolve) => setTimeout(() => resolve(ms), ms));", de: "Umschließe es: return new Promise((resolve) => setTimeout(() => resolve(ms), ms));" }, { en: ".then only exists on a promise, so chaining on anything else fails with 'is not a function'.", de: ".then gibt es nur auf einem Promise, das Ketten an etwas anderes scheitert also mit 'is not a function'." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
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
