---
id: m5-04-transformations
title: map, filter, reduce und ein sort, das lügt
bloom: analyze
objectives: [javascript-web-javascript-guide-indexed-collections]
requires: [m5-03-arrays]
estimatedMinutes: 20
scaffold: independent
recallFrom: [m5-03-arrays, m4-02-parameters]
links:
  - { step: m5-03-arrays }
  - { step: m6-01-promises }
  - { file: "src/m5/report.js", line: 9 }
  - { file: "examples/m5-sort-default.js" }
sources: [src/m5/report.js, test/m5-04-transformations.test.js, examples/m5-sort-default.js]
tasks:
  - id: guess-sort
    title: Sag die vier sort- und Sparse-Ergebnisse vorher
    check: { type: predict, prompt: { en: "examples/m5-sort-default.js sorts [10, 9, 100, 1] with and without a comparator, checks whether sort returned the same array it was given, and then prints a sparse array's length, its hole and what map does with it. Write all five lines down first.", de: "examples/m5-sort-default.js sortiert [10, 9, 100, 1] mit und ohne Vergleichsfunktion, prüft, ob sort dasselbe Array zurückgegeben hat, und gibt dann Länge, Loch und map-Ergebnis eines dünnbesetzten Arrays aus. Schreib alle fünf Zeilen zuerst auf." }, then: { type: command, command: "node examples/m5-sort-default.js", expectExitCode: 0, expectStdout: "empty item" }, rubric: "Notices that the default sort compares elements as strings, giving [1, 10, 100, 9]; that sort returns the very same array it sorted, so the comparison against the input is true and the caller's order was changed; and that a hole in a sparse array reports undefined, is not 'in' the array, and is preserved rather than mapped.", bloom: evaluate }
  - id: report
    title: Alle drei Report-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m5-04 totals aggregates count, sum and max", "m5-04 topLabels orders by amount, largest first", "m5-04 topLabels leaves the caller's array in its original order"], minPass: 3 }
  - id: pipeline-or-loop
    title: Eine Kette oder eine Schleife
    check: { type: question, prompt: { en: "totals could also have been one for...of loop. Give one reason to prefer the array-method pipeline, and one reason a plain loop can be the better choice.", de: "totals hätte auch eine einzige for...of-Schleife sein können. Nenne einen Grund für die Kette aus Array-Methoden und einen Grund, aus dem eine einfache Schleife die bessere Wahl sein kann." }, rubric: "For the pipeline: each stage names what it does, there is no index arithmetic and no mutable accumulator, and the stages compose and can be read one at a time. For the loop: one pass instead of several over large data, the ability to stop early, or a computation whose steps are entangled enough that splitting them into named stages obscures rather than clarifies.", bloom: evaluate, minChars: 80 }
socratic:
  - { trigger: "task:report:failed", question: { en: "Is the aggregate wrong, or did the caller's array come back reordered?", de: "Stimmt die Aggregation nicht, oder kam das Array des Aufrufers umsortiert zurück?" }, hints: [ { en: "reduce takes a starting value; give it 0 so an empty array answers 0 rather than throwing.", de: "reduce nimmt einen Startwert; gib ihm 0, damit ein leeres Array 0 liefert statt zu werfen." }, { en: "sort works in place and returns the same array, so sorting the caller's rows reorders them.", de: "sort arbeitet an Ort und Stelle und liefert dasselbe Array zurück, das Sortieren der Zeilen des Aufrufers ordnet sie also um." }, { en: "Copy first: [...rows].sort((a, b) => b.amount - a.amount)", de: "Zuerst kopieren: [...rows].sort((a, b) => b.amount - a.amount)" } ] }
