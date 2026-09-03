---
id: m7-02-capstone-build
title: Das Report-Werkzeug bauen und selbst testen
bloom: create
objectives: [js.tooling.node-test, js.errors.custom-class, js.async.errors, javascript-web-javascript-guide-indexed-collections]
requires: [m7-01-capstone-design]
estimatedMinutes: 60
scaffold: independent
recallFrom: [m7-01-capstone-design, m5-04-transformations, m6-03-async-errors]
links:
  - { step: m7-01-capstone-design }
  - { step: m2-04-error-objects }
  - { file: "src/m7/report-tool.js" }
  - { file: "test/m7-02-capstone-build.mine.test.js" }
sources: [src/m7/report-tool.js, test/m7-02-capstone-build.test.js, test/m7-02-capstone-build.mine.test.js]
tasks:
  - id: contract
    title: Die vorgegebene Suite ist grün
    check: { type: testSuite, runner: node-test, expectPass: ["m7-02 parseLine reads a record and ignores comments and blanks", "m7-02 parseLine rejects malformed records with a ReportError", "m7-02 parseReport keeps file order and drops ignored lines", "m7-02 summarize aggregates per label and overall", "m7-02 formatReport sorts by total, then alphabetically", "m7-02 loadReport awaits the reader and formats the result", "m7-02 loadReport wraps a reader failure and keeps the cause"], minPass: 7 }
  - id: own-tests
    title: Mindestens zwei eigene Tests bestehen
    check: { type: command, command: "node --test --test-reporter=tap test/m7-02-capstone-build.mine.test.js", expectExitCode: 0, expectStdout: "# pass ([2-9]|[1-9][0-9]+)", timeoutMs: 60000 }
  - id: what-your-tests-found
    title: Wozu deine eigenen Tests da waren
    check: { type: question, prompt: { en: "Which cases did you add, and why does the given suite miss them? One sentence each.", de: "Welche Fälle hast du ergänzt, und warum fehlen sie der vorgegebenen Suite? Je ein Satz." }, rubric: "At least two concrete cases, each with a reason the given suite does not reach it, and an honest outcome, whether a bug appeared or the implementation already held. Does not pass: a case the given suite already covers, or a claim that a test found something without saying what changed.", bloom: evaluate, minChars: 80 }
socratic:
  - trigger: "task:contract:failed"
    question: { en: "Which of the seven fails, and is it about reading, aggregating, formatting or waiting?", de: "Welcher der sieben scheitert, und geht es um Lesen, Aggregieren, Formatieren oder Warten?" }
    hints: [ { en: "Take them top to bottom; the first two fix the shape of everything the others build on.", de: "Nimm sie von oben nach unten; die ersten zwei legen die Form fest, auf der die anderen aufbauen." }, { en: "For the error class, one statement has to come before any assignment, and the options have to travel through it.", de: "Bei der Fehlerklasse muss eine Anweisung vor jeder Zuweisung stehen, und die Optionen müssen durch sie hindurch." }, { en: "The formatter needs two criteria, and the total line is appended rather than sorted with the rest.", de: "Der Formatierer braucht zwei Kriterien, und die Summenzeile wird angehängt, nicht mitsortiert." } ]
  - trigger: "task:own-tests:failed"
    question: { en: "Does the file contain at least two tests that actually run, rather than commented-out examples?", de: "Enthält die Datei mindestens zwei wirklich laufende Tests statt auskommentierter Beispiele?" }
    hints: [ { en: "Run that file on its own and read the counts at the end.", de: "Lass die Datei allein laufen und lies die Zähler am Ende." }, { en: "A commented-out call is not a test; the file ships with only comments in it.", de: "Ein auskommentierter Aufruf ist kein Test; die Datei wird nur mit Kommentaren ausgeliefert." }, { en: "Pick inputs a real report would contain that the specification never mentions.", de: "Wähle Eingaben, die ein echter Bericht enthielte und die Spezifikation nie erwähnt." } ]
  - trigger: "task:what-your-tests-found:failed"
    question: { en: "For each case you added, can you say what the given suite does instead?", de: "Kannst du für jeden ergänzten Fall sagen, was die vorgegebene Suite stattdessen tut?" }
    hints: [ { en: "Read the given assertions once more and list the inputs they never use.", de: "Lies die vorgegebenen Assertions noch einmal und liste die nie benutzten Eingaben auf." }, { en: "Amounts have a sign, labels can contain more than letters, and files do not always end tidily.", de: "Beträge haben ein Vorzeichen, Labels können mehr als Buchstaben enthalten, und Dateien enden nicht immer ordentlich." }, { en: "If nothing broke, that is a finding too, provided you say which assumption it confirmed.", de: "Wenn nichts brach, ist das auch ein Befund, sofern du sagst, welche Annahme es bestätigt hat." } ]
