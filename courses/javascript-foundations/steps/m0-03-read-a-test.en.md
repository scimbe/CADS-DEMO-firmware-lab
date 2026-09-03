---
id: m0-03-read-a-test
title: Reading a test
bloom: understand
objectives: [js.tooling.node-test]
requires: [m0-02-first-run]
estimatedMinutes: 12
scaffold: worked
links:
  - { step: m0-02-first-run }
  - { step: m0-04-modules }
  - { file: "test/m0-03-read-a-test.test.js" }
  - { file: "src/m0/summary.js", line: 9 }
sources: [test/m0-03-read-a-test.test.js, src/m0/summary.js, README.md]
tasks:
  - id: summarize
    title: Both summarize tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m0-03 summarize returns count, total and average", "m0-03 summarize of an empty array has average 0"], minPass: 2 }
  - id: read-the-diff
    title: Explain the diff the test printed
    check: { type: question, prompt: { en: "In the diff you saw, which side was your code, and what exactly differed? Two sentences.", de: "Welche Seite des Diffs war dein Code, und was genau unterschied sich? Zwei Sätze." }, rubric: "Names the marked side as the code's own output and the other as the test's demand, and identifies the difference as a property name rather than a number, since the value was identical on both sides. Does not pass: an answer that calls the number wrong, or one that names a side without saying which belongs to whom.", bloom: understand, minChars: 50 }
socratic:
  - trigger: "task:summarize:failed"
    question: { en: "Which properties appear on both sides of the diff, and which one appears on only one?", de: "Welche Eigenschaften stehen auf beiden Seiten des Diffs, und welche nur auf einer?" }
    hints: [ { en: "Lines that agree carry no marker at all; only the differences are marked.", de: "Übereinstimmende Zeilen tragen kein Zeichen; nur die Unterschiede sind markiert." }, { en: "Open the file the import line names and compare its returned object with the one the test asks for.", de: "Öffne die in der import-Zeile genannte Datei und vergleich ihr Rückgabeobjekt mit dem des Tests." }, { en: "Two marked lines carrying the same value differ in their key, so the arithmetic is already right.", de: "Zwei markierte Zeilen mit gleichem Wert unterscheiden sich im Schlüssel, die Rechnung stimmt also schon." } ]
  - trigger: "task:read-the-diff:failed"
    question: { en: "Are you sure the values differ, or is it only the spelling of a key?", de: "Bist du sicher, dass die Werte sich unterscheiden, oder nur die Schreibweise eines Schlüssels?" }
    hints: [ { en: "Read the legend line above the block before reading the block.", de: "Lies die Legendenzeile über dem Block, bevor du den Block liest." }, { en: "Put the two marked lines next to each other and compare them token by token.", de: "Stell die beiden markierten Zeilen nebeneinander und vergleich sie Zeichen für Zeichen." }, { en: "One side is produced, the other is demanded; the words in the legend say which is which.", de: "Eine Seite wird geliefert, die andere verlangt; die Legende sagt, welche welche ist." } ]
misconceptions:
  - pattern: "Expected values to be strictly deep-equal"
    question: { en: "deepEqual compares the whole object, keys included. Are you sure the numbers are wrong, or is it the spelling of a key?", de: "deepEqual vergleicht das ganze Objekt samt Schlüsseln. Bist du sicher, dass die Zahlen falsch sind, oder ist es die Schreibweise eines Schlüssels?" }
    hints: [ { en: "Lines that agree are printed without a + or - marker; only the differences carry one.", de: "Übereinstimmende Zeilen stehen ohne + oder -; nur die Unterschiede tragen eines." }, { en: "A + line and a - line with the same value but different names means a renamed property.", de: "Eine +-Zeile und eine --Zeile mit gleichem Wert, aber verschiedenem Namen, bedeuten eine umbenannte Eigenschaft." }, { en: "The contract is written at the top of src/m0/summary.js: count, total, average.", de: "Der Vertrag steht oben in src/m0/summary.js: count, total, average." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Read a test as a specification: find what it demands, find what your code produced, and locate the difference before you touch any code.

## A test is three lines of intent

Open [`test/m0-03-read-a-test.test.js`](file:test/m0-03-read-a-test.test.js). Every test file in this course has the same shape:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../src/m0/summary.js";

test("m0-03 summarize returns count, total and average", () => {
  assert.deepEqual(summarize([3, 4, 5]), { count: 3, total: 12, average: 4 });
});
```

- `node:test` is Node's own test runner. Nothing is installed for it.
- `node:assert/strict` is Node's own assertion library. `strict` means comparisons never convert types - you will meet the reason for that in [M1](step:m1-04-equality).
- The `import` line names the file under test. It is also your map: this test is about `src/m0/summary.js` and nothing else.

`assert.deepEqual` walks two objects and compares every property. That makes it strict about **names** as well as values.

## The failure, read properly

Run it:

```bash
node --test test/m0-03-read-a-test.test.js
```

```
✖ m0-03 summarize returns count, total and average
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected

    {
      average: 4,
      count: 3,
  +   sum: 12
  -   total: 12
    }
```

Read the block from the header down:

1. `+ actual - expected` is the legend. **`+` lines are what your code produced. `-` lines are what the test demanded.**
2. `average: 4` and `count: 3` carry no marker: those agree.
3. `+ sum: 12` against `- total: 12`. The number is identical. The **name** is not.

So this is not an arithmetic bug. `summarize` computes the right total and files it under the wrong name.

## The exercise

Open [`src/m0/summary.js`](file:src/m0/summary.js). The contract is written at the top of the file: the returned object has `count`, `total` and `average`. The code returns `sum` instead. Rename the property in the returned object literal.

The second test then guards a case the first one cannot reach:

```js
assert.deepEqual(summarize([]), { count: 0, total: 0, average: 0 });
```

An empty list has no average - `0 / 0` is `NaN` in JavaScript, a value you will meet properly in [M1](step:m1-03-coercion-nan). The exercise already guards it with `count === 0 ? 0 : sum / count`, so you get the case for free here; notice that the guard exists.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m0-03-read-a-test.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m0-03-read-a-test.test.js
```

Two ticks, `fail 0`. Then answer the question task: naming which side of the diff was yours is the skill this step is really about.