misconceptions:
  - pattern: "Reduce of empty array with no initial value"
    question: { en: "reduce had nothing to start from. Which argument is missing?", de: "reduce hatte keinen Ausgangspunkt. Welches Argument fehlt?" }
    hints: [ { en: "Without an initial value, reduce takes the first element as the accumulator - and an empty array has none.", de: "Ohne Startwert nimmt reduce das erste Element als Akkumulator - und ein leeres Array hat keines." }, { en: "The second argument to reduce is that starting value.", de: "Das zweite Argument von reduce ist genau dieser Startwert." }, { en: "rows.reduce((acc, r) => acc + r.amount, 0)", de: "rows.reduce((acc, r) => acc + r.amount, 0)" } ]
  - pattern: "deep-equal|'b',\\s*'a'"
    question: { en: "The order of the caller's rows changed. Which method did that, and does it return a copy?", de: "Die Reihenfolge der Zeilen des Aufrufers hat sich geändert. Welche Methode war das, und liefert sie eine Kopie?" }
    hints: [ { en: "sort sorts in place and returns the same array, not a new one.", de: "sort sortiert an Ort und Stelle und liefert dasselbe Array zurück, kein neues." }, { en: "This is the ownership rule from m5-03 in a new disguise.", de: "Das ist die Eigentümer-Regel aus m5-03 in neuer Verkleidung." }, { en: "Spread into a new array before sorting.", de: "Spreize vor dem Sortieren in ein neues Array." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Drück eine Aggregation als Kette von Array-Methoden aus und kenne die zwei Standardverhalten, die `sort` und `reduce` genau in den Fällen falsch machen, die du nicht getestet hast.

## Drei Methoden, eine Form

```js
rows.map((row) => row.amount)              // eine Ausgabe je Eingabe
rows.filter((row) => row.amount > 0)       // eine Teilmenge, gleiche Reihenfolge
rows.reduce((acc, row) => acc + row.amount, 0)   // viele Eingaben, eine Ausgabe
```

Alle drei nehmen einen Callback und liefern etwas Neues; keine fasst das Array an. Deshalb lassen sie sich so gut verketten - und deshalb sind sie die natürliche Fortsetzung von [m5-03](step:m5-03-arrays).

`reduce` hat ein Argument, das leicht weggelassen und teuer weggelassen ist: den **Startwert**. Ohne ihn nimmt `reduce` das erste Element als Akkumulator, und bei einem leeren Array wirft es:

```
TypeError: Reduce of empty array with no initial value
```

Übergib ihn immer. Er dokumentiert außerdem den Typ des Ergebnisses.

## `sort` vergleicht standardmäßig Zeichenketten

MDNs Kapitel [Indexed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections) sagt es, und es überrascht trotzdem jeden:

```js
[10, 9, 100, 1].sort()                 // [1, 10, 100, 9]
[10, 9, 100, 1].sort((a, b) => a - b)  // [1, 9, 10, 100]
```

Ohne Vergleichsfunktion werden die Elemente in Zeichenketten umgewandelt und als Text verglichen, `"100"` kommt also vor `"9"`. Zahlen brauchen immer eine Vergleichsfunktion.

`sort` **sortiert außerdem an Ort und Stelle und liefert dasselbe Array zurück**. Eine Funktion, die die Zeilen ihres Aufrufers sortiert, hat dessen Daten umgeordnet - wieder die Eigentümer-Regel aus [m5-03](step:m5-03-arrays), nur mit anderem Hut. Kopiere zuerst:

```js
[...rows].sort((a, b) => b.amount - a.amount)
```

Sag [`examples/m5-sort-default.js`](file:examples/m5-sort-default.js) vorher, bevor du es ausführst; es zeigt beide Tatsachen plus die Löcher dünnbesetzter Arrays aus dem vorigen Step.

## Eine Vergleichsfunktion mit Gleichstandsregel

Eine Vergleichsfunktion liefert eine negative Zahl, null oder eine positive. Zwei Kriterien zu verketten ist idiomatisch:

```js
(a, b) => b.amount - a.amount || a.label.localeCompare(b.label)
```

Das `||` nimmt den zweiten Vergleich nur, wenn der erste `0` lieferte - eine berechtigte Verwendung von `||`, denn hier bedeutet `0` wirklich „keine Entscheidung". Genau das brauchst du im [Abschlussprojekt](step:m7-02-capstone-build).

## Die Aufgabe

Öffne [`src/m5/report.js`](file:src/m5/report.js):

- `totals(rows)` wirft; bau `{ count, sum, max }`. Ein leeres Array muss Nullen liefern, denk also an den Startwert von `reduce`.
- `topLabels(rows, n)` liefert die Labels der `n` größten Beträge. Eine Vergleichsfunktion hat es schon; was ihm fehlt, ist eine Kopie.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m5-04-transformations.test.js
node examples/m5-sort-default.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m5-04-transformations.test.js
```

Drei grün, und deine Vorhersage ist erfasst. Damit ist M5 abgeschlossen. [M6](step:m6-01-promises) verlässt den synchronen Code.
