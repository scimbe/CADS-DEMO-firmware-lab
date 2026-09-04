---
id: m0-03-read-a-test
title: Einen Test lesen
bloom: understand
objectives: [js.tooling.node-test]
requires: [m0-02-first-run]
estimatedMinutes: 12
scaffold: worked
links:
  - { step: m0-02-first-run }
  - { step: m0-04-modules }
  - { file: "test/m0-03-read-a-test.test.js" }
  - { file: "src/m0/summary.js", line: 9 }
sources: [test/m0-03-read-a-test.test.js, src/m0/summary.js, README.md]
tasks:
  - id: summarize
    title: Beide summarize-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m0-03 summarize returns count, total and average", "m0-03 summarize of an empty array has average 0"], minPass: 2 }
  - id: read-the-diff
    title: Erkläre den Diff, den der Test ausgegeben hat
    check: { type: question, prompt: { en: "In the diff you saw, which side was your code, and what exactly differed? Two sentences.", de: "Welche Seite des Diffs war dein Code, und was genau unterschied sich? Zwei Sätze." }, rubric: "Names the marked side as the code's own output and the other as the test's demand, and identifies the difference as a property name rather than a number, since the value was identical on both sides. Does not pass: an answer that calls the number wrong, or one that names a side without saying which belongs to whom.", bloom: understand, minChars: 50 }
socratic:
  - trigger: "task:summarize:failed"
    question: { en: "Which properties appear on both sides of the diff, and which one appears on only one?", de: "Welche Eigenschaften stehen auf beiden Seiten des Diffs, und welche nur auf einer?" }
    hints: [ { en: "Lines that agree carry no marker at all; only the differences are marked.", de: "Übereinstimmende Zeilen tragen kein Zeichen; nur die Unterschiede sind markiert." }, { en: "Open the file the import line names and compare its returned object with the one the test asks for.", de: "Öffne die in der import-Zeile genannte Datei und vergleich ihr Rückgabeobjekt mit dem des Tests." }, { en: "Two marked lines carrying the same value differ in their key, so the arithmetic is already right.", de: "Zwei markierte Zeilen mit gleichem Wert unterscheiden sich im Schlüssel, die Rechnung stimmt also schon." } ]
  - trigger: "task:read-the-diff:failed"
    question: { en: "Are you sure the values differ, or is it only the spelling of a key?", de: "Bist du sicher, dass die Werte sich unterscheiden, oder nur die Schreibweise eines Schlüssels?" }
    hints: [ { en: "Read the legend line above the block before reading the block.", de: "Lies die Legendenzeile über dem Block, bevor du den Block liest." }, { en: "Put the two marked lines next to each other and compare them token by token.", de: "Stell die beiden markierten Zeilen nebeneinander und vergleich sie Zeichen für Zeichen." }, { en: "One side is produced, the other is demanded; the words in the legend say which is which.", de: "Eine Seite wird geliefert, die andere verlangt; die Legende sagt, welche welche ist." } ]
misconceptions:
  - pattern: "Expected values to be strictly deep-equal"
    question: { en: "deepEqual compares the whole object, keys included. Are you sure the numbers are wrong, or is it the spelling of a key?", de: "deepEqual vergleicht das ganze Objekt samt Schlüsseln. Bist du sicher, dass die Zahlen falsch sind, oder ist es die Schreibweise eines Schlüssels?" }
    hints: [ { en: "Lines that agree are printed without a + or - marker; only the differences carry one.", de: "Übereinstimmende Zeilen stehen ohne + oder -; nur die Unterschiede tragen eines." }, { en: "A + line and a - line with the same value but different names means a renamed property.", de: "Eine +-Zeile und eine --Zeile mit gleichem Wert, aber verschiedenem Namen, bedeuten eine umbenannte Eigenschaft." }, { en: "The contract is written at the top of src/m0/summary.js: count, total, average.", de: "Der Vertrag steht oben in src/m0/summary.js: count, total, average." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Lies einen Test als Spezifikation: finde, was er verlangt, finde, was dein Code geliefert hat, und lokalisiere den Unterschied, bevor du Code anfasst.

## Ein Test sind drei Zeilen Absicht

Öffne [`test/m0-03-read-a-test.test.js`](file:test/m0-03-read-a-test.test.js). Jede Testdatei dieses Kurses hat dieselbe Form:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../src/m0/summary.js";

test("m0-03 summarize returns count, total and average", () => {
  assert.deepEqual(summarize([3, 4, 5]), { count: 3, total: 12, average: 4 });
});
```

- `node:test` ist Nodes eigener Test-Runner. Dafür wird nichts installiert.
- `node:assert/strict` ist Nodes eigene Assertion-Bibliothek. `strict` heißt, dass Vergleiche niemals Typen umwandeln - warum das wichtig ist, siehst du in [M1](step:m1-04-equality).
- Die `import`-Zeile nennt die geprüfte Datei. Sie ist zugleich deine Landkarte: dieser Test handelt von `src/m0/summary.js` und von nichts sonst.

`assert.deepEqual` läuft durch zwei Objekte und vergleicht jede Eigenschaft. Damit ist es genauso streng bei **Namen** wie bei Werten.

## Den Fehlschlag richtig lesen

Lass ihn laufen:

```bash
node --test test/m0-03-read-a-test.test.js
```

```
✖ m0-03 summarize returns count, total and average
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected

    {
      average: 4,
      count: 3,
  +   sum: 12
  -   total: 12
    }
```

Lies den Block von der Kopfzeile abwärts:

1. `+ actual - expected` ist die Legende. **`+`-Zeilen sind, was dein Code geliefert hat. `-`-Zeilen sind, was der Test verlangt hat.**
2. `average: 4` und `count: 3` tragen kein Zeichen: die stimmen überein.
3. `+ sum: 12` gegen `- total: 12`. Die Zahl ist identisch. Der **Name** nicht.

Das ist also kein Rechenfehler. `summarize` berechnet die richtige Summe und legt sie unter dem falschen Namen ab.

## Die Aufgabe

Öffne [`src/m0/summary.js`](file:src/m0/summary.js). Der Vertrag steht oben in der Datei: das zurückgegebene Objekt hat `count`, `total` und `average`. Der Code gibt stattdessen `sum` zurück. Benenne die Eigenschaft im zurückgegebenen Objektliteral um.

Der zweite Test sichert dann einen Fall ab, den der erste nicht erreicht:

```js
assert.deepEqual(summarize([]), { count: 0, total: 0, average: 0 });
```

Eine leere Liste hat keinen Durchschnitt - `0 / 0` ergibt in JavaScript `NaN`, ein Wert, den du in [M1](step:m1-03-coercion-nan) genauer kennenlernst. Die Übung schützt diesen Fall bereits mit `count === 0 ? 0 : sum / count`, du bekommst ihn hier also geschenkt; nimm zur Kenntnis, dass dieser Schutz da ist.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `>Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m0-03-read-a-test.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m0-03-read-a-test.test.js
```

Zwei Haken, `fail 0`. Beantworte danach die Frage-Aufgabe: benennen zu können, welche Seite des Diffs deine war, ist die eigentliche Fähigkeit dieses Steps.
