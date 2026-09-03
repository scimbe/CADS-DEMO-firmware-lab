---
id: m3-02-off-by-one
title: Off by one, and the error it hands you
bloom: analyze
objectives: [javascript-web-javascript-guide-loops-and-iteration, javascript-web-javascript-guide-indexed-collections]
requires: [m3-01-for-and-while]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m3-01-for-and-while, m2-01-if-switch]
links:
  - { step: m3-01-for-and-while }
  - { step: m3-03-for-of-and-in }
  - { file: "src/m3/window.js", line: 9 }
  - { step: m5-03-arrays }
sources: [src/m3/window.js, test/m3-02-off-by-one.test.js]
tasks:
  - id: window
    title: Both window tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m3-02 lastThree returns exactly the last three elements", "m3-02 movingAverage returns one value per full window"], minPass: 2 }
  - id: read-the-symptom
    title: From symptom to cause
    check: { type: question, prompt: { en: "Why is reading one element too far easier to find than reading one too few? Two sentences.", de: "Warum ist ein Element zu weit zu lesen leichter zu finden als eines zu wenig? Zwei Sätze." }, rubric: "Explains that reading past the end yields a value that has no properties, so the next operation on it stops the program, while reading too few simply returns a shorter result that nothing announces. Names the consequence: only a test on the boundary catches the second. Does not pass: an answer that says the first throws immediately, or one that does not say why the second stays silent.", bloom: analyze, minChars: 60 }
socratic:
  - trigger: "task:window:failed"
    question: { en: "Write down the first and last index your loop touches for a three-element input. Which lies outside?", de: "Schreib ersten und letzten Index für eine dreielementige Eingabe auf. Welcher liegt außerhalb?" }
    hints: [ { en: "Do it on paper for the shortest input the test uses before changing any comparison.", de: "Mach es auf Papier für die kürzeste Eingabe des Tests, bevor du einen Vergleich änderst." }, { en: "The second function has two loops, so write the pair of indices down for each of them separately.", de: "Die zweite Funktion hat zwei Schleifen, notiere das Indexpaar also für jede getrennt." }, { en: "One of the four boundaries also has to survive an input shorter than the window itself.", de: "Eine der vier Grenzen muss außerdem eine Eingabe überstehen, die kürzer als das Fenster selbst ist." } ]
  - trigger: "task:read-the-symptom:failed"
    question: { en: "Does your answer say why the second mistake produces no message at all?", de: "Sagt deine Antwort, warum der zweite Fehler überhaupt keine Meldung erzeugt?" }
    hints: [ { en: "Ask what an index past the end returns, and whether returning it is itself an error.", de: "Frag, was ein Index hinter dem Ende liefert, und ob das Liefern selbst schon ein Fehler ist." }, { en: "Then ask what the next operation does with that value, and how many steps later that happens.", de: "Frag dann, was die nächste Operation mit diesem Wert tut, und wie viele Schritte später das passiert." }, { en: "A result that is merely short is still a valid result, which is why only one kind of test finds it.", de: "Ein nur zu kurzes Ergebnis ist immer noch ein gültiges Ergebnis, deshalb findet es nur eine Art von Test." } ]
misconceptions:
  - pattern: "Cannot read properties of undefined"
    question: { en: "An index produced undefined, and the next operation on it threw. Which index was it, and what is the largest valid one?", de: "Ein Index hat undefined geliefert, und die nächste Operation darauf hat geworfen. Welcher Index war es, und was ist der größte gültige?" }
    hints: [ { en: "An array of length 3 has indices 0, 1 and 2. Index 3 is not an error - it is undefined.", de: "Ein Array der Länge 3 hat die Indizes 0, 1 und 2. Index 3 ist kein Fehler - er ist undefined." }, { en: "The loop condition decides the last index touched: i < length stops at length - 1, i <= length does not.", de: "Die Schleifenbedingung bestimmt den letzten berührten Index: i < length hört bei length - 1 auf, i <= length nicht." }, { en: "The error surfaces one operation later than the mistake; look at the loop head, not the line that threw.", de: "Der Fehler zeigt sich eine Operation nach der Ursache; sieh dir den Schleifenkopf an, nicht die werfende Zeile." } ]
  - pattern: "NaN"
    question: { en: "A sum became NaN. Which term in it was undefined, and why did adding it not throw?", de: "Eine Summe wurde NaN. Welcher Summand war undefined, und warum hat das Addieren nicht geworfen?" }
    hints: [ { en: "undefined + a number is NaN, silently - the same silent coercion you met in M1.", de: "undefined + eine Zahl ergibt NaN, und zwar stillschweigend - dieselbe stille Umwandlung wie in M1." }, { en: "An inner loop that runs size + 1 times reads one element past its window.", de: "Eine innere Schleife, die size + 1 mal läuft, liest ein Element über ihr Fenster hinaus." }, { en: "A window of size elements is k = 0 up to but not including size.", de: "Ein Fenster aus size Elementen ist k = 0 bis ausschließlich size." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Read an out-of-range symptom back to the loop condition that caused it, and fix boundaries by writing them down rather than by trying operators.

## Indices end one before the length

An array of length 3 has indices 0, 1, 2. There is no index 3. But JavaScript does not stop you from asking:

```js
const a = [10, 20, 30];
a[3]              // undefined - no error
a[3].toString()   // TypeError: Cannot read properties of undefined (reading 'toString')
```

That two-step behaviour is the whole reason off-by-one bugs are confusing. The mistake is in the **loop condition**; the error appears one operation later, on a line that looks innocent. When you see `Cannot read properties of undefined`, look at the loop head, not the line the stack trace names.

Reading one element too far is the lucky case. Reading one too *few* produces a result that is simply short, with no error at all - which is why the tests in this step check the exact boundary rather than a comfortable case in the middle.

## Writing a boundary down

The reliable method is not to guess between `<` and `<=`. It is to write the first and last index on paper for a small input:

- `lastThree([1,2,3,4,5])` should touch indices 2, 3, 4. Start `length - 3`, end `length - 1`. So: `i < list.length`.
- `lastThree([1,2])` should touch 0 and 1. `length - 3` is `-1`, so the start needs clamping to 0.
- `movingAverage([1,2,3,4], 2)` should produce windows starting at 0, 1, 2. The last window starts where `i + size` is still within the array, so: `i + size <= list.length`.
- The inner loop covers `size` elements: `k = 0` up to but not including `size`.

Four lines of arithmetic, done once, beat any amount of operator-swapping.

## The exercise

Open [`src/m3/window.js`](file:src/m3/window.js). Both functions have off-by-one errors, and `movingAverage` has one in each of its two loops.

Run the test first and read the failures. One is a `TypeError`; the other is a `NaN` produced by adding `undefined` to a number - the silent coercion from [M1](step:m1-03-coercion-nan) showing up again inside a loop.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m3-02-off-by-one.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m3-02-off-by-one.test.js
```

Both green, including the short-list and exactly-one-window cases. The question task asks you to trace the symptom back to the cause; that trace is the transferable part. Next: [iterating without indices at all](step:m3-03-for-of-and-in).
