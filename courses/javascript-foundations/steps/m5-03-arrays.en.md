---
id: m5-03-arrays
title: Arrays, length and who owns the data
bloom: apply
objectives: [javascript-web-javascript-guide-indexed-collections]
requires: [m5-02-optional-chaining]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m5-01-objects, m3-02-off-by-one]
links:
  - { step: m5-02-optional-chaining }
  - { step: m5-04-transformations }
  - { file: "src/m5/collection.js", line: 10 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections", title: "MDN: Indexed collections" }
sources: [src/m5/collection.js, test/m5-03-arrays.test.js, src/m3/window.js]
tasks:
  - id: collection
    title: All three collection tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m5-03 addTask appends without touching the input", "m5-03 removeAt drops one element without touching the input", "m5-03 trimTo shortens without touching the input"], minPass: 3 }
  - id: mutate-or-copy
    title: Mutating and non-mutating methods
    check: { type: question, prompt: { en: "Sort the calls you used and replaced into two groups, then say when a mutating design is right.", de: "Ordne die benutzten und ersetzten Aufrufe in zwei Gruppen und sag, wann Verändern richtig ist." }, rubric: "Two groups that are actually disjoint, plus a defensible case for mutation such as a collection the function created itself or one large enough that copying costs. Adds what a caller has to be told. Does not pass: a grouping that puts a non-mutating call in the mutating group, or a case for mutation that is only about typing less.", bloom: evaluate, minChars: 60 }
socratic:
  - trigger: "task:collection:failed"
    question: { en: "Is the returned collection wrong, or is the caller's no longer what it was?", de: "Ist die zurückgegebene Sammlung falsch, oder ist die des Aufrufers nicht mehr dieselbe?" }
    hints: [ { en: "Each test checks two things; read which of the two is failing before changing anything.", de: "Jeder Test prüft zwei Dinge; lies, welches der beiden scheitert, bevor du etwas änderst." }, { en: "For each of the three calls, look up whether it answers with a new collection or edits the one it is on.", de: "Sieh für jeden der drei Aufrufe nach, ob er mit einer neuen Sammlung antwortet oder die vorhandene bearbeitet." }, { en: "One of the three does not even look like a call; assigning to a property can shorten a collection too.", de: "Einer der drei sieht nicht einmal wie ein Aufruf aus; auch eine Zuweisung an eine Eigenschaft kann kürzen." } ]
  - trigger: "task:mutate-or-copy:failed"
    question: { en: "Would every call in your first group really change the collection it is called on?", de: "Würde jeder Aufruf deiner ersten Gruppe die Sammlung wirklich ändern, auf der er läuft?" }
    hints: [ { en: "Test each one in isolation: call it, then print the original.", de: "Prüf jeden einzeln: aufrufen, dann das Original ausgeben." }, { en: "Two of the ones you might expect to be safe are not, and one of them is not a method call at all.", de: "Zwei der vermeintlich sicheren sind es nicht, und einer davon ist gar kein Methodenaufruf." }, { en: "Ask of each candidate whether anyone outside the function still holds the thing being changed.", de: "Frag bei jedem Kandidaten, ob außerhalb der Funktion noch jemand das Geänderte in der Hand hält." } ]
misconceptions:
  - pattern: "deep-equal|'a',\\s*'b'"
    question: { en: "The input array changed. Which of the methods you called writes into the array it is called on?", de: "Das Eingabe-Array hat sich geändert. Welche der aufgerufenen Methoden schreibt in das Array, auf dem sie aufgerufen wird?" }
    hints: [ { en: "push, splice, sort and reverse mutate; slice, concat and map do not.", de: "push, splice, sort und reverse verändern; slice, concat und map nicht." }, { en: "list.length = size truncates the original array as well.", de: "list.length = size kürzt ebenfalls das Original-Array." }, { en: "Each of the three has a non-mutating counterpart that returns a fresh array instead of editing one.", de: "Jede der drei hat ein nicht verändernderes Gegenstück, das ein frisches Array liefert statt eines zu bearbeiten." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Choose array operations by what they do to the caller's data, and read `length` as a property that can be written as well as read.

## length is not a count you observe

MDN's [Indexed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections) chapter makes a point beginners rarely expect: `length` is a writable property, and assigning to it changes the array.

```js
const a = [1, 2, 3];
a.length = 2;    // a is now [1, 2]
a.length = 5;    // a is now [1, 2, <3 empty items>]
```

Assigning a smaller length truncates in place - which is why using it to "return the first n elements" quietly destroys the caller's data. Assigning a larger one creates a **sparse** array: `a[3]` is `undefined`, but the slot does not exist, `3 in a` is `false`, and `map` skips it while keeping the hole. Sparse arrays are a corner of the language worth recognising and avoiding.

## Two families of methods

| Mutate in place | Return a new array |
|---|---|
| `push`, `pop`, `shift`, `unshift` | `slice`, `concat`, spread `[...a]` |
| `splice`, `sort`, `reverse` | `map`, `filter`, `flat` |
| `a.length = n` | `Array.from(a)` |

Neither family is better in the abstract. The rule that matters is about **ownership**: a function given an array by a caller does not own it. Changing it is a side effect the caller did not ask for, and because [an array is a reference](step:m5-01-objects), that change is visible everywhere the array is held.

Mutation is a fine choice for an accumulator you created inside your own function, or for a very large array where copying would be wasteful - but then say so in the name and the documentation.

## The exercise

Open [`src/m5/collection.js`](file:src/m5/collection.js). All three functions do their job and destroy the input while doing it:

- `addTask(list, task)` uses `push`.
- `removeAt(list, index)` uses `splice`, and also has to ignore an index outside the array.
- `trimTo(list, size)` assigns to `length`.

Rewrite all three to return new arrays. Each test asserts the result **and** that the input is untouched.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m5-03-arrays.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m5-03-arrays.test.js
```

Three green. The question task asks you to sort the methods into the two families and to defend when mutation is right. Next: [turning arrays into answers](step:m5-04-transformations).
