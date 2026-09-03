---
id: m2-01-if-switch
title: if, else and a switch that falls through
bloom: apply
objectives: [javascript-web-javascript-guide-control-flow-and-error-handling]
requires: [m1-04-equality]
estimatedMinutes: 15
scaffold: worked
recallFrom: [m1-04-equality]
links:
  - { step: m1-04-equality }
  - { step: m2-02-truthy-falsy }
  - { file: "src/m2/grade.js", line: 7 }
  - { file: "examples/m2-switch-fallthrough.js" }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling", title: "MDN: Control flow and error handling" }
sources: [src/m2/grade.js, test/m2-01-if-switch.test.js, examples/m2-switch-fallthrough.js]
tasks:
  - id: guess-fallthrough
    title: Predict what the switch example prints
    check: { type: predict, prompt: { en: "examples/m2-switch-fallthrough.js calls price() three times with 'Apples', 'Cherries' and 'Mangoes'. Write down every line you expect, in order, and count them.", de: "examples/m2-switch-fallthrough.js ruft price() dreimal auf, mit 'Apples', 'Cherries' und 'Mangoes'. Schreib jede erwartete Zeile in der richtigen Reihenfolge auf und zähle sie." }, then: { type: command, command: "node examples/m2-switch-fallthrough.js", expectExitCode: 0, expectStdout: "Bananas" }, rubric: "Sets the predicted line count against the printed one and names the call that produced more lines than expected. Does not pass: a prediction of three lines defended after the fact, or an answer that reports the output without naming which call surprised them.", bloom: evaluate }
  - id: grade
    title: Both grading tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m2-01 letterGrade handles the boundaries", "m2-01 dayKind does not fall through from weekend to weekday"], minPass: 2 }
  - id: fallthrough-intent
    title: When fall-through is intended
    check: { type: question, prompt: { en: "Fall-through is a bug here and a feature two lines up. What does a reader see that tells them apart?", de: "Durchfallen ist hier ein Fehler und zwei Zeilen höher Absicht. Woran erkennt ein Leser den Unterschied?" }, rubric: "Names the visible difference: stacked labels with nothing between them against a body that runs statements and then continues. Adds that a body meant to continue needs a comment, because nothing in the syntax marks it. Does not pass: an answer that only says break is missing, or one that calls all fall-through a mistake.", bloom: understand, minChars: 50 }
socratic:
  - trigger: "task:guess-fallthrough:failed"
    question: { en: "How many lines did you predict, and how many appeared?", de: "Wie viele Zeilen hast du vorhergesagt, und wie viele erschienen?" }
    hints: [ { en: "Three calls are made; count the print statements each one can reach.", de: "Es werden drei Aufrufe gemacht; zähl die Ausgaben, die jeder erreichen kann." }, { en: "Follow the first call with your finger from its matching label downwards, not just to its own body.", de: "Verfolge den ersten Aufruf mit dem Finger von seiner Marke abwärts, nicht nur bis zu seinem Rumpf." }, { en: "One of the three reaches a body that was written for a different value.", de: "Einer der drei erreicht einen Rumpf, der für einen anderen Wert geschrieben wurde." } ]
  - trigger: "task:grade:failed"
    question: { en: "Is the failure a score sitting exactly on a boundary, or a day coming back as the wrong kind?", de: "Ist der Fehlschlag eine Punktzahl genau auf einer Grenze oder ein Tag der falschen Art?" }
    hints: [ { en: "Write the four ranges out with both endpoints and mark which endpoint each comparison includes.", de: "Schreib die vier Bereiche mit beiden Enden auf und markiere, welches Ende jeder Vergleich einschließt." }, { en: "For the day, print the variable after every case body to see where it last changed.", de: "Gib beim Tag die Variable nach jedem case-Rumpf aus, um zu sehen, wo sie sich zuletzt änderte." }, { en: "One branch excludes a single value, and one body keeps running after it has already answered.", de: "Ein Zweig schließt einen einzigen Wert aus, und ein Rumpf läuft weiter, nachdem er schon geantwortet hat." } ]
  - trigger: "task:fallthrough-intent:failed"
    question: { en: "Does your answer describe something a reader can see, or only what the code does?", de: "Beschreibt deine Antwort etwas, das ein Leser sieht, oder nur, was der Code tut?" }
    hints: [ { en: "Put the intended fall-through and the accidental one side by side and look at what sits between the labels.", de: "Stell gewolltes und versehentliches Durchfallen nebeneinander und sieh, was zwischen den Marken steht." }, { en: "One of the two has no statements at all between one label and the next.", de: "Bei einem der beiden stehen zwischen einer Marke und der nächsten überhaupt keine Anweisungen." }, { en: "Since the syntax marks neither, anything deliberate has to be marked by the author.", de: "Da die Syntax keines von beiden markiert, muss Absicht der Autor markieren." } ]
