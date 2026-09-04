---
id: m3-04-break-continue
title: break, continue and a labelled exit
bloom: apply
objectives: [javascript-web-javascript-guide-loops-and-iteration]
requires: [m3-03-for-of-and-in]
estimatedMinutes: 15
scaffold: independent
recallFrom: [m3-03-for-of-and-in, m2-01-if-switch]
links:
  - { step: m3-03-for-of-and-in }
  - { step: m4-01-declare-and-call }
  - { file: "src/m3/search.js", line: 8 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration", title: "MDN: Loops and iteration" }
sources: [src/m3/search.js, test/m3-04-break-continue.test.js, src/m3/iterate.js]
tasks:
  - id: search
    title: All three search tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m3-04 stripComments drops empty and commented lines", "m3-04 findInGrid reports the first hit row by row", "m3-04 findInGrid leaves both loops at the first hit"], minPass: 3 }
  - id: label-or-return
    title: Label, flag or return
    check: { type: question, prompt: { en: "Name three ways to leave both loops at the first hit, one line each, and pick one.", de: "Nenne drei Wege, beide Schleifen beim ersten Treffer zu verlassen, je eine Zeile, und wähle einen." }, rubric: "Three distinct mechanisms plus a choice with a reason. Accepts any of the three as the pick, provided the reason refers to this function rather than to taste. Does not pass: fewer than three distinct mechanisms, a pick with no reason, or a mechanism that leaves only the inner loop.", bloom: evaluate, minChars: 60 }
socratic:
  - trigger: "task:search:failed"
    question: { en: "Is the failure about which lines survive, or about how far the scan went before it stopped?", de: "Geht es um die überlebenden Zeilen oder darum, wie weit der Durchlauf lief, bevor er anhielt?" }
    hints: [ { en: "Read the three test names; one of them measures work done rather than the answer.", de: "Lies die drei Testnamen; einer misst geleistete Arbeit statt der Antwort." }, { en: "For the first function, decide per line whether the rest of the pass should run at all.", de: "Entscheide bei der ersten Funktion je Zeile, ob der Rest des Durchlaufs überhaupt laufen soll." }, { en: "For the second, an unlabelled exit ends only the loop that contains it, and there are two.", de: "Beim zweiten beendet ein unbenannter Ausgang nur die Schleife, die ihn enthält, und es sind zwei." } ]
  - trigger: "task:label-or-return:failed"
    question: { en: "Do your three entries differ in mechanism, or only in wording?", de: "Unterscheiden sich deine drei Einträge im Mechanismus oder nur in der Formulierung?" }
    hints: [ { en: "Write the inner loop's exit for each of your three and see which ones touch the outer head.", de: "Schreib für jeden deiner drei den Ausgang der inneren Schleife und sieh, welche den äußeren Kopf berühren." }, { en: "One needs a name on a loop, one needs extra state, and one leaves the function altogether.", de: "Einer braucht einen Namen an einer Schleife, einer zusätzlichen Zustand, und einer verlässt die Funktion ganz." }, { en: "The pick is easiest to defend from what else the function does after the loops.", de: "Die Wahl lässt sich am leichtesten damit begründen, was die Funktion nach den Schleifen noch tut." } ]
misconceptions:
  - pattern: "4 !== 2|visits"
    question: { en: "The scan kept going after it found the target. Which loop did your break actually leave?", de: "Der Durchlauf lief nach dem Fund weiter. Welche Schleife hat dein break tatsächlich verlassen?" }
    hints: [ { en: "An unlabelled break leaves only the innermost loop containing it.", de: "Ein unbenanntes break verlässt nur die innerste Schleife, die es enthält." }, { en: "The outer loop then starts its next row and keeps searching.", de: "Die äußere Schleife beginnt danach ihre nächste Zeile und sucht weiter." }, { en: "Two of the three mechanisms leave both loops in one statement; the third needs the outer condition to cooperate.", de: "Zwei der drei Mechanismen verlassen beide Schleifen in einer Anweisung; der dritte braucht die Mithilfe der äußeren Bedingung." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Leave a loop at the right moment: skip one pass with `continue`, stop one loop with `break`, and stop two with a label or a `return`.

## continue and break

```js
for (const line of lines) {
  if (line === "") continue;     // skip the rest of THIS pass
  if (done) break;               // leave THIS loop entirely
  …
}
```

`continue` is a guard clause for loops. A chain of `continue`s at the top of a body reads much better than the same logic wrapped in nested `if`s, for the same reason an early `return` reads better than an `else`.

`break` leaves **the innermost loop that contains it**, and only that one. In a single loop this is obvious. In nested loops it is the bug in this step.

## Labels

MDN's [Loops and iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration) chapter documents labelled statements: a name in front of a loop, which `break` and `continue` may then target.

```js
outer: for (let row = 0; row < grid.length; row++) {
  for (let col = 0; col < grid[row].length; col++) {
    if (grid[row][col] === target) {
      found = { row, col };
      break outer;          // leaves BOTH loops
    }
  }
}
```

This is the one place labels earn their keep. The alternatives are a flag that the outer condition also has to test - correct, but the condition now says two things at once - or a `return` straight out of the function, which is the cleanest option when the loops are the whole function. Recognise all three; the question task asks you to choose between them.

## Why the third test exists

`findInGrid` could pass the first two tests while still scanning the entire grid: the answer would be right and the work wasted. The third test counts element accesses through a `Proxy` and requires exactly two, so "it happens to return the right thing" is not enough. Tests that check *how much* work was done, not just the result, are worth knowing about - you will write one like it in [the capstone](step:m7-02-capstone-build).

## The exercise

Open [`src/m3/search.js`](file:src/m3/search.js). Both functions throw; write them.

- `stripComments(lines)` keeps the lines that are neither empty nor start with `"#"`. Use `continue`.
- `findInGrid(grid, target)` returns `{ row, col }` for the first occurrence scanning row by row, or `null`. Both loops must stop at the hit.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `>Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m3-04-break-continue.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m3-04-break-continue.test.js
```

Three green, including the access count. That closes M3; [M4](step:m4-01-declare-and-call) turns to functions themselves.
