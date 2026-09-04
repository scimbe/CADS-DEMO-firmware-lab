---
id: m7-01-capstone-design
title: Das Report-Werkzeug entwerfen
bloom: evaluate
objectives: [js.tooling.node-test, javascript-web-javascript-guide-indexed-collections]
requires: [m6-04-concurrency]
estimatedMinutes: 25
scaffold: faded
recallFrom: [m5-04-transformations, m2-04-error-objects, m1-03-coercion-nan]
links:
  - { step: m6-04-concurrency }
  - { step: m7-02-capstone-build }
  - { file: "src/m7/report-tool.js" }
  - { file: "examples/m7-pipeline.js" }
sources: [src/m7/report-tool.js, examples/m7-pipeline.js, test/m7-02-capstone-build.test.js]
tasks:
  - id: guess-pipeline
    title: Sag vorher, was die naive Verarbeitungskette liefert
    check: { type: predict, prompt: { en: "Read examples/m7-pipeline.js. Write down all four values it prints before you run it.", de: "Lies examples/m7-pipeline.js. Schreib alle vier ausgegebenen Werte auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m7-pipeline.js", expectExitCode: 0, expectStdout: "guarded" }, rubric: "Sets the four predicted values against the printed ones and names the earliest point at which the pipeline went wrong. Does not pass: reporting the four values without identifying where the damage began.", bloom: evaluate }
  - id: design-decisions
    title: Entscheide, wie fehlerhafte Eingaben behandelt werden
    check: { type: question, prompt: { en: "Three ways to treat a bad line. Which do the tests demand, and what do the other two cost?", de: "Drei Umgänge mit einer fehlerhaften Zeile. Welchen verlangen die Tests, und was kosten die anderen?" }, rubric: "Derives from the assertions which of the three the suite requires, and keeps an unreadable record apart from one meant to be passed over. Prices the two rejected options against what the operator would and would not learn. Does not pass: naming the requirement with no price attached to the alternatives, or treating a passed-over record as a fault.", bloom: evaluate, minChars: 80 }
socratic:
  - trigger: "task:guess-pipeline:failed"
    question: { en: "Which of the four values did you expect, and which one first went wrong?", de: "Welche der vier Werte hast du erwartet, und welcher ging zuerst schief?" }
    hints: [ { en: "Three lines go in and one of them cannot become a number; follow that one through each stage.", de: "Drei Zeilen gehen hinein und eine kann keine Zahl werden; verfolge diese durch jede Stufe." }, { en: "Ask what the fold does once one of its inputs is not a number, and what it does on every pass after.", de: "Frag, was die Faltung tut, sobald eine Eingabe keine Zahl ist, und was sie in jedem weiteren Durchlauf tut." }, { en: "The formatting step accepts that result without complaint, which is why the damage reaches the output.", de: "Der Formatierungsschritt akzeptiert dieses Ergebnis anstandslos, deshalb erreicht der Schaden die Ausgabe." } ]
  - trigger: "task:design-decisions:failed"
    question: { en: "Does your answer say what each of the other two policies costs, or only which one the tests want?", de: "Sagt deine Antwort, was die anderen zwei Umgänge kosten, oder nur, welchen die Tests wollen?" }
    hints: [ { en: "Read the assertions about malformed records and about comment lines; they are not the same case.", de: "Lies die Assertions über fehlerhafte Datensätze und über Kommentarzeilen; das sind nicht dieselben Fälle." }, { en: "For each policy, ask what the person running the tool learns and what they can do about it.", de: "Frag für jeden Umgang, was die ausführende Person erfährt und was sie dagegen tun kann." }, { en: "One of the three always produces a number, and that is exactly what makes it dangerous.", de: "Einer der drei liefert immer eine Zahl, und genau das macht ihn gefährlich." } ]
