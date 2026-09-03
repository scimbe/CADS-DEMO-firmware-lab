---
id: m2-03-try-catch-finally
title: try, catch, finally and who gets the error
bloom: apply
objectives: [javascript-web-javascript-guide-control-flow-and-error-handling]
requires: [m2-02-truthy-falsy]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-02-truthy-falsy, m1-01-let-const]
links:
  - { step: m2-02-truthy-falsy }
  - { step: m2-04-error-objects }
  - { file: "src/m2/safe-parse.js", line: 8 }
  - { file: "examples/m2-finally-order.js" }
sources: [src/m2/safe-parse.js, test/m2-03-try-catch-finally.test.js, examples/m2-finally-order.js]
tasks:
  - id: guess-finally
    title: Predict what the finally example returns
    check: { type: predict, prompt: { en: "examples/m2-finally-order.js has a try that throws, a catch that returns true, and a finally that returns false. Write down every number printed and the final value, in order.", de: "examples/m2-finally-order.js hat ein try, das wirft, ein catch, das true zurückgibt, und ein finally, das false zurückgibt. Schreib jede ausgegebene Zahl und den Endwert der Reihe nach auf." }, then: { type: command, command: "node examples/m2-finally-order.js", expectExitCode: 0, expectStdout: "false" }, rubric: "Recognises that finally runs after catch has already decided to return, and that a return inside finally replaces the value catch was about to return, so the printed order is 0, 1, 3 and the result is false, not true.", bloom: evaluate }
  - id: safe-parse
    title: Both error-handling tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m2-03 safeParse returns the parsed value or the fallback", "m2-03 withCleanup always runs the cleanup, even when work throws"], minPass: 2 }
  - id: catch-or-travel
    title: Catch it, or let it travel
    check: { type: question, prompt: { en: "safeParse catches the error and withCleanup does not. Give the rule you would use to decide between them, and say what a caller loses when a function catches an error it cannot actually handle.", de: "safeParse fängt den Fehler, withCleanup nicht. Nenne die Regel, nach der du zwischen beiden entscheiden würdest, und sag, was ein Aufrufer verliert, wenn eine Funktion einen Fehler fängt, den sie gar nicht behandeln kann." }, rubric: "States that a function should catch only when it can produce a meaningful result despite the failure, and should otherwise clean up in finally and let the error travel on; names what a swallowed error costs - the caller cannot react, the stack and the original cause are gone, and the program carries on with wrong data instead of stopping.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:safe-parse:failed", question: { en: "Is the failure in the function that must swallow an error, or in the one that must let it through?", de: "Liegt der Fehlschlag in der Funktion, die einen Fehler schlucken muss, oder in der, die ihn durchlassen muss?" }, hints: [ { en: "safeParse needs a try around JSON.parse and a catch that returns the fallback.", de: "safeParse braucht ein try um JSON.parse und ein catch, das den Ersatzwert zurückgibt." }, { en: "withCleanup must push 'cleanup' even when work() throws - that is what finally is for.", de: "withCleanup muss 'cleanup' auch dann anhängen, wenn work() wirft - genau dafür gibt es finally." }, { en: "Do not catch in withCleanup: try { … } finally { … } with no catch runs the cleanup and still lets the error out.", de: "Fang in withCleanup nichts ab: try { … } finally { … } ohne catch führt die Aufräumarbeit aus und lässt den Fehler trotzdem hinaus." } ] }
misconceptions:
  - pattern: "Unexpected token|Unexpected end of JSON input|is not valid JSON"
    question: { en: "JSON.parse threw and the error left your function. Was the call inside a try block?", de: "JSON.parse hat geworfen und der Fehler hat deine Funktion verlassen. Stand der Aufruf in einem try-Block?" }
    hints: [ { en: "JSON.parse throws a SyntaxError for anything that is not valid JSON, including an empty string.", de: "JSON.parse wirft einen SyntaxError für alles, was kein gültiges JSON ist, auch für eine leere Zeichenkette." }, { en: "Only statements inside the try block are protected; a call before it is not.", de: "Geschützt sind nur Anweisungen innerhalb des try-Blocks; ein Aufruf davor nicht." }, { en: "return the fallback from the catch block, not after the try.", de: "Gib den Ersatzwert aus dem catch-Block zurück, nicht nach dem try." } ]
  - pattern: "cleanup"
    question: { en: "The cleanup entry is missing or in the wrong place. Which block runs whether or not an error happened?", de: "Der cleanup-Eintrag fehlt oder steht an der falschen Stelle. Welcher Block läuft, egal ob ein Fehler auftrat?" }
    hints: [ { en: "A line after the call is skipped when the call throws.", de: "Eine Zeile nach dem Aufruf wird übersprungen, wenn der Aufruf wirft." }, { en: "finally runs on the way out no matter how the block is left - normally, by return, or by an error.", de: "finally läuft beim Verlassen des Blocks in jedem Fall - normal, per return oder durch einen Fehler." }, { en: "Never put a return inside finally: it replaces whatever the function was about to return.", de: "Setz nie ein return in ein finally: es ersetzt das, was die Funktion gerade zurückgeben wollte." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Decide deliberately whether an error stops at your function or travels on, and use `finally` for the work that has to happen either way.

## Throwing and catching

`throw` sends a value up the call stack until something catches it. `try`/`catch` is what catches it:

```js
try {
  return JSON.parse(text);
} catch (error) {
  return fallback;
}
```

Two things are worth being precise about. First, only the statements **inside** the `try` block are protected - a call above it is not. Second, `catch` receives whatever was thrown. In practice that is always an `Error` object, and [the next step](step:m2-04-error-objects) is about why.

## finally runs on every way out

`finally` runs when the block is left, no matter how: normally, through a `return`, or because an error is travelling on. That makes it the place for cleanup - closing a file, releasing a lock, recording that an attempt finished.

The subtlety is what happens when `finally` itself returns. Predict [`examples/m2-finally-order.js`](file:examples/m2-finally-order.js) first, then run it:

```bash
node examples/m2-finally-order.js
```

The `catch` block decides to return `true`; the `finally` block then returns `false`, and `false` is what the caller sees. A `return` inside `finally` overrides the value the function was already about to hand back - and would equally swallow an error that was travelling out. MDN documents the behaviour, and the practical advice follows from it: **put cleanup in `finally`, never a `return`**.

## The pattern this step is really teaching

There are two honest shapes, and they answer different questions:

```js
try { … } catch (e) { /* handle it here, the caller learns nothing */ }
try { … } finally { /* clean up, the error keeps travelling */ }
```

Catch an error only when your function can actually do something about it. Otherwise let it out and clean up on the way.

## The exercise

Open [`src/m2/safe-parse.js`](file:src/m2/safe-parse.js):

- `safeParse(text, fallback)` must return the parsed value, or the fallback when `JSON.parse` throws. This is the first shape.
- `withCleanup(work, log)` must push `"cleanup"` to the log whether or not `work()` throws, and an error from `work()` must still reach the caller. This is the second shape - and the test asserts both halves, so catching the error would fail it.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m2-03-try-catch-finally.test.js
node examples/m2-finally-order.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m2-03-try-catch-finally.test.js
```

Both green, and your prediction recorded. Next you build an error worth catching: [error objects and your own error class](step:m2-04-error-objects).
