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
socratic:
  - { trigger: "task:grade:failed", question: { en: "Which one is failing - the score exactly on a boundary, or the day that comes back as the wrong kind?", de: "Welcher schlägt fehl - die Punktzahl genau auf einer Grenze, oder der Tag, der als falsche Art zurückkommt?" }, hints: [ { en: "A score of exactly 80 must be a B. Which comparison excludes it?", de: "Genau 80 Punkte müssen ein B sein. Welcher Vergleich schließt das aus?" }, { en: "'sat' comes back as weekday: the weekend case assigns and then keeps running.", de: "'sat' kommt als weekday zurück: der Wochenend-Fall weist zu und läuft dann weiter." }, { en: "A case ends at break; without it, execution continues into the next case body.", de: "Ein case endet bei break; ohne break läuft die Ausführung in den nächsten case-Rumpf hinein." } ] }
misconceptions:
  - pattern: "weekday' !== 'weekend"
    question: { en: "The weekend branch ran and then something overwrote its answer. What ends a case in JavaScript?", de: "Der Wochenend-Zweig lief, und dann hat etwas seine Antwort überschrieben. Was beendet einen case in JavaScript?" }
    hints: [ { en: "Cases do not end on their own; execution falls into the next case body.", de: "Ein case endet nicht von selbst; die Ausführung fällt in den nächsten case-Rumpf." }, { en: "Stacked case labels with no body between them are the deliberate use of that behaviour.", de: "Gestapelte case-Marken ohne Rumpf dazwischen sind die beabsichtigte Nutzung dieses Verhaltens." }, { en: "Add break after the weekend assignment.", de: "Ergänze break nach der Wochenend-Zuweisung." } ]
  - pattern: "'B' !== 'A'|'A' !== 'B'|'C' !== 'B'"
    question: { en: "A value sitting exactly on a boundary went to the wrong branch. Is the comparison > or >=?", de: "Ein Wert genau auf einer Grenze ist im falschen Zweig gelandet. Ist der Vergleich > oder >=?" }
    hints: [ { en: "Write the ranges out: 90..100 A, 80..89 B, 70..79 C. Which endpoint is excluded by >?", de: "Schreib die Bereiche auf: 90..100 A, 80..89 B, 70..79 C. Welchen Endpunkt schließt > aus?" }, { en: "Boundary values are exactly where off-by-one bugs live; the tests check them on purpose.", de: "Grenzwerte sind genau der Ort, an dem Off-by-one-Fehler wohnen; die Tests prüfen sie mit Absicht." }, { en: "score > 80 has to become score >= 80.", de: "score > 80 muss score >= 80 werden." } ]
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

## How you know it worked

```bash
node --test test/m2-01-if-switch.test.js
```

Both green, and your prediction of the example is recorded. Next: [what counts as true](step:m2-02-truthy-falsy), where the condition itself becomes the problem.
