---
id: m0-02-read-a-test
title: Einen Test lesen
bloom: understand
objectives: [js.tooling.node-test]
requires: [m0-01-first-run]
estimatedMinutes: 12
scaffold: worked
links:
  - { step: m0-01-first-run }
  - { step: m0-03-modules }
  - { file: "test/m0-02-read-a-test.test.js" }
  - { file: "src/m0/summary.js", line: 9 }
sources: [test/m0-02-read-a-test.test.js, src/m0/summary.js, README.md]
tasks:
  - id: summarize
    title: Beide summarize-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m0-02 summarize returns count, total and average", "m0-02 summarize of an empty array has average 0"], minPass: 2 }
  - id: read-the-diff
    title: Erkläre den Diff, den der Test ausgegeben hat
    check: { type: question, prompt: { en: "The failing test printed a block with '+ actual' and '- expected' lines. Which side was your code, which side was the test, and what exactly was different - a value, or a name?", de: "Der fehlschlagende Test hat einen Block mit '+ actual' und '- expected' ausgegeben. Welche Seite war dein Code, welche der Test, und was genau war anders - ein Wert oder ein Name?" }, rubric: "States that '+ actual' is the value the code produced and '- expected' is what the test demanded, and identifies the difference as the property NAME (sum instead of total) rather than a wrong number - the value 12 was correct on both sides.", bloom: understand, minChars: 40 }
socratic:
  - { trigger: "task:summarize:failed", question: { en: "Compare the two objects in the diff line by line. Which properties appear on both sides, and which one appears on only one side?", de: "Vergleiche die beiden Objekte im Diff Zeile für Zeile. Welche Eigenschaften stehen auf beiden Seiten, und welche nur auf einer?" }, hints: [ { en: "count and average agree. The third property does not.", de: "count und average stimmen überein. Die dritte Eigenschaft nicht." }, { en: "The test asks for a property named total; the code builds one named sum.", de: "Der Test verlangt eine Eigenschaft namens total; der Code baut eine namens sum." }, { en: "Rename the property in the returned object literal in src/m0/summary.js; the local variable may keep its name.", de: "Benenne die Eigenschaft im zurückgegebenen Objektliteral in src/m0/summary.js um; die lokale Variable darf ihren Namen behalten." } ] }
misconceptions:
  - pattern: "Expected values to be strictly deep-equal"
    question: { en: "deepEqual compares the whole object, keys included. Are you sure the numbers are wrong, or is it the spelling of a key?", de: "deepEqual vergleicht das ganze Objekt samt Schlüsseln. Bist du sicher, dass die Zahlen falsch sind, oder ist es die Schreibweise eines Schlüssels?" }
    hints: [ { en: "Lines that agree are printed without a + or - marker; only the differences carry one.", de: "Übereinstimmende Zeilen stehen ohne + oder -; nur die Unterschiede tragen eines." }, { en: "A + line and a - line with the same value but different names means a renamed property.", de: "Eine +-Zeile und eine --Zeile mit gleichem Wert, aber verschiedenem Namen, bedeuten eine umbenannte Eigenschaft." }, { en: "The contract is written at the top of src/m0/summary.js: count, total, average.", de: "Der Vertrag steht oben in src/m0/summary.js: count, total, average." } ]
---
## Lernziel

Lies einen Test als Spezifikation: finde, was er verlangt, finde, was dein Code geliefert hat, und lokalisiere den Unterschied, bevor du Code anfasst.

## Ein Test sind drei Zeilen Absicht

Öffne [`test/m0-02-read-a-test.test.js`](file:test/m0-02-read-a-test.test.js). Jede Testdatei dieses Kurses hat dieselbe Form:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../src/m0/summary.js";

test("m0-02 summarize returns count, total and average", () => {
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
node --test test/m0-02-read-a-test.test.js
```

```
✖ m0-02 summarize returns count, total and average
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

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m0-02-read-a-test.test.js
```

Zwei Haken, `fail 0`. Beantworte danach die Frage-Aufgabe: benennen zu können, welche Seite des Diffs deine war, ist die eigentliche Fähigkeit dieses Steps.
