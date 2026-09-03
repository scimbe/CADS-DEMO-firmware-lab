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
    check: { type: question, prompt: { en: "The first failure was a TypeError about reading a property of undefined, not a wrong number. Explain the chain from the loop condition to that message, and say why a loop that reads one element too far is easier to find than one that reads one too few.", de: "Der erste Fehlschlag war ein TypeError über das Lesen einer Eigenschaft von undefined, keine falsche Zahl. Erkläre die Kette von der Schleifenbedingung bis zu dieser Meldung, und sag, warum eine Schleife, die ein Element zu weit liest, leichter zu finden ist als eine, die eines zu wenig liest." }, rubric: "Traces i <= list.length reading index list.length, which is out of range, so the array yields undefined rather than throwing; the TypeError appears only at the next operation on that undefined. Notes the asymmetry: reading too far eventually produces undefined and a loud error, while reading too few simply returns a short result that no error announces - it needs a test on the boundary.", bloom: analyze, minChars: 100 }
socratic:
  - { trigger: "task:window:failed", question: { en: "Write down the first and last index your loop touches for a three-element array. Which of the two is outside the array?", de: "Schreib den ersten und den letzten Index auf, den deine Schleife bei einem dreielementigen Array berührt. Welcher der beiden liegt außerhalb?" }, hints: [ { en: "Indices run from 0 to length - 1, so a condition with <= against length always reaches one too far.", de: "Indizes laufen von 0 bis length - 1, eine Bedingung mit <= gegen length greift also immer eins zu weit." }, { en: "lastThree also has to survive a list shorter than three: a negative start index must be clamped to 0.", de: "lastThree muss auch eine Liste unter drei Elementen überstehen: ein negativer Startindex muss auf 0 begrenzt werden." }, { en: "For movingAverage there are two loops and two bugs: the window must contain size elements, and the last window must end at the last element.", de: "In movingAverage stecken zwei Schleifen und zwei Fehler: das Fenster muss size Elemente enthalten, und das letzte Fenster muss am letzten Element enden." } ] }
misconceptions:
  - pattern: "Cannot read properties of undefined"
    question: { en: "An index produced undefined, and the next operation on it threw. Which index was it, and what is the largest valid one?", de: "Ein Index hat undefined geliefert, und die nächste Operation darauf hat geworfen. Welcher Index war es, und was ist der größte gültige?" }
    hints: [ { en: "An array of length 3 has indices 0, 1 and 2. Index 3 is not an error - it is undefined.", de: "Ein Array der Länge 3 hat die Indizes 0, 1 und 2. Index 3 ist kein Fehler - er ist undefined." }, { en: "The loop condition decides the last index touched: i < length stops at length - 1, i <= length does not.", de: "Die Schleifenbedingung bestimmt den letzten berührten Index: i < length hört bei length - 1 auf, i <= length nicht." }, { en: "The error surfaces one operation later than the mistake; look at the loop head, not the line that threw.", de: "Der Fehler zeigt sich eine Operation nach der Ursache; sieh dir den Schleifenkopf an, nicht die werfende Zeile." } ]
  - pattern: "NaN"
    question: { en: "A sum became NaN. Which term in it was undefined, and why did adding it not throw?", de: "Eine Summe wurde NaN. Welcher Summand war undefined, und warum hat das Addieren nicht geworfen?" }
    hints: [ { en: "undefined + a number is NaN, silently - the same silent coercion you met in M1.", de: "undefined + eine Zahl ergibt NaN, und zwar stillschweigend - dieselbe stille Umwandlung wie in M1." }, { en: "An inner loop that runs size + 1 times reads one element past its window.", de: "Eine innere Schleife, die size + 1 mal läuft, liest ein Element über ihr Fenster hinaus." }, { en: "A window of size elements is k = 0 up to but not including size.", de: "Ein Fenster aus size Elementen ist k = 0 bis ausschließlich size." } ]
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

## How you know it worked

```bash
node --test test/m3-02-off-by-one.test.js
```

Both green, including the short-list and exactly-one-window cases. The question task asks you to trace the symptom back to the cause; that trace is the transferable part. Next: [iterating without indices at all](step:m3-03-for-of-and-in).
