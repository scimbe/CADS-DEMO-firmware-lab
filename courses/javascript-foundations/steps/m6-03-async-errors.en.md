---
id: m6-03-async-errors
title: Errors that arrive late
bloom: analyze
objectives: [js.async.errors]
requires: [m6-02-async-await]
estimatedMinutes: 20
scaffold: faded
recallFrom: [m6-02-async-await, m2-04-error-objects]
links:
  - { step: m6-02-async-await }
  - { step: m6-04-concurrency }
  - { file: "src/m6/robust.js", line: 16 }
  - { step: m2-03-try-catch-finally }
sources: [src/m6/robust.js, test/m6-03-async-errors.test.js, src/m2/safe-parse.js]
tasks:
  - id: robust
    title: All four error-handling tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m6-03 tryLoad reports a resolved value", "m6-03 tryLoad catches a rejection instead of leaking it", "m6-03 mustLoad passes a value through", "m6-03 mustLoad wraps a rejection and keeps the cause"], minPass: 4 }
  - id: why-catch-missed
    title: Why the catch block never fired
    check: { type: question, prompt: { en: "The call sat inside try and the failure still escaped. Why? Two sentences, plus what cause preserves.", de: "Der Aufruf stand im try und der Fehler entkam doch. Warum? Zwei Sätze, plus was cause bewahrt." }, rubric: "Accounts for the block finishing while the failure is still ahead of it, and names the keyword that brings the failure inside. Then says what the original object carries beyond its sentence. Does not pass: claiming the construct is unusable in asynchronous code, or valuing the outer wording over the inner object.", bloom: analyze, minChars: 60 }
socratic:
  - trigger: "task:robust:failed"
    question: { en: "Is a container being reported as the value, or is the failure escaping the block?", de: "Wird ein Behälter als Wert gemeldet, oder entkommt der Fehler dem Block?" }
    hints: [ { en: "Run the four assertions separately; two are about a value and two about a failure arriving.", de: "Lass die vier Assertions getrennt laufen; zwei handeln von einem Wert, zwei von einem ankommenden Fehler." }, { en: "Ask at which line the block finishes, and at which line the failure becomes real.", de: "Frag, in welcher Zeile der Block endet und in welcher der Fehler real wird." }, { en: "For the second function, the standard error constructor takes a second argument that keeps the original reachable.", de: "Beim zweiten nimmt der Standard-Fehlerkonstruktor ein zweites Argument, das das Original erreichbar hält." } ]
  - trigger: "task:why-catch-missed:failed"
    question: { en: "Does your answer say what the block was doing at the moment the failure appeared?", de: "Sagt deine Antwort, was der Block im Moment des Fehlers tat?" }
    hints: [ { en: "Put the two versions side by side and mark the line at which each one leaves the block.", de: "Stell die zwei Fassungen nebeneinander und markiere, in welcher Zeile jede den Block verlässt." }, { en: "One keyword turns a rejected container into something the surrounding block can see.", de: "Ein Schlüsselwort macht aus einem abgelehnten Behälter etwas, das der umgebende Block sehen kann." }, { en: "For the second half, ask what a person debugging needs that a retyped sentence cannot give them.", de: "Frag für die zweite Hälfte, was jemand beim Untersuchen braucht, das ein abgetippter Satz nicht liefert." } ]
misconceptions:
  - pattern: "unhandledRejection"
    question: { en: "A rejected promise reached the top of the program. Which call was not awaited and not caught?", de: "Ein abgelehntes Promise ist an der Programmspitze angekommen. Welcher Aufruf wurde weder awaited noch gefangen?" }
    hints: [ { en: "Node terminates the process on an unhandled rejection; it is not a warning.", de: "Node beendet den Prozess bei einer unbehandelten Ablehnung; das ist keine Warnung." }, { en: "Every promise needs an await, a .catch, or a caller that takes responsibility for it.", de: "Jedes Promise braucht ein await, ein .catch oder einen Aufrufer, der die Verantwortung übernimmt." }, { en: "Awaiting inside a try block satisfies both at once.", de: "Ein await innerhalb eines try-Blocks erledigt beides auf einmal." } ]
  - pattern: "Promise \\{|ok: true"
    question: { en: "The reported value is the promise itself. Where is the await?", de: "Der gemeldete Wert ist das Promise selbst. Wo ist das await?" }
    hints: [ { en: "const value = fn() stores the promise; const value = await fn() stores its value.", de: "const value = fn() speichert das Promise; const value = await fn() speichert dessen Wert." }, { en: "The await also has to be inside the try, not before it.", de: "Das await muss außerdem innerhalb des try stehen, nicht davor." }, { en: "This is the same missing await as m6-02, now with a catch block hiding it.", de: "Das ist dasselbe fehlende await wie in m6-02, nur verdeckt durch einen catch-Block." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Catch a failure that has not happened yet, and pass an error upward without destroying the evidence.

## try/catch only catches a throw

`try`/`catch` from [m2-03](step:m2-03-try-catch-finally) catches a **synchronous** throw. A function that returns a rejected promise does not throw at the call site - it returns normally, with an object that will fail later.

```js
try {
  const value = fn();      // returns a pending promise; nothing throws here
  return { ok: true, value };
} catch (error) {
  …                        // never runs
}
```

The block finishes before the rejection exists. Add `await` and the picture changes: `await` on a rejected promise throws inside the function, at that line, where the surrounding `catch` can see it.

```js
try {
  const value = await fn();   // now a rejection lands in the catch
  …
}
```

The `await` has to be **inside** the `try`. Awaiting before the block is the same bug wearing a hat.

## Unhandled rejections end the process

A promise that rejects with nobody waiting is not a warning in Node. The process terminates:

```
ERR_UNHANDLED_REJECTION
```

The rule that follows: every promise needs an `await`, a `.catch`, or a caller who has taken responsibility for it. Returning a promise from your function is a legitimate way to hand that responsibility on.

## Wrapping without losing the original

When you catch an error and want to add context, do not copy its message into a new one and drop the original. Every `Error` constructor accepts an options object with `cause`:

```js
throw new Error(`load failed: ${error.message}`, { cause: error });
```

`error.cause` keeps the original error - its name, its message, and its stack, which points at the line where the failure actually happened. Node prints the chain. Without `cause`, the trace stops at your wrapper and the real origin is gone.

This is the same argument as [m2-04](step:m2-04-error-objects): errors are for the program and for the person debugging it, and both need more than a sentence.

## The exercise

Open [`src/m6/robust.js`](file:src/m6/robust.js). `failing` is given.

- `tryLoad(fn)` has a `try`/`catch` and no `await`, so it reports a `Promise` as the value and lets rejections escape. Fix both with one keyword in the right place.
- `mustLoad(fn)` throws; write it. Return the resolved value, and on a rejection throw a new `Error` with the message `load failed: <original>` carrying the original under `cause`.

The test uses `assert.rejects`, which asserts that an async call rejects and lets you inspect the error - the async counterpart of `assert.throws`.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `>Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m6-03-async-errors.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m6-03-async-errors.test.js
```

Four green. Next: [running things at the same time on purpose](step:m6-04-concurrency).
