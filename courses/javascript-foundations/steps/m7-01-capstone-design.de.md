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
    check: { type: predict, prompt: { en: "examples/m7-pipeline.js parses three lines, one of which has a non-numeric amount, then sums them and formats the sum. Write down the parsed array, the sum, the formatted sum and the guarded sum before running it.", de: "examples/m7-pipeline.js parst drei Zeilen, davon eine mit nicht-numerischem Betrag, summiert sie und formatiert die Summe. Schreib das geparste Array, die Summe, die formatierte Summe und die abgesicherte Summe auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m7-pipeline.js", expectExitCode: 0, expectStdout: "guarded" }, rubric: "Recognises that Number('abc') is NaN, that one NaN poisons the whole reduce so the sum is NaN, that NaN.toFixed(2) is the string 'NaN' rather than an error, and that filtering with Number.isFinite before reducing is what keeps the bad row from destroying the total.", bloom: evaluate }
  - id: design-decisions
    title: Entscheide, wie fehlerhafte Eingaben behandelt werden
    check: { type: question, prompt: { en: "The tool must handle a malformed line. Compare three designs: skip the line silently, collect the errors and report them at the end, or throw a ReportError on the first bad line. Say which the given tests demand, what each design costs the caller, and how you would decide if you owned the requirement.", de: "Das Werkzeug muss mit einer fehlerhaften Zeile umgehen. Vergleiche drei Entwürfe: die Zeile still überspringen, die Fehler sammeln und am Ende melden, oder beim ersten Fehler einen ReportError werfen. Sag, welchen die vorgegebenen Tests verlangen, was jeder Entwurf den Aufrufer kostet, und wie du entscheiden würdest, wenn dir die Anforderung gehörte." }, rubric: "Identifies that the given tests demand throwing a ReportError carrying the offending line, and that a comment or blank line is not an error but an ignored line. Weighs the alternatives honestly: silent skipping produces a plausible but wrong total with no way to notice; collecting errors suits batch processing where partial results are useful; failing fast suits a file that is meant to be correct. Connects the choice to the caller's ability to act on the information, and may reference the Promise.all against allSettled trade-off from m6-04.", bloom: evaluate, minChars: 150 }
socratic:
  - { trigger: "task:guess-pipeline:failed", question: { en: "Did the script run from the workspace folder?", de: "Lief das Skript aus dem Workspace-Ordner heraus?" }, hints: [ { en: "node examples/m7-pipeline.js, started in javascript-foundations.", de: "node examples/m7-pipeline.js, gestartet in javascript-foundations." }, { en: "Write the prediction down before running - especially the third line.", de: "Schreib die Vorhersage vor dem Lauf auf - besonders die dritte Zeile." }, { en: "The interesting question is what toFixed does to a value that is not a number.", de: "Die interessante Frage ist, was toFixed mit einem Wert macht, der keine Zahl ist." } ] }
misconceptions:
  - pattern: "NaN"
    question: { en: "One bad row turned the whole total into NaN. At which step could it have been stopped?", de: "Eine schlechte Zeile hat die ganze Summe zu NaN gemacht. An welcher Stelle hätte man sie aufhalten können?" }
    hints: [ { en: "NaN spreads: every arithmetic operation involving it produces NaN again.", de: "NaN breitet sich aus: jede Rechenoperation damit erzeugt wieder NaN." }, { en: "NaN.toFixed(2) is the string 'NaN' - the formatter does not complain either.", de: "NaN.toFixed(2) ist die Zeichenkette 'NaN' - auch der Formatierer beschwert sich nicht." }, { en: "Validate at the boundary, where the text becomes a number, not after the arithmetic.", de: "Prüfe an der Grenze, wo aus Text eine Zahl wird, nicht nach der Rechnung." } ]
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

Es gibt drei vertretbare Arten, mit einer fehlerhaften Zeile umzugehen:

1. **Still überspringen.** Das Werkzeug liefert immer eine Zahl. Die Zahl kann falsch sein, und niemand erfährt es.
2. **Fehler sammeln und am Ende melden.** Gut für Stapelverarbeitung, in der ein Teilergebnis nützlich ist - die `allSettled`-Form aus [m6-04](step:m6-04-concurrency).
3. **Bei der ersten schlechten Zeile werfen und sie benennen.** Gut für eine Datei, die korrekt sein soll; der Aufrufer erfährt genau, welche Zeile er reparieren muss.

Die vorgegebenen Tests verlangen die dritte, und sie verlangen, dass ein Kommentar oder eine Leerzeile *kein* Fehler ist, sondern eine ignorierte Zeile. Die zweite Aufgabe verlangt, diese Wahl zu begründen und zu sagen, was sie kostet.

## Die Aufgabe

Sag [`examples/m7-pipeline.js`](file:examples/m7-pipeline.js) vorher und führe es aus. Schreib danach deine Antwort auf die Entwurfsfrage. Fang noch nicht mit der Umsetzung an - [der nächste Step](step:m7-02-capstone-build) ist der Bau, und er geht schneller, wenn diese Entscheidungen getroffen sind.

## Woran du erkennst, dass es geklappt hat

Deine Vorhersage ist erfasst, und deine Entwurfsantwort benennt, welche der drei Fehlerstrategien die Tests verlangen und was die anderen beiden kosten würden.
