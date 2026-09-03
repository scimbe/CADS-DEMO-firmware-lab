---
id: m3-01-for-and-while
title: for and while, and which one fits
bloom: apply
objectives: [javascript-web-javascript-guide-loops-and-iteration]
requires: [m2-04-error-objects]
estimatedMinutes: 15
scaffold: worked
recallFrom: [m2-01-if-switch, m1-01-let-const]
links:
  - { step: m2-04-error-objects }
  - { step: m3-02-off-by-one }
  - { file: "src/m3/tally.js", line: 8 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration", title: "MDN: Loops and iteration" }
sources: [src/m3/tally.js, test/m3-01-for-and-while.test.js]
tasks:
  - id: tally
    title: Both loop tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m3-01 countUp builds 1..n and an empty array for 0", "m3-01 sumUntil stops at the first element that reaches stop"], minPass: 2 }
  - id: which-loop
    title: Why each loop got the shape it got
    check: { type: question, prompt: { en: "Why does one function suit a counting head and the other a condition? One sentence each.", de: "Warum passt zu einer Funktion ein Zählkopf und zur anderen eine Bedingung? Je ein Satz." }, rubric: "Ties the first to a trip count that is known before the loop starts, and the second to a stop that only the data can decide. Does not pass: an answer based on which form is shorter or more familiar, or one that says both would work without naming what differs.", bloom: understand, minChars: 40 }
socratic:
  - trigger: "task:tally:failed"
    question: { en: "Which function fails, and does it stop too early, too late, or never?", de: "Welche Funktion scheitert, und hört sie zu früh, zu spät oder nie auf?" }
    hints: [ { en: "Try each function with the smallest input the test uses and say what it should return there.", de: "Probier jede Funktion mit der kleinsten Eingabe des Tests und sag, was sie dort liefern soll." }, { en: "For the second, list the two things that must both hold for another pass to be safe.", de: "Liste für die zweite die zwei Dinge auf, die beide gelten müssen, damit ein weiterer Durchlauf sicher ist." }, { en: "Those two things have to be checked in one order only, because one of them protects the other.", de: "Diese zwei Dinge dürfen nur in einer Reihenfolge geprüft werden, weil eines das andere schützt." } ]
  - trigger: "task:which-loop:failed"
    question: { en: "Does your answer name what is known before the loop starts, or only which form you prefer?", de: "Nennt deine Antwort, was vor dem Schleifenstart bekannt ist, oder nur die bevorzugte Form?" }
    hints: [ { en: "For each function, ask how many passes you could predict before the first one runs.", de: "Frag für jede Funktion, wie viele Durchläufe du vor dem ersten vorhersagen könntest." }, { en: "One answer is a number you can compute from the argument; the other depends on the contents.", de: "Eine Antwort ist eine aus dem Argument berechenbare Zahl; die andere hängt vom Inhalt ab." }, { en: "The third form in the chapter differs from these two only in when it asks, which is the tell.", de: "Die dritte Form des Kapitels unterscheidet sich von diesen zwei nur darin, wann sie fragt, und das ist der Hinweis." } ]
misconceptions:
  - pattern: "Cannot read properties of undefined"
    question: { en: "The loop reached past the last element. Which condition let it get there?", de: "Die Schleife ist über das letzte Element hinausgelaufen. Welche Bedingung hat das zugelassen?" }
    hints: [ { en: "Reading list[i] beyond the end gives undefined; the error appears one step later, when something is done with it.", de: "list[i] hinter dem Ende zu lesen liefert undefined; der Fehler erscheint einen Schritt später, wenn damit etwas gemacht wird." }, { en: "The last valid index is list.length - 1, so the condition is i < list.length.", de: "Der letzte gültige Index ist list.length - 1, die Bedingung lautet also i < list.length." }, { en: "In a compound condition, test the index before you use it: && evaluates left to right and stops early.", de: "Prüfe in einer zusammengesetzten Bedingung den Index, bevor du ihn benutzt: && wertet von links nach rechts aus und bricht früh ab." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Choose the loop that matches the problem: a counting `for` when you know how many passes there are, a `while` when a condition decides as you go.

## The three shapes

MDN's [Loops and iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration) chapter lists them; the difference that matters in practice is **when the condition is checked**.

```js
for (let i = 0; i < n; i++) { … }   // init, condition, update in one head
while (condition) { … }             // condition checked before each pass
do { … } while (condition);         // condition checked after - runs at least once
```

A `for` head keeps the three parts of a counted loop together, so a reader can see the trip count at a glance. A `while` head says "I do not know how many passes; this condition decides". `do...while` is the rare one: it runs the body before asking, so it always runs at least once. Use it only when that is what you mean.

Declare the counter with `let` in the head. Recall from [M1](step:m1-01-let-const) that `const i` would fail on the first update - and that `let` in a `for` head creates a **fresh binding per pass**, which becomes important in [M4](step:m4-03-closures).

## Two conditions, in the right order

`sumUntil` has to keep going while two things hold: there is still an element, and that element is below the stop value. Written as one condition:

```js
while (i < list.length && list[i] < stop) { … }
```

The order is not cosmetic. `&&` evaluates left to right and stops as soon as the answer is decided, so the index check protects the array access. Swap the two and the last pass reads `list[list.length]`, which is `undefined`, and comparing `undefined < stop` is `false` - so this particular swap fails quietly. In [the next step](step:m3-02-off-by-one) the same mistake fails loudly instead.

## The exercise

Open [`src/m3/tally.js`](file:src/m3/tally.js). Both functions throw; write them.

- `countUp(n)` returns `[1, 2, …, n]`, and `[]` for `n = 0`. The number of passes is known before the loop starts - that is a `for`.
- `sumUntil(list, stop)` adds the numbers before the first element that reaches `stop`. Nothing knows in advance how many that is - that is a `while`.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m3-01-for-and-while.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m3-01-for-and-while.test.js
```

Both green. Then answer the question task. Loop *choice* is the point here; [the next step](step:m3-02-off-by-one) is about getting the boundaries of the one you chose right.
