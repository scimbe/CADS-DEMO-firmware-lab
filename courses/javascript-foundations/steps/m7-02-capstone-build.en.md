---
id: m7-02-capstone-build
title: Building the report tool, and testing it yourself
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
    title: The given suite is green
    check: { type: testSuite, runner: node-test, expectPass: ["m7-02 parseLine reads a record and ignores comments and blanks", "m7-02 parseLine rejects malformed records with a ReportError", "m7-02 parseReport keeps file order and drops ignored lines", "m7-02 summarize aggregates per label and overall", "m7-02 formatReport sorts by total, then alphabetically", "m7-02 loadReport awaits the reader and formats the result", "m7-02 loadReport wraps a reader failure and keeps the cause"], minPass: 7 }
  - id: own-tests
    title: At least two tests of your own pass
    check: { type: command, command: "node --test --test-reporter=tap test/m7-02-capstone-build.mine.test.js", expectExitCode: 0, expectStdout: "# pass ([2-9]|[1-9][0-9]+)", timeoutMs: 60000 }
  - id: what-your-tests-found
    title: What your own tests were for
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
## Learning goal

Build a working tool from a specification, and write the tests that check what the specification did not think of.

## What you write

Everything in [`src/m7/report-tool.js`](file:src/m7/report-tool.js). Six exports, and each one is a piece of the course:

| Export | What it does | Where it came from |
|---|---|---|
| `ReportError` | `Error` subclass with `name`, `line` and a forwarded `cause` | [m2-04](step:m2-04-error-objects), [m6-03](step:m6-03-async-errors) |
| `parseLine` | one line to `{label, amount}`, `null`, or a throw | [m1-03](step:m1-03-coercion-nan), [m2-04](step:m2-04-error-objects) |
| `parseReport` | text to records, in file order | [m3-03](step:m3-03-for-of-and-in) |
| `summarize` | records to `{count, sum, byLabel}` | [m5-04](step:m5-04-transformations) |
| `formatReport` | summary to sorted lines plus `TOTAL` | [m5-04](step:m5-04-transformations) |
| `loadReport` | await a reader, then the three above | [m6-03](step:m6-03-async-errors) |

Work from the tests. `node --test test/m7-02-capstone-build.test.js` gives you seven failures; take them one at a time, top to bottom, and the shape of each function follows from the assertions.

Two details that the tests check and that are easy to get subtly wrong:

- **`ReportError` forwards its options.** `constructor(message, line, options)` calls `super(message, options)`, so `new ReportError("cannot read report", undefined, { cause: error })` keeps the original error reachable.
- **The tie-break is documented, not accidental.** Equal totals sort alphabetically by label: `b[1] - a[1] || a[0].localeCompare(b[0])`.

## The tests you write

[`test/m7-02-capstone-build.mine.test.js`](file:test/m7-02-capstone-build.mine.test.js) is yours. It ships with a header and no tests, and the check requires **at least two passing tests** in it.

Write cases the given suite does not reach. The file suggests some; better ones are the ones you find by asking "what would a real report contain that this specification never mentions?" For example:

- a negative amount, a refund - does it lower the `TOTAL` line correctly?
- a label with a space in it, or an amount written `+2.5`
- a file whose last line has no trailing newline
- two labels with exactly the same total, exercising the tie-break

Run only your file while you work on it:

```bash
node --test --test-reporter=tap test/m7-02-capstone-build.mine.test.js
```

Then everything together:

```bash
node --test test/*.test.js
```

If one of your tests fails against your own implementation, you have found something. Decide which of the two is wrong before you change either - and note it, because the third task asks about exactly that.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `>Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m7-02-capstone-build.test.js
node --test --test-reporter=tap test/m7-02-capstone-build.mine.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

The given suite is green, at least two of your own tests pass, and you can say what your tests were for. That is the whole course in one file: values, control flow, loops, functions, objects, arrays, asynchrony - and a specification you read rather than guessed.