misconceptions:
  - pattern: "[+] 'weekday'"
    question: { en: "The weekend branch ran and then something overwrote its answer. What ends a case in JavaScript?", de: "Der Wochenend-Zweig lief, und dann hat etwas seine Antwort überschrieben. Was beendet einen case in JavaScript?" }
    hints: [ { en: "Cases do not end on their own; execution falls into the next case body.", de: "Ein case endet nicht von selbst; die Ausführung fällt in den nächsten case-Rumpf." }, { en: "Stacked case labels with no body between them are the deliberate use of that behaviour.", de: "Gestapelte case-Marken ohne Rumpf dazwischen sind die beabsichtigte Nutzung dieses Verhaltens." }, { en: "Add break after the weekend assignment.", de: "Ergänze break nach der Wochenend-Zuweisung." } ]
  - pattern: "'B' !== 'A'|'A' !== 'B'|'C' !== 'B'"
    question: { en: "A value sitting exactly on a boundary went to the wrong branch. Is the comparison > or >=?", de: "Ein Wert genau auf einer Grenze ist im falschen Zweig gelandet. Ist der Vergleich > oder >=?" }
    hints: [ { en: "Write the ranges out: 90..100 A, 80..89 B, 70..79 C. Which endpoint is excluded by >?", de: "Schreib die Bereiche auf: 90..100 A, 80..89 B, 70..79 C. Welchen Endpunkt schließt > aus?" }, { en: "Boundary values are exactly where off-by-one bugs live; the tests check them on purpose.", de: "Grenzwerte sind genau der Ort, an dem Off-by-one-Fehler wohnen; die Tests prüfen sie mit Absicht." }, { en: "score > 80 has to become score >= 80.", de: "score > 80 muss score >= 80 werden." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Write branching code whose boundaries are right, and understand why a `switch` keeps running after a matching case unless you stop it.

## if / else if / else

An `if` chain is read top to bottom and stops at the first branch whose condition is true. That makes order part of the logic: a chain that tests `score >= 70` before `score >= 90` can never award an A.

The interesting bugs live at the boundaries. `>` and `>=` differ for exactly one value, and that value is always the one someone eventually passes. When a range is "80 up to and including 89", write it as `score >= 80` and let the branch above catch 90 - do not try to express both ends in one condition.

## switch falls through

MDN's [Control flow](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling) chapter is blunt about this: a `case` does not end on its own. When a case matches, execution jumps there and **keeps going** into the following case bodies until it meets a `break` or the end of the switch.

Predict what this prints before you run it, then run [`examples/m2-switch-fallthrough.js`](file:examples/m2-switch-fallthrough.js):

```bash
node examples/m2-switch-fallthrough.js
```

Asking for apples prints two lines. That is fall-through, and it is not a defect in the language: stacking labels with no body between them is how you say "these cases share an answer".

```js
switch (day) {
  case "sat":
  case "sun":
    kind = "weekend";
    break;          // <- without this, execution continues into "mon"
  case "mon":
  …
}
```

The rule is easy to hold: **stacked labels with nothing between them are intentional; a case body without a `break` is a bug** unless a comment says otherwise.

## The exercise

Open [`src/m2/grade.js`](file:src/m2/grade.js). Two functions, one bug each:

- `letterGrade(score)` must award a B for 80 through 89. One comparison excludes a boundary value; the test passes exactly that value.
- `dayKind(day)` must answer `"weekend"` for `"sat"` and `"sun"`. The weekend case assigns the right answer and then falls straight into the weekday case, which overwrites it.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m2-01-if-switch.test.js
node examples/m2-switch-fallthrough.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m2-01-if-switch.test.js
```

Both green, and your prediction of the example is recorded. Next: [what counts as true](step:m2-02-truthy-falsy), where the condition itself becomes the problem.
