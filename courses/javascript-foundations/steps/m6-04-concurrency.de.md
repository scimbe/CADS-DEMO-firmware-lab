---
id: m6-04-concurrency
title: Nacheinander oder gleichzeitig, und was ein Aufrufer erfahren muss
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
    title: Alle drei Nebenläufigkeits-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m6-04 inSequence keeps order and adds up the waits", "m6-04 together keeps order but overlaps the waits", "m6-04 settleAll reports every outcome"], minPass: 3 }
  - id: choose-combinator
    title: Wähle einen Kombinator und begründe ihn
    check: { type: question, prompt: { en: "Promise.all rejects as soon as one job fails; Promise.allSettled always reports every outcome. Give one concrete situation where all is the correct choice and one where allSettled is, and name a case where neither is right and the jobs must run one after another.", de: "Promise.all lehnt ab, sobald ein Auftrag scheitert; Promise.allSettled meldet immer jedes Ergebnis. Nenne je eine konkrete Situation, in der all richtig ist und in der allSettled richtig ist, und einen Fall, in dem keines von beiden passt und die Aufträge nacheinander laufen müssen." }, rubric: "Chooses all for work that is only meaningful complete, where a first failure should abandon the rest; chooses allSettled for independent work where partial success is useful and every outcome must be reported. Names a genuine sequential case: later jobs depend on earlier results, or an external limit (rate limit, one connection, ordered writes) forbids overlap. Notes that Promise.all does not cancel the other jobs when it rejects - they keep running.", bloom: evaluate, minChars: 120 }
socratic:
  - { trigger: "task:parallel:failed", question: { en: "Did the timing test fail, or the one about reporting failures?", de: "Ist der Zeit-Test fehlgeschlagen oder der über das Melden von Fehlschlägen?" }, hints: [ { en: "Awaiting inside a for loop starts each job only after the previous one finished - that is inSequence.", de: "Ein await innerhalb einer for-Schleife startet jeden Auftrag erst nach dem vorigen - das ist inSequence." }, { en: "To overlap, call every job first and await the array afterwards: Promise.all(jobs.map((job) => job())).", de: "Zum Überlappen zuerst alle Aufträge aufrufen und danach das Array awaiten: Promise.all(jobs.map((job) => job()))." }, { en: "Promise.allSettled gives {status, value} or {status, reason}; the test wants reason to be the message.", de: "Promise.allSettled liefert {status, value} oder {status, reason}; der Test will als reason die Meldung." } ] }
misconceptions:
  - pattern: "so it was sequential|took only"
    question: { en: "The jobs ran one after another although they were supposed to overlap. When were they started?", de: "Die Aufträge liefen nacheinander, obwohl sie überlappen sollten. Wann wurden sie gestartet?" }
    hints: [ { en: "await inside the loop starts job two only after job one has settled.", de: "Ein await in der Schleife startet Auftrag zwei erst, nachdem Auftrag eins besiegelt ist." }, { en: "A promise starts working the moment it is created, not when it is awaited.", de: "Ein Promise beginnt zu arbeiten, sobald es erzeugt wird, nicht wenn es awaited wird." }, { en: "Create them all first, then await them all.", de: "Erzeuge zuerst alle, dann warte auf alle." } ]
  - pattern: "ERR_UNHANDLED_REJECTION|Unhandled"
    question: { en: "One of the jobs rejected and nothing was waiting for it. Which combinator did you use?", de: "Einer der Aufträge hat abgelehnt, und niemand hat darauf gewartet. Welchen Kombinator hast du benutzt?" }
    hints: [ { en: "Promise.all rejects on the first failure, but the other jobs keep running and still need an owner.", de: "Promise.all lehnt beim ersten Fehlschlag ab, die übrigen Aufträge laufen aber weiter und brauchen weiterhin einen Besitzer." }, { en: "Promise.allSettled never rejects, so every outcome stays accounted for.", de: "Promise.allSettled lehnt nie ab, jedes Ergebnis bleibt also erfasst." }, { en: "settleAll must report a rejection as { status: 'rejected', reason: message }, not re-throw it.", de: "settleAll muss eine Ablehnung als { status: 'rejected', reason: message } melden und sie nicht erneut werfen." } ]
