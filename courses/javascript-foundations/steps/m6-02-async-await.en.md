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
    check: { type: predict, prompt: { en: "Read examples/m6-await-order.js. Write down the exact order of its nine printed lines.", de: "Lies examples/m6-await-order.js. Schreib die genaue Reihenfolge seiner neun Ausgabezeilen auf." }, then: { type: command, command: "node examples/m6-await-order.js", expectExitCode: 0, expectStdout: "timeout" }, rubric: "Sets the predicted order against the printed one and names at least two lines that moved, with the rule each move follows. Does not pass: reproducing the output as a list without saying which expectation it corrected.", bloom: evaluate }
  - id: store
    title: All three store tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m6-02 nameOf resolves with a string, not a Promise", "m6-02 nameOf falls back for unknown ids", "m6-02 namesOf resolves with plain strings in order"], minPass: 3 }
  - id: spot-missing-await
    title: How you spot a missing await
    check: { type: question, prompt: { en: "A missing await raises no error. Name two symptoms and where you would look first.", de: "Ein fehlendes await wirft nicht. Nenne zwei Symptome und wo du zuerst nachsiehst." }, rubric: "Two distinct symptoms, such as the container printed where a value belonged, a property read off it coming back undefined, a truthiness test that always takes one branch, or work finishing out of order. Plus a first place to look that is the call, not the assertion. Does not pass: two wordings of the same symptom, or a first place to look that is the failing test line.", bloom: analyze, minChars: 50 }
socratic:
  - trigger: "task:guess-order:failed"
    question: { en: "Which line did you place too early, and which too late?", de: "Welche Zeile hast du zu früh eingeordnet, welche zu spät?" }
    hints: [ { en: "Mark the one keyword in the example that can interrupt a function part-way.", de: "Markiere im Beispiel das eine Schlüsselwort, das eine Funktion mitten drin unterbrechen kann." }, { en: "Everything before it in that function runs at once; everything after it is queued for later.", de: "Alles davor in dieser Funktion läuft sofort; alles danach wird für später eingereiht." }, { en: "Two queues exist, and the one fed by the timer facility is served after the other.", de: "Es gibt zwei Warteschlangen, und die von der Timer-Funktion gespeiste wird nach der anderen bedient." } ]
  - trigger: "task:store:failed"
    question: { en: "Look at the value in the diff. Is it one container, or a collection of them?", de: "Sieh dir den Wert im Diff an. Ist es ein Behälter oder eine Sammlung davon?" }
    hints: [ { en: "The given function is correct, so the fault is in what the two callers do with what it returns.", de: "Die vorgegebene Funktion ist korrekt, der Fehler liegt also darin, was die zwei Aufrufer damit tun." }, { en: "A container is an object, and every object passes a truthiness test, which is why the fallback never fires.", de: "Ein Behälter ist ein Objekt, und jedes Objekt besteht eine Truthiness-Prüfung, deshalb greift der Ersatzwert nie." }, { en: "Mapping with an asynchronous callback gives you a collection of containers, and one call turns that into one container.", de: "Ein map mit asynchronem Callback liefert eine Sammlung von Behältern, und ein Aufruf macht daraus einen Behälter." } ]
  - trigger: "task:spot-missing-await:failed"
    question: { en: "Are your two symptoms genuinely different, or the same one twice?", de: "Sind deine zwei Symptome wirklich verschieden oder dasselbe zweimal?" }
    hints: [ { en: "List what a caller sees for the two cases: reading a property off it, and comparing it.", de: "Liste auf, was ein Aufrufer in zwei Fällen sieht: eine Eigenschaft davon lesen, und es vergleichen." }, { en: "One symptom shows up in a printed value, one in a branch always taken, one in the order of side effects.", de: "Ein Symptom zeigt sich in einem ausgegebenen Wert, eines in einem stets genommenen Zweig, eines in der Reihenfolge von Nebeneffekten." }, { en: "Trace the value backwards from the assertion to the line that produced it, and stop there.", de: "Verfolge den Wert von der Assertion zurück zu der Zeile, die ihn erzeugt hat, und halte dort." } ]
misconceptions:
  - pattern: "Promise \\{"
    question: { en: "A Promise reached an assertion. Which call produced it, and is there an await in front of that call?", de: "Ein Promise ist bei einer Assertion angekommen. Welcher Aufruf hat es erzeugt, und steht ein await davor?" }
    hints: [ { en: "Every async function returns a promise, even when its body looks synchronous.", de: "Jede async-Funktion liefert ein Promise, auch wenn ihr Rumpf synchron aussieht." }, { en: "A missing await produces no error - just a Promise where a value belonged.", de: "Ein fehlendes await erzeugt keinen Fehler - nur ein Promise dort, wo ein Wert hingehörte." }, { en: "await may only be used inside an async function; the enclosing function here already is one.", de: "await darf nur in einer async-Funktion stehen; die umgebende Funktion ist hier bereits eine." } ]
  - pattern: "[-] 'unknown'"
    question: { en: "The fallback never fired, or a name came back undefined. What was actually tested for truthiness?", de: "Der Ersatzwert griff nie, oder ein Name kam als undefined zurück. Was wurde tatsächlich auf Truthiness geprüft?" }
    hints: [ { en: "A pending promise is an object, and every object is truthy - the m2-02 rule again.", de: "Ein ausstehendes Promise ist ein Objekt, und jedes Objekt ist truthy - wieder die Regel aus m2-02." }, { en: "Await first, then test the record: const record = await readRecord(id);", de: "Erst awaiten, dann den Datensatz prüfen: const record = await readRecord(id);" }, { en: "readRecord resolves with null for an unknown id, which is falsy once it is awaited.", de: "readRecord löst bei unbekannter id mit null auf, und das ist nach dem await falsy." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
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

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m6-02-async-await.test.js
node examples/m6-await-order.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m6-02-async-await.test.js
```

Three green, and your prediction recorded. Next: [what happens when an awaited thing fails](step:m6-03-async-errors).
