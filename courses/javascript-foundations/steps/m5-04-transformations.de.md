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
    check: { type: predict, prompt: { en: "Read examples/m5-sort-default.js. Write down all five lines it prints before you run it.", de: "Lies examples/m5-sort-default.js. Schreib alle fünf ausgegebenen Zeilen auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m5-sort-default.js", expectExitCode: 0, expectStdout: "empty item" }, rubric: "Sets the five predicted lines against the printed ones and names at least two that were wrong, with the rule each corrected. Does not pass: reporting the output line by line without naming which expectations it overturned.", bloom: evaluate }
  - id: report
    title: Alle drei Report-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m5-04 totals aggregates count, sum and max", "m5-04 topLabels orders by amount, largest first", "m5-04 topLabels leaves the caller's array in its original order"], minPass: 3 }
  - id: pipeline-or-loop
    title: Eine Kette oder eine Schleife
    check: { type: question, prompt: { en: "Give one reason to prefer the method chain here, and one case where a loop wins.", de: "Nenne einen Grund für die Methodenkette hier und einen Fall, in dem eine Schleife gewinnt." }, rubric: "One reason that is about the reader or about composition, and one case that is about a real cost or a capability the chain lacks, such as stopping part-way or a single pass over large input. Does not pass: a preference stated without a reason, or a loop case that the chain handles just as well.", bloom: evaluate, minChars: 50 }
socratic:
  - trigger: "task:guess-sort:failed"
    question: { en: "How many of the five did you get right, and which one surprised you most?", de: "Wie viele der fünf hattest du richtig, und welche überraschte am meisten?" }
    hints: [ { en: "Write your five in a column so you can tick them against the output one at a time.", de: "Schreib deine fünf in eine Spalte, damit du sie einzeln gegen die Ausgabe abhaken kannst." }, { en: "Two of the five are about ordering, one about identity, and two about a collection with a gap in it.", de: "Zwei der fünf handeln von Reihenfolge, eine von Identität und zwei von einer Sammlung mit Lücke." }, { en: "The ordering pair differs only in whether a comparison was supplied, and that changes what is compared.", de: "Das Reihenfolge-Paar unterscheidet sich nur darin, ob ein Vergleich übergeben wurde, und das ändert, was verglichen wird." } ]
  - trigger: "task:report:failed"
    question: { en: "Is the aggregate wrong, or did the caller's rows come back reordered?", de: "Stimmt die Aggregation nicht, oder kamen die Zeilen des Aufrufers umsortiert zurück?" }
    hints: [ { en: "Run the three assertions separately; the last one inspects the input after the call.", de: "Lass die drei Assertions getrennt laufen; die letzte untersucht die Eingabe nach dem Aufruf." }, { en: "For the first function, ask what an empty input should answer and what the fold does without a start.", de: "Frag bei der ersten Funktion, was eine leere Eingabe liefern soll und was die Faltung ohne Start tut." }, { en: "The second function already has its comparison; what it lacks is a collection of its own to work on.", de: "Die zweite Funktion hat ihren Vergleich schon; was ihr fehlt, ist eine eigene Sammlung zum Arbeiten." } ]
  - trigger: "task:pipeline-or-loop:failed"
    question: { en: "Does your loop case name something the chain genuinely cannot do?", de: "Nennt dein Schleifenfall etwas, das die Kette wirklich nicht kann?" }
    hints: [ { en: "Count how many times each version walks the input for the same result.", de: "Zähl, wie oft jede Fassung die Eingabe für dasselbe Ergebnis durchläuft." }, { en: "Then ask what happens when you want to stop as soon as an answer is known.", de: "Frag dann, was passiert, wenn du aufhören willst, sobald eine Antwort feststeht." }, { en: "Try describing each version aloud; one of them names its steps and the other needs you to trace them.", de: "Beschreib jede Fassung laut; eine benennt ihre Schritte, bei der anderen musst du sie nachverfolgen." } ]
misconceptions:
  - pattern: "Reduce of empty array with no initial value"
    question: { en: "reduce had nothing to start from. Which argument is missing?", de: "reduce hatte keinen Ausgangspunkt. Welches Argument fehlt?" }
    hints: [ { en: "Without an initial value, reduce takes the first element as the accumulator - and an empty array has none.", de: "Ohne Startwert nimmt reduce das erste Element als Akkumulator - und ein leeres Array hat keines." }, { en: "The second argument to reduce is that starting value.", de: "Das zweite Argument von reduce ist genau dieser Startwert." }, { en: "The second argument is the starting accumulator, and it also fixes what an empty input answers.", de: "Das zweite Argument ist der Startakkumulator, und es legt zugleich fest, was eine leere Eingabe liefert." } ]
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
