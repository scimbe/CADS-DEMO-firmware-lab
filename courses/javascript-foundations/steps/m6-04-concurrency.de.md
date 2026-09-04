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

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `>Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m6-04-concurrency.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m6-04-concurrency.test.js
```

Drei grün, einschließlich der beiden Zeitmessungen. Die Frage-Aufgabe ist der Kern des Steps: dies ist ein `evaluate`-Step, und die begründete Wahl ist das Ergebnis. Damit ist M6 abgeschlossen. Als Nächstes das [Abschlussprojekt](step:m7-01-capstone-design).
