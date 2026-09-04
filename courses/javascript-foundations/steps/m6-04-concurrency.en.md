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
    check: { type: question, prompt: { en: "Give one situation for each combinator and one that must run in order. One sentence each.", de: "Nenne je eine Situation für jeden Kombinator und eine, die nacheinander laufen muss. Je ein Satz." }, rubric: "Three situations that could not be swapped: one where a partial result is worthless, one where every outcome must be reported, and one where overlapping is impossible or forbidden. Does not pass: a sequential case that is only about preference, or two situations either combinator would serve equally.", bloom: evaluate, minChars: 60 }
socratic:
  - trigger: "task:parallel:failed"
    question: { en: "Did the timing assertion fail, or the one about reporting failures?", de: "Ist die Zeitmessung fehlgeschlagen oder die über das Melden von Fehlschlägen?" }
    hints: [ { en: "Read the three test names; two of them measure elapsed time and one inspects outcomes.", de: "Lies die drei Testnamen; zwei messen verstrichene Zeit, einer untersucht Ergebnisse." }, { en: "Work out for each version at which moment each job is started, not when it is awaited.", de: "Finde für jede Fassung heraus, wann jeder Auftrag gestartet wird, nicht wann auf ihn gewartet wird." }, { en: "For the third function, one combinator never rejects, and the test wants the reason as text.", de: "Für die dritte Funktion lehnt ein Kombinator nie ab, und der Test will den Grund als Text." } ]
  - trigger: "task:choose-combinator:failed"
    question: { en: "Could either combinator serve two of your three situations equally well?", de: "Könnten beide Kombinatoren zwei deiner drei Situationen gleich gut bedienen?" }
    hints: [ { en: "For each situation ask what the caller does with a partial result.", de: "Frag für jede Situation, was der Aufrufer mit einem Teilergebnis tut." }, { en: "One of the two abandons the wait at the first failure but does not stop the work already running.", de: "Einer der zwei bricht das Warten beim ersten Fehlschlag ab, hält aber die laufende Arbeit nicht an." }, { en: "A genuinely sequential case has something outside your program forbidding overlap, or a later job needing an earlier answer.", de: "Ein echt sequenzieller Fall hat etwas außerhalb deines Programms, das Überlappung verbietet, oder ein späterer Auftrag braucht eine frühere Antwort." } ]
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

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `>Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m6-04-concurrency.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m6-04-concurrency.test.js
```

Three green, including the two timing assertions. The question task is the point of the step: this is an `evaluate` step, and the defended choice is the deliverable. That closes M6. The [capstone](step:m7-01-capstone-design) is next.