misconceptions:
  - pattern: "NaN"
    question: { en: "One bad row turned the whole total into NaN. At which step could it have been stopped?", de: "Eine schlechte Zeile hat die ganze Summe zu NaN gemacht. An welcher Stelle hätte man sie aufhalten können?" }
    hints: [ { en: "NaN spreads: every arithmetic operation involving it produces NaN again.", de: "NaN breitet sich aus: jede Rechenoperation damit erzeugt wieder NaN." }, { en: "NaN.toFixed(2) is the string 'NaN' - the formatter does not complain either.", de: "NaN.toFixed(2) ist die Zeichenkette 'NaN' - auch der Formatierer beschwert sich nicht." }, { en: "Validate at the boundary, where the text becomes a number, not after the arithmetic.", de: "Prüfe an der Grenze, wo aus Text eine Zahl wird, nicht nach der Rechnung." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Lies eine Spezifikation, erkenne, wo sie schiefgehen kann, und entscheide, wie sich das Werkzeug an jeder dieser Stellen verhalten soll - bevor du die Umsetzung schreibst.

## Was du bauen wirst

Ein kleines Werkzeug in Kommandozeilen-Form, das einen Textbericht in eine Zusammenfassung verwandelt. Die Eingabe ist ein Datensatz je Zeile:

```
# drinks
coffee;3.50
tea;2
coffee;1.50
```

und die Ausgabe ist:

```
coffee: 5.00
tea: 2.00
TOTAL: 7.00
```

Der genaue Vertrag steht an zwei Stellen: im Kommentarblock oben in [`src/m7/report-tool.js`](file:src/m7/report-tool.js) und, präziser, in [`test/m7-02-capstone-build.test.js`](file:test/m7-02-capstone-build.test.js). Lies jetzt beides. Die Tests sind die Spezifikation; der Kommentar ist die Zusammenfassung.

## Wo das schiefgehen kann

Jedes Modul dieses Kurses hinterlässt seinen Fingerabdruck auf diesem Problem. Finde sie, bevor du Code schreibst:

- **Parsen.** `Number("abc")` ist `NaN` und wirft nicht ([m1-03](step:m1-03-coercion-nan)). `Number("")` ist `0`, ein leerer Betrag würde also still zu einer gültigen Null.
- **NaN breitet sich aus.** Eine schlechte Zeile vergiftet das ganze `reduce`, und `NaN.toFixed(2)` ist die Zeichenkette `"NaN"` statt eines Fehlers. Mach die Vorhersage-Aufgabe, bevor du weitergehst.
- **Sortieren.** Beträge sind Zahlen, die Vergleichsfunktion ist also Pflicht ([m5-04](step:m5-04-transformations)), und `sort` verändert, wenn du nicht zuerst kopierst.
- **Gleichstand.** Zwei Labels mit derselben Summe brauchen eine dokumentierte Reihenfolge, sonst ist die Ausgabe instabil.
- **Eigentümerschaft.** `summarize` bekommt ein Array vom Aufrufer und darf es nicht umsortieren ([m5-03](step:m5-03-arrays)).
- **Fehler.** Eine fehlerhafte Zeile muss von einem Kommentar unterscheidbar sein ([m2-04](step:m2-04-error-objects)).
- **Asynchronität.** `loadReport` wartet auf einen Reader, der ablehnen kann, und die Ablehnung darf nicht als unbehandelte entkommen ([m6-03](step:m6-03-async-errors)).

## Die Entscheidung, um die es hier geht

Es gibt drei vertretbare Arten, mit einer fehlerhaften Zeile umzugehen, und dieser Step lässt dich abwägen:

1. **Still überspringen.**
2. **Die Fehler sammeln und am Ende melden.**
3. **Bei der ersten schlechten Zeile anhalten und sie benennen.**

Welche die Tests verlangen, steht nicht hier. Es steht in
[`test/m7-02-capstone-build.test.js`](file:test/m7-02-capstone-build.test.js) - lies die Assertions über fehlerhafte Datensätze und getrennt davon die über Kommentare und Leerzeilen und leite ab, was jeder Umgang mit ihnen machen würde. Sag dann, was die zwei, die du nicht gewählt hast, die ausführende Person kosten würden.

## Die Aufgabe

Sag [`examples/m7-pipeline.js`](file:examples/m7-pipeline.js) vorher und führe es aus. Schreib danach deine Antwort auf die Entwurfsfrage. Fang noch nicht mit der Umsetzung an - [der nächste Step](step:m7-02-capstone-build) ist der Bau, und er geht schneller, wenn diese Entscheidungen getroffen sind.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `>Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node examples/m7-pipeline.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

Deine Vorhersage ist erfasst, und deine Entwurfsantwort benennt, welche der drei Fehlerstrategien die Tests verlangen und was die anderen beiden kosten würden.
