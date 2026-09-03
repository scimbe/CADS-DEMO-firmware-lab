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
    check: { type: predict, prompt: { en: "examples/m2-switch-fallthrough.js calls price() three times with 'Apples', 'Cherries' and 'Mangoes'. Write down every line you expect, in order, and count them.", de: "examples/m2-switch-fallthrough.js ruft price() dreimal auf, mit 'Apples', 'Cherries' und 'Mangoes'. Schreib jede erwartete Zeile in der richtigen Reihenfolge auf und zähle sie." }, then: { type: command, command: "node examples/m2-switch-fallthrough.js", expectExitCode: 0, expectStdout: "Bananas" }, rubric: "Notices that 'Apples' prints two lines because the Apples case has no break and execution falls through into Bananas, giving four lines in total rather than three.", bloom: evaluate }
  - id: grade
    title: Both grading tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m2-01 letterGrade handles the boundaries", "m2-01 dayKind does not fall through from weekend to weekday"], minPass: 2 }
  - id: fallthrough-intent
    title: When fall-through is intended
    check: { type: question, prompt: { en: "Fall-through is a bug in dayKind and a feature two lines above it. Explain the difference a reader can see, and say what you would write in a case body that is meant to fall through on purpose.", de: "Durchfallen ist in dayKind ein Fehler und zwei Zeilen darüber ein Merkmal. Erkläre den Unterschied, den ein Leser erkennen kann, und sag, was du in einen case-Rumpf schreiben würdest, der absichtlich durchfallen soll." }, rubric: "Distinguishes stacked case labels with no statements between them - the deliberate way to let several values share one answer - from a case body that runs statements and then continues into the next body, which is almost always a mistake; and states that an intentional fall-through with a body needs an explicit comment, because nothing in the syntax marks it.", bloom: understand, minChars: 60 }
socratic:
  - { trigger: "task:grade:failed", question: { en: "Which one is failing - the score exactly on a boundary, or the day that comes back as the wrong kind?", de: "Welcher schlägt fehl - die Punktzahl genau auf einer Grenze, oder der Tag, der als falsche Art zurückkommt?" }, hints: [ { en: "A score of exactly 80 must be a B. Which comparison excludes it?", de: "Genau 80 Punkte müssen ein B sein. Welcher Vergleich schließt das aus?" }, { en: "'sat' comes back as weekday: the weekend case assigns and then keeps running.", de: "'sat' kommt als weekday zurück: der Wochenend-Fall weist zu und läuft dann weiter." }, { en: "A case ends at break; without it, execution continues into the next case body.", de: "Ein case endet bei break; ohne break läuft die Ausführung in den nächsten case-Rumpf hinein." } ] }
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