misconceptions:
  - pattern: "Must call super constructor"
    question: { en: "The derived constructor touched this too early. Which statement has to come first?", de: "Der abgeleitete Konstruktor hat this zu früh angefasst. Welche Anweisung muss zuerst kommen?" }
    hints: [ { en: "super(message, options) before any assignment to this - the same rule as m2-04.", de: "super(message, options) vor jeder Zuweisung an this - dieselbe Regel wie in m2-04." }, { en: "Forward the options object so { cause } reaches Error and shows up as error.cause.", de: "Reich das Optionsobjekt weiter, damit { cause } bei Error ankommt und als error.cause auftaucht." }, { en: "Only set line when it was actually given, so a ReportError without a line has no line property.", de: "Setz line nur, wenn es wirklich übergeben wurde, damit ein ReportError ohne Zeile keine line-Eigenschaft hat." } ]
  - pattern: "NaN|Reduce of empty array"
    question: { en: "An amount that is not a number reached the arithmetic, or an empty report had nothing to start from. Where is the boundary check?", de: "Ein Betrag, der keine Zahl ist, hat die Rechnung erreicht, oder ein leerer Bericht hatte keinen Startwert. Wo steht die Grenzprüfung?" }
    hints: [ { en: "parseLine must reject a non-finite amount with a ReportError rather than passing NaN on.", de: "parseLine muss einen nicht endlichen Betrag mit einem ReportError ablehnen, statt NaN weiterzureichen." }, { en: "Number.isFinite is the check; Number('') is 0, so an empty amount needs its own rejection.", de: "Number.isFinite ist die Prüfung; Number('') ist 0, ein leerer Betrag braucht also seine eigene Ablehnung." }, { en: "Give every reduce an initial value so an empty report answers 0.", de: "Gib jedem reduce einen Startwert, damit ein leerer Bericht 0 liefert." } ]
  - pattern: "'tea: 2.00|localeCompare|deep-equal"
    question: { en: "The output lines came out in the wrong order. What is the second criterion when two totals are equal?", de: "Die Ausgabezeilen kamen in der falschen Reihenfolge. Was ist das zweite Kriterium, wenn zwei Summen gleich sind?" }
    hints: [ { en: "Sort by total descending first: b[1] - a[1].", de: "Sortiere zuerst absteigend nach Summe: b[1] - a[1]." }, { en: "When that returns 0, fall through to the labels: || a[0].localeCompare(b[0]) - the m5-04 pattern.", de: "Liefert das 0, geh zu den Labels über: || a[0].localeCompare(b[0]) - das Muster aus m5-04." }, { en: "The TOTAL line is appended after sorting, never sorted with the others.", de: "Die TOTAL-Zeile wird nach dem Sortieren angehängt und nie mit einsortiert." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Bau aus einer Spezifikation ein funktionierendes Werkzeug und schreib die Tests, die prüfen, woran die Spezifikation nicht gedacht hat.

## Was du schreibst

Alles in [`src/m7/report-tool.js`](file:src/m7/report-tool.js). Sechs Exporte, und jeder ist ein Stück dieses Kurses:

| Export | Was er tut | Woher er kommt |
|---|---|---|
| `ReportError` | `Error`-Unterklasse mit `name`, `line` und weitergereichtem `cause` | [m2-04](step:m2-04-error-objects), [m6-03](step:m6-03-async-errors) |
| `parseLine` | eine Zeile zu `{label, amount}`, `null` oder einem Wurf | [m1-03](step:m1-03-coercion-nan), [m2-04](step:m2-04-error-objects) |
| `parseReport` | Text zu Datensätzen, in Dateireihenfolge | [m3-03](step:m3-03-for-of-and-in) |
| `summarize` | Datensätze zu `{count, sum, byLabel}` | [m5-04](step:m5-04-transformations) |
| `formatReport` | Zusammenfassung zu sortierten Zeilen plus `TOTAL` | [m5-04](step:m5-04-transformations) |
| `loadReport` | einen Reader abwarten, dann die drei darüber | [m6-03](step:m6-03-async-errors) |

Arbeite von den Tests her. `node --test test/m7-02-capstone-build.test.js` gibt dir sieben Fehlschläge; nimm sie einzeln von oben nach unten, und die Form jeder Funktion folgt aus den Assertions.

Zwei Details, die die Tests prüfen und die man leicht knapp danebenmacht:

- **`ReportError` reicht seine Optionen weiter.** `constructor(message, line, options)` ruft `super(message, options)` auf, damit `new ReportError("cannot read report", undefined, { cause: error })` den ursprünglichen Fehler erreichbar hält.
- **Die Gleichstandsregel ist dokumentiert, nicht zufällig.** Gleiche Summen sortieren alphabetisch nach Label: `b[1] - a[1] || a[0].localeCompare(b[0])`.

## Die Tests, die du schreibst

[`test/m7-02-capstone-build.mine.test.js`](file:test/m7-02-capstone-build.mine.test.js) gehört dir. Sie wird mit einem Kopf und ohne Tests ausgeliefert, und die Prüfung verlangt **mindestens zwei bestehende Tests** darin.

Schreib Fälle, welche die vorgegebene Suite nicht erreicht. Die Datei schlägt einige vor; die besseren findest du mit der Frage „was würde in einem echten Bericht stehen, das diese Spezifikation nie erwähnt?" Zum Beispiel:

- ein negativer Betrag, eine Erstattung - senkt sie die `TOTAL`-Zeile korrekt?
- ein Label mit Leerzeichen darin, oder ein Betrag geschrieben als `+2.5`
- eine Datei, deren letzte Zeile keinen Zeilenumbruch am Ende hat
- zwei Labels mit exakt derselben Summe, was die Gleichstandsregel prüft

Führ während der Arbeit nur deine Datei aus:

```bash
node --test --test-reporter=tap test/m7-02-capstone-build.mine.test.js
```

Danach alles zusammen:

```bash
node --test test/*.test.js
```

Schlägt einer deiner Tests gegen deine eigene Umsetzung fehl, hast du etwas gefunden. Entscheide, welches von beiden falsch ist, bevor du eines änderst - und halte es fest, denn die dritte Aufgabe fragt genau danach.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m7-02-capstone-build.test.js
node --test --test-reporter=tap test/m7-02-capstone-build.mine.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

Die vorgegebene Suite ist grün, mindestens zwei eigene Tests bestehen, und du kannst sagen, wozu deine Tests da waren. Das ist der ganze Kurs in einer Datei: Werte, Kontrollfluss, Schleifen, Funktionen, Objekte, Arrays, Asynchronität - und eine Spezifikation, die du gelesen und nicht geraten hast.
