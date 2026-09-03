---
id: m5-04-transformations
title: map, filter, reduce and a sort that lies
bloom: analyze
objectives: [javascript-web-javascript-guide-indexed-collections]
requires: [m5-03-arrays]
estimatedMinutes: 20
scaffold: independent
recallFrom: [m5-03-arrays, m4-02-parameters]
links:
  - { step: m5-03-arrays }
  - { step: m6-01-promises }
  - { file: "src/m5/report.js", line: 9 }
  - { file: "examples/m5-sort-default.js" }
sources: [src/m5/report.js, test/m5-04-transformations.test.js, examples/m5-sort-default.js]
tasks:
  - id: guess-sort
    title: Predict the four sort and sparse results
    check: { type: predict, prompt: { en: "examples/m5-sort-default.js sorts [10, 9, 100, 1] with and without a comparator, checks whether sort returned the same array it was given, and then prints a sparse array's length, its hole and what map does with it. Write all five lines down first.", de: "examples/m5-sort-default.js sortiert [10, 9, 100, 1] mit und ohne Vergleichsfunktion, prüft, ob sort dasselbe Array zurückgegeben hat, und gibt dann Länge, Loch und map-Ergebnis eines dünnbesetzten Arrays aus. Schreib alle fünf Zeilen zuerst auf." }, then: { type: command, command: "node examples/m5-sort-default.js", expectExitCode: 0, expectStdout: "empty item" }, rubric: "Notices that the default sort compares elements as strings, giving [1, 10, 100, 9]; that sort returns the very same array it sorted, so the comparison against the input is true and the caller's order was changed; and that a hole in a sparse array reports undefined, is not 'in' the array, and is preserved rather than mapped.", bloom: evaluate }
  - id: report
    title: All three report tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m5-04 totals aggregates count, sum and max", "m5-04 topLabels orders by amount, largest first", "m5-04 topLabels leaves the caller's array in its original order"], minPass: 3 }
  - id: pipeline-or-loop
    title: A pipeline, or a loop
    check: { type: question, prompt: { en: "totals could also have been one for...of loop. Give one reason to prefer the array-method pipeline, and one reason a plain loop can be the better choice.", de: "totals hätte auch eine einzige for...of-Schleife sein können. Nenne einen Grund für die Kette aus Array-Methoden und einen Grund, aus dem eine einfache Schleife die bessere Wahl sein kann." }, rubric: "For the pipeline: each stage names what it does, there is no index arithmetic and no mutable accumulator, and the stages compose and can be read one at a time. For the loop: one pass instead of several over large data, the ability to stop early, or a computation whose steps are entangled enough that splitting them into named stages obscures rather than clarifies.", bloom: evaluate, minChars: 80 }
socratic:
  - { trigger: "task:report:failed", question: { en: "Is the aggregate wrong, or did the caller's array come back reordered?", de: "Stimmt die Aggregation nicht, oder kam das Array des Aufrufers umsortiert zurück?" }, hints: [ { en: "reduce takes a starting value; give it 0 so an empty array answers 0 rather than throwing.", de: "reduce nimmt einen Startwert; gib ihm 0, damit ein leeres Array 0 liefert statt zu werfen." }, { en: "sort works in place and returns the same array, so sorting the caller's rows reorders them.", de: "sort arbeitet an Ort und Stelle und liefert dasselbe Array zurück, das Sortieren der Zeilen des Aufrufers ordnet sie also um." }, { en: "Copy first: [...rows].sort((a, b) => b.amount - a.amount)", de: "Zuerst kopieren: [...rows].sort((a, b) => b.amount - a.amount)" } ] }
misconceptions:
  - pattern: "Reduce of empty array with no initial value"
    question: { en: "reduce had nothing to start from. Which argument is missing?", de: "reduce hatte keinen Ausgangspunkt. Welches Argument fehlt?" }
    hints: [ { en: "Without an initial value, reduce takes the first element as the accumulator - and an empty array has none.", de: "Ohne Startwert nimmt reduce das erste Element als Akkumulator - und ein leeres Array hat keines." }, { en: "The second argument to reduce is that starting value.", de: "Das zweite Argument von reduce ist genau dieser Startwert." }, { en: "rows.reduce((acc, r) => acc + r.amount, 0)", de: "rows.reduce((acc, r) => acc + r.amount, 0)" } ]
  - pattern: "deep-equal|'b',\\s*'a'"
    question: { en: "The order of the caller's rows changed. Which method did that, and does it return a copy?", de: "Die Reihenfolge der Zeilen des Aufrufers hat sich geändert. Welche Methode war das, und liefert sie eine Kopie?" }
    hints: [ { en: "sort sorts in place and returns the same array, not a new one.", de: "sort sortiert an Ort und Stelle und liefert dasselbe Array zurück, kein neues." }, { en: "This is the ownership rule from m5-03 in a new disguise.", de: "Das ist die Eigentümer-Regel aus m5-03 in neuer Verkleidung." }, { en: "Spread into a new array before sorting.", de: "Spreize vor dem Sortieren in ein neues Array." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
---
## Learning goal

Express an aggregation as a pipeline of array methods, and know the two defaults that make `sort` and `reduce` wrong in exactly the cases you did not test.

## Three methods, one shape

```js
rows.map((row) => row.amount)              // one output per input
rows.filter((row) => row.amount > 0)       // a subset, same order
rows.reduce((acc, row) => acc + row.amount, 0)   // many inputs, one output
```

All three take a callback and return something new; none of them touches the array. That is why they compose so well - and why they are the natural continuation of [m5-03](step:m5-03-arrays).

`reduce` has one argument that is easy to leave off and expensive to leave off: the **initial value**. Without it, `reduce` uses the first element as the starting accumulator, and on an empty array it throws:

```
TypeError: Reduce of empty array with no initial value
```

Always pass it. It also documents the type of the result.

## `sort` compares strings by default

MDN's [Indexed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections) chapter states it, and it still surprises everyone:

```js
[10, 9, 100, 1].sort()                 // [1, 10, 100, 9]
[10, 9, 100, 1].sort((a, b) => a - b)  // [1, 9, 10, 100]
```

With no comparator, elements are converted to strings and compared as text, so `"100"` sorts before `"9"`. Numbers always need a comparator.

`sort` also **sorts in place and returns the same array**. A function that sorts the rows its caller passed has reordered the caller's data - the [m5-03](step:m5-03-arrays) ownership rule again, wearing a different hat. Copy first:

```js
[...rows].sort((a, b) => b.amount - a.amount)
```

Predict [`examples/m5-sort-default.js`](file:examples/m5-sort-default.js) before running it; it shows both facts plus the sparse-array holes from the previous step.

## A comparator with a tie-break

A comparator returns a negative number, zero, or a positive one. Chaining two criteria is idiomatic:

```js
(a, b) => b.amount - a.amount || a.label.localeCompare(b.label)
```

The `||` takes the second comparison only when the first returned `0` - a legitimate use of `||`, since here `0` genuinely means "no decision". You will need exactly this in [the capstone](step:m7-02-capstone-build).

## The exercise

Open [`src/m5/report.js`](file:src/m5/report.js):

- `totals(rows)` throws; build `{ count, sum, max }`. An empty array must give zeros, so remember `reduce`'s initial value.
- `topLabels(rows, n)` returns the labels of the `n` largest amounts. It already has a comparator; what it does not have is a copy.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m5-04-transformations.test.js
node examples/m5-sort-default.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m5-04-transformations.test.js
```

Three green, and your prediction recorded. That closes M5. [M6](step:m6-01-promises) leaves synchronous code behind.
