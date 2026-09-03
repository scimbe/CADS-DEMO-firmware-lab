---
id: m7-01-capstone-design
title: Designing the report tool
bloom: evaluate
objectives: [js.tooling.node-test, javascript-web-javascript-guide-indexed-collections]
requires: [m6-04-concurrency]
estimatedMinutes: 25
scaffold: faded
recallFrom: [m5-04-transformations, m2-04-error-objects, m1-03-coercion-nan]
links:
  - { step: m6-04-concurrency }
  - { step: m7-02-capstone-build }
  - { file: "src/m7/report-tool.js" }
  - { file: "examples/m7-pipeline.js" }
sources: [src/m7/report-tool.js, examples/m7-pipeline.js, test/m7-02-capstone-build.test.js]
tasks:
  - id: guess-pipeline
    title: Predict what the naive pipeline produces
    check: { type: predict, prompt: { en: "Read examples/m7-pipeline.js. Write down all four values it prints before you run it.", de: "Lies examples/m7-pipeline.js. Schreib alle vier ausgegebenen Werte auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m7-pipeline.js", expectExitCode: 0, expectStdout: "guarded" }, rubric: "Sets the four predicted values against the printed ones and names the earliest point at which the pipeline went wrong. Does not pass: reporting the four values without identifying where the damage began.", bloom: evaluate }
  - id: design-decisions
    title: Decide how bad input is handled
    check: { type: question, prompt: { en: "Three ways to treat a bad line. Which do the tests demand, and what do the other two cost?", de: "Drei Umgänge mit einer fehlerhaften Zeile. Welchen verlangen die Tests, und was kosten die anderen?" }, rubric: "Derives from the assertions which of the three the suite requires, and keeps an unreadable record apart from one meant to be passed over. Prices the two rejected options against what the operator would and would not learn. Does not pass: naming the requirement with no price attached to the alternatives, or treating a passed-over record as a fault.", bloom: evaluate, minChars: 80 }
socratic:
  - trigger: "task:guess-pipeline:failed"
    question: { en: "Which of the four values did you expect, and which one first went wrong?", de: "Welche der vier Werte hast du erwartet, und welcher ging zuerst schief?" }
    hints: [ { en: "Three lines go in and one of them cannot become a number; follow that one through each stage.", de: "Drei Zeilen gehen hinein und eine kann keine Zahl werden; verfolge diese durch jede Stufe." }, { en: "Ask what the fold does once one of its inputs is not a number, and what it does on every pass after.", de: "Frag, was die Faltung tut, sobald eine Eingabe keine Zahl ist, und was sie in jedem weiteren Durchlauf tut." }, { en: "The formatting step accepts that result without complaint, which is why the damage reaches the output.", de: "Der Formatierungsschritt akzeptiert dieses Ergebnis anstandslos, deshalb erreicht der Schaden die Ausgabe." } ]
  - trigger: "task:design-decisions:failed"
    question: { en: "Does your answer say what each of the other two policies costs, or only which one the tests want?", de: "Sagt deine Antwort, was die anderen zwei Umgänge kosten, oder nur, welchen die Tests wollen?" }
    hints: [ { en: "Read the assertions about malformed records and about comment lines; they are not the same case.", de: "Lies die Assertions über fehlerhafte Datensätze und über Kommentarzeilen; das sind nicht dieselben Fälle." }, { en: "For each policy, ask what the person running the tool learns and what they can do about it.", de: "Frag für jeden Umgang, was die ausführende Person erfährt und was sie dagegen tun kann." }, { en: "One of the three always produces a number, and that is exactly what makes it dangerous.", de: "Einer der drei liefert immer eine Zahl, und genau das macht ihn gefährlich." } ]
misconceptions:
  - pattern: "NaN"
    question: { en: "One bad row turned the whole total into NaN. At which step could it have been stopped?", de: "Eine schlechte Zeile hat die ganze Summe zu NaN gemacht. An welcher Stelle hätte man sie aufhalten können?" }
    hints: [ { en: "NaN spreads: every arithmetic operation involving it produces NaN again.", de: "NaN breitet sich aus: jede Rechenoperation damit erzeugt wieder NaN." }, { en: "NaN.toFixed(2) is the string 'NaN' - the formatter does not complain either.", de: "NaN.toFixed(2) ist die Zeichenkette 'NaN' - auch der Formatierer beschwert sich nicht." }, { en: "Validate at the boundary, where the text becomes a number, not after the arithmetic.", de: "Prüfe an der Grenze, wo aus Text eine Zahl wird, nicht nach der Rechnung." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Read a specification, see where it can go wrong, and decide how the tool should behave at each of those points - before writing the implementation.

## What you are about to build

A small command-line-shaped tool that turns a plain-text report into a summary. The input is one record per line:

```
# drinks
coffee;3.50
tea;2
coffee;1.50
```

and the output is:

```
coffee: 5.00
tea: 2.00
TOTAL: 7.00
```

The exact contract lives in two places: the comment block at the top of [`src/m7/report-tool.js`](file:src/m7/report-tool.js) and, more precisely, [`test/m7-02-capstone-build.test.js`](file:test/m7-02-capstone-build.test.js). Read both now. The tests are the specification; the comment is the summary.

## Where this can go wrong

Every module of this course has a fingerprint on this problem. Find them before you write code:

- **Parsing.** `Number("abc")` is `NaN` and does not throw ([m1-03](step:m1-03-coercion-nan)). `Number("")` is `0`, so an empty amount would silently become a valid zero.
- **NaN spreads.** One bad row poisons the whole `reduce`, and `NaN.toFixed(2)` is the string `"NaN"` rather than an error. Run the prediction task before you go further.
- **Sorting.** Amounts are numbers, so the comparator is mandatory ([m5-04](step:m5-04-transformations)), and `sort` mutates unless you copy first.
- **Ties.** Two labels with the same total need a documented order, or the output is unstable.
- **Ownership.** `summarize` receives an array from its caller and must not reorder it ([m5-03](step:m5-03-arrays)).
- **Errors.** A malformed line has to be distinguishable from a comment ([m2-04](step:m2-04-error-objects)).
- **Async.** `loadReport` awaits a reader that may reject, and the rejection must not escape as an unhandled one ([m6-03](step:m6-03-async-errors)).

## The decision this step asks for

There are three defensible ways to treat a malformed line, and this step asks you to weigh them:

1. **Skip it silently.**
2. **Collect the errors and report them at the end.**
3. **Stop at the first bad line and name it.**

Which one the tests require is not written here. It is in
[`test/m7-02-capstone-build.test.js`](file:test/m7-02-capstone-build.test.js) - read the assertions about malformed records, and separately those about comments and blank lines, and work out what each policy would do to them. Then say what the two you did not pick would cost the person running the tool.

## The exercise

Predict [`examples/m7-pipeline.js`](file:examples/m7-pipeline.js) and run it. Then write your answer to the design question. Do not start implementing yet - [the next step](step:m7-02-capstone-build) is the build, and it goes faster once these decisions are made.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node examples/m7-pipeline.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

Your prediction is recorded, and your design answer names which of the three failure policies the tests require and what the other two would cost.
