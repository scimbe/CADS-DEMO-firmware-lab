---
id: m6-04-concurrency
title: Sequential or concurrent, and what a caller must learn
bloom: evaluate
objectives: [js.async.concurrency]
requires: [m6-03-async-errors]
estimatedMinutes: 20
scaffold: independent
recallFrom: [m6-03-async-errors, m5-04-transformations]
links:
  - { step: m6-03-async-errors }
  - { step: m7-01-capstone-design }
  - { file: "src/m6/parallel.js", line: 15 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises", title: "MDN: Using promises" }
sources: [src/m6/parallel.js, test/m6-04-concurrency.test.js, src/m6/robust.js]
tasks:
  - id: parallel
    title: All three concurrency tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m6-04 inSequence keeps order and adds up the waits", "m6-04 together keeps order but overlaps the waits", "m6-04 settleAll reports every outcome"], minPass: 3 }
  - id: choose-combinator
    title: Choose a combinator and defend it
    check: { type: question, prompt: { en: "Promise.all rejects as soon as one job fails; Promise.allSettled always reports every outcome. Give one concrete situation where all is the correct choice and one where allSettled is, and name a case where neither is right and the jobs must run one after another.", de: "Promise.all lehnt ab, sobald ein Auftrag scheitert; Promise.allSettled meldet immer jedes Ergebnis. Nenne je eine konkrete Situation, in der all richtig ist und in der allSettled richtig ist, und einen Fall, in dem keines von beiden passt und die Aufträge nacheinander laufen müssen." }, rubric: "Chooses all for work that is only meaningful complete, where a first failure should abandon the rest; chooses allSettled for independent work where partial success is useful and every outcome must be reported. Names a genuine sequential case: later jobs depend on earlier results, or an external limit (rate limit, one connection, ordered writes) forbids overlap. Notes that Promise.all does not cancel the other jobs when it rejects - they keep running.", bloom: evaluate, minChars: 120 }
socratic:
  - { trigger: "task:parallel:failed", question: { en: "Did the timing test fail, or the one about reporting failures?", de: "Ist der Zeit-Test fehlgeschlagen oder der über das Melden von Fehlschlägen?" }, hints: [ { en: "Awaiting inside a for loop starts each job only after the previous one finished - that is inSequence.", de: "Ein await innerhalb einer for-Schleife startet jeden Auftrag erst nach dem vorigen - das ist inSequence." }, { en: "To overlap, call every job first and await the array afterwards: Promise.all(jobs.map((job) => job())).", de: "Zum Überlappen zuerst alle Aufträge aufrufen und danach das Array awaiten: Promise.all(jobs.map((job) => job()))." }, { en: "Promise.allSettled gives {status, value} or {status, reason}; the test wants reason to be the message.", de: "Promise.allSettled liefert {status, value} oder {status, reason}; der Test will als reason die Meldung." } ] }
misconceptions:
  - pattern: "so it was sequential|took only"
    question: { en: "The jobs ran one after another although they were supposed to overlap. When were they started?", de: "Die Aufträge liefen nacheinander, obwohl sie überlappen sollten. Wann wurden sie gestartet?" }
    hints: [ { en: "await inside the loop starts job two only after job one has settled.", de: "Ein await in der Schleife startet Auftrag zwei erst, nachdem Auftrag eins besiegelt ist." }, { en: "A promise starts working the moment it is created, not when it is awaited.", de: "Ein Promise beginnt zu arbeiten, sobald es erzeugt wird, nicht wenn es awaited wird." }, { en: "Create them all first, then await them all.", de: "Erzeuge zuerst alle, dann warte auf alle." } ]
  - pattern: "unhandledRejection"
    question: { en: "One of the jobs rejected and nothing was waiting for it. Which combinator did you use?", de: "Einer der Aufträge hat abgelehnt, und niemand hat darauf gewartet. Welchen Kombinator hast du benutzt?" }
    hints: [ { en: "Promise.all rejects on the first failure, but the other jobs keep running and still need an owner.", de: "Promise.all lehnt beim ersten Fehlschlag ab, die übrigen Aufträge laufen aber weiter und brauchen weiterhin einen Besitzer." }, { en: "Promise.allSettled never rejects, so every outcome stays accounted for.", de: "Promise.allSettled lehnt nie ab, jedes Ergebnis bleibt also erfasst." }, { en: "settleAll must report a rejection as { status: 'rejected', reason: message }, not re-throw it.", de: "settleAll muss eine Ablehnung als { status: 'rejected', reason: message } melden und sie nicht erneut werfen." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Decide whether work should overlap, and choose the combinator that tells the caller what they actually need to know about a partial failure.

## A promise starts when it is created

This is the fact that makes concurrency in JavaScript simple once you see it: the work begins the moment the promise exists, not when you `await` it. So the difference between sequential and concurrent is **where the calls happen**, not where the awaits do.

```js
for (const job of jobs) out.push(await job());   // job 2 starts after job 1 settles
await Promise.all(jobs.map((job) => job()));     // every job started, then all awaited
```

Two jobs of 30 ms each take about 60 ms in the first form and about 30 ms in the second. The tests in this step measure elapsed time, so an implementation that only looks concurrent fails.

## all against allSettled

MDN's [Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) describes the combinators. The two that matter here differ in what they do with failure:

| | On success | On one failure |
|---|---|---|
| `Promise.all` | array of values, input order | rejects immediately with that reason |
| `Promise.allSettled` | array of `{status, value}` | array including `{status: "rejected", reason}` |

`Promise.all` is right when the result is only meaningful complete: three parts of one page, three fields of one record. Losing one makes the rest useless, so failing fast is correct.

`Promise.allSettled` is right when the jobs are independent and partial success is worth having: uploading twelve files, checking twenty links. The caller needs to know which ones failed, not just that something did.

One detail that catches people: **`Promise.all` does not cancel anything.** When it rejects, the other jobs keep running to completion. If one of those also rejects, it may become the unhandled rejection from [m6-03](step:m6-03-async-errors).

## Concurrent is not always better

Sequential is the right answer when a later job needs an earlier result, or when something outside your program forbids overlap - a rate limit, a single connection, writes that must land in order. "Run everything at once" is a choice with costs, not a default.

## The exercise

Open [`src/m6/parallel.js`](file:src/m6/parallel.js). `step` is given. All three functions throw.

- `inSequence(jobs)` awaits one job after another, results in order.
- `together(jobs)` starts every job and then awaits them all, results still in order.
- `settleAll(jobs)` reports one entry per job even when some reject, with `reason` being the error **message**.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m6-04-concurrency.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m6-04-concurrency.test.js
```

Three green, including the two timing assertions. The question task is the point of the step: this is an `evaluate` step, and the defended choice is the deliverable. That closes M6. The [capstone](step:m7-01-capstone-design) is next.
