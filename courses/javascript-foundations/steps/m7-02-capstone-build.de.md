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
    check: { type: question, prompt: { en: "Describe the cases you added and why the given suite does not already cover them. If writing a test changed the implementation, say what you had assumed and what the test showed you. If none of them found anything, say how you chose them and what that tells you about the given suite.", de: "Beschreibe die Fälle, die du ergänzt hast, und warum die vorgegebene Suite sie nicht bereits abdeckt. Falls das Schreiben eines Tests die Umsetzung verändert hat, sag, was du angenommen hattest und was der Test dir gezeigt hat. Falls keiner etwas gefunden hat, sag, wie du sie ausgewählt hast und was das über die vorgegebene Suite aussagt." }, rubric: "Names at least two concrete cases with a reason each - for example negative amounts, a label containing spaces, a leading plus sign, a missing trailing newline, or two labels with the same total exercising the tie-break. Describes the outcome honestly, whether a bug was found or the implementation already handled it, and reflects on what the given suite was and was not checking.", bloom: evaluate, minChars: 150 }
socratic:
  - { trigger: "task:contract:failed", question: { en: "Which of the seven is failing, and is it about parsing, aggregating, formatting or the async path?", de: "Welcher der sieben schlägt fehl, und geht es um Parsen, Aggregieren, Formatieren oder den asynchronen Pfad?" }, hints: [ { en: "The ReportError constructor must call super(message, options) first, then set name and line - m2-04.", de: "Der ReportError-Konstruktor muss zuerst super(message, options) aufrufen und dann name und line setzen - m2-04." }, { en: "formatReport sorts by total descending and breaks ties with localeCompare on the label, then appends the TOTAL line.", de: "formatReport sortiert absteigend nach Summe, löst Gleichstände mit localeCompare am Label und hängt danach die TOTAL-Zeile an." }, { en: "loadReport must await the reader inside a try block and wrap a rejection in a ReportError with { cause } - m6-03.", de: "loadReport muss den Reader innerhalb eines try-Blocks awaiten und eine Ablehnung in einen ReportError mit { cause } einpacken - m6-03." } ] }
  - { trigger: "task:own-tests:failed", question: { en: "Does your test file contain at least two passing tests, and does it import from the right path?", de: "Enthält deine Testdatei mindestens zwei bestehende Tests, und importiert sie aus dem richtigen Pfad?" }, hints: [ { en: "The file starts with only comments; a commented-out test does not count as a test.", de: "Die Datei beginnt nur mit Kommentaren; ein auskommentierter Test zählt nicht als Test." }, { en: "Run it directly: node --test --test-reporter=tap test/m7-02-capstone-build.mine.test.js", de: "Führ sie direkt aus: node --test --test-reporter=tap test/m7-02-capstone-build.mine.test.js" }, { en: "Two tests that assert something real are enough; pick cases the given suite does not reach.", de: "Zwei Tests, die wirklich etwas prüfen, genügen; wähle Fälle, die die vorgegebene Suite nicht erreicht." } ] }
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
node --test
```

Schlägt einer deiner Tests gegen deine eigene Umsetzung fehl, hast du etwas gefunden. Entscheide, welches von beiden falsch ist, bevor du eines änderst - und halte es fest, denn die dritte Aufgabe fragt genau danach.

## Woran du erkennst, dass es geklappt hat

Die vorgegebene Suite ist grün, mindestens zwei eigene Tests bestehen, und du kannst sagen, wozu deine Tests da waren. Das ist der ganze Kurs in einer Datei: Werte, Kontrollfluss, Schleifen, Funktionen, Objekte, Arrays, Asynchronität - und eine Spezifikation, die du gelesen und nicht geraten hast.