---
## Lernziel

Entscheide, ob Arbeit überlappen soll, und wähle den Kombinator, der dem Aufrufer sagt, was er über einen Teilfehlschlag wirklich wissen muss.

## Ein Promise beginnt, wenn es erzeugt wird

Das ist die Tatsache, die Nebenläufigkeit in JavaScript einfach macht, sobald man sie sieht: die Arbeit beginnt in dem Moment, in dem das Promise existiert, nicht wenn du es `await`est. Der Unterschied zwischen nacheinander und gleichzeitig liegt also darin, **wo die Aufrufe stehen**, nicht wo die awaits stehen.

```js
for (const job of jobs) out.push(await job());   // Auftrag 2 startet nach Auftrag 1
await Promise.all(jobs.map((job) => job()));     // alle gestartet, dann alle abgewartet
```

Zwei Aufträge von je 30 ms brauchen in der ersten Form etwa 60 ms und in der zweiten etwa 30 ms. Die Tests dieses Steps messen die verstrichene Zeit, eine nur scheinbar nebenläufige Umsetzung fällt also durch.

## all gegen allSettled

MDNs [Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) beschreibt die Kombinatoren. Die beiden hier wichtigen unterscheiden sich darin, was sie mit einem Fehlschlag machen:

| | Bei Erfolg | Bei einem Fehlschlag |
|---|---|---|
| `Promise.all` | Array von Werten, Eingabereihenfolge | lehnt sofort mit diesem Grund ab |
| `Promise.allSettled` | Array von `{status, value}` | Array einschließlich `{status: "rejected", reason}` |

`Promise.all` ist richtig, wenn das Ergebnis nur vollständig sinnvoll ist: drei Teile einer Seite, drei Felder eines Datensatzes. Fällt einer weg, ist der Rest wertlos, schnelles Scheitern ist also korrekt.

`Promise.allSettled` ist richtig, wenn die Aufträge unabhängig sind und Teilerfolg etwas wert ist: zwölf Dateien hochladen, zwanzig Links prüfen. Der Aufrufer muss wissen, welche gescheitert sind, nicht nur, dass etwas gescheitert ist.

Ein Detail, das viele erwischt: **`Promise.all` bricht nichts ab.** Wenn es ablehnt, laufen die anderen Aufträge zu Ende. Lehnt einer davon ebenfalls ab, kann daraus die unbehandelte Ablehnung aus [m6-03](step:m6-03-async-errors) werden.

## Gleichzeitig ist nicht immer besser

Nacheinander ist die richtige Antwort, wenn ein späterer Auftrag ein früheres Ergebnis braucht, oder wenn etwas außerhalb deines Programms Überlappung verbietet - ein Rate Limit, eine einzelne Verbindung, Schreibvorgänge, die in Reihenfolge ankommen müssen. „Alles auf einmal" ist eine Entscheidung mit Kosten, kein Standard.

## Die Aufgabe

Öffne [`src/m6/parallel.js`](file:src/m6/parallel.js). `step` ist vorgegeben. Alle drei Funktionen werfen.

- `inSequence(jobs)` wartet einen Auftrag nach dem anderen ab, Ergebnisse in Reihenfolge.
- `together(jobs)` startet jeden Auftrag und wartet danach alle ab, Ergebnisse weiterhin in Reihenfolge.
- `settleAll(jobs)` meldet einen Eintrag je Auftrag, auch wenn manche ablehnen, wobei `reason` die Fehler**meldung** ist.

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m6-04-concurrency.test.js
```

Drei grün, einschließlich der beiden Zeitmessungen. Die Frage-Aufgabe ist der Kern des Steps: dies ist ein `evaluate`-Step, und die begründete Wahl ist das Ergebnis. Damit ist M6 abgeschlossen. Als Nächstes das [Abschlussprojekt](step:m7-01-capstone-design).
