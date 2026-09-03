---
id: m1-02-types-typeof
title: Typen und was typeof dir nicht sagt
bloom: apply
objectives: [javascript-web-javascript-guide-grammar-and-types]
requires: [m1-01-let-const]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m1-01-let-const]
links:
  - { step: m1-01-let-const }
  - { step: m1-03-coercion-nan }
  - { file: "src/m1/describe.js", line: 8 }
  - { file: "examples/m1-typeof.js" }
sources: [src/m1/describe.js, test/m1-02-types-typeof.test.js, examples/m1-typeof.js]
tasks:
  - id: guess-typeof
    title: Sag alle acht typeof-Ergebnisse vorher, dann führe das Beispiel aus
    check: { type: predict, prompt: { en: "examples/m1-typeof.js prints typeof for eight values, among them null, an array, a function and a BigInt. Write down all eight answers before running it.", de: "examples/m1-typeof.js gibt typeof für acht Werte aus, darunter null, ein Array, eine Funktion und ein BigInt. Schreib alle acht Antworten auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m1-typeof.js", expectExitCode: 0, expectStdout: "bigint" }, rubric: "Sets the eight predictions against the eight printed words and names which ones were wrong. Does not pass: a bare count of hits, or an answer that reports the output without saying which expectation it overturned.", bloom: evaluate }
  - id: type-name
    title: Beide typeName-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m1-02 typeName reports primitives via typeof", "m1-02 typeName distinguishes null and arrays from objects"], minPass: 2 }
  - id: typeof-limits
    title: Wo typeof aufhört
    check: { type: question, prompt: { en: "Two values answer 'object' without being one. Name them and the check for each. Two lines.", de: "Zwei Werte antworten 'object', ohne eines zu sein. Nenne sie und je die Prüfung. Zwei Zeilen." }, rubric: "Names both values and a working check for each. Does not pass: naming only one of them, offering typeof as the check for either, or an order in which the check for the second would answer before the first is tested.", bloom: understand, minChars: 40 }
socratic:
  - trigger: "task:guess-typeof:failed"
    question: { en: "Were all eight written down before the run, or did some appear afterwards?", de: "Standen alle acht vor dem Lauf geschrieben, oder kamen manche danach?" }
    hints: [ { en: "Open the example and count the calls; there are eight and each prints one word.", de: "Öffne das Beispiel und zähl die Aufrufe; es sind acht, jeder gibt ein Wort aus." }, { en: "Write your eight in a column so you can tick them off against the output line by line.", de: "Schreib deine acht in eine Spalte, damit du sie Zeile für Zeile gegen die Ausgabe abhaken kannst." }, { en: "Two of the eight answer the same word, and neither of those two values is what that word suggests.", de: "Zwei der acht antworten dasselbe Wort, und keiner dieser beiden Werte ist, was das Wort nahelegt." } ]
  - trigger: "task:type-name:failed"
    question: { en: "Which value still comes back as the generic answer when it should have its own name?", de: "Welcher Wert kommt noch mit der allgemeinen Antwort zurück, obwohl er einen eigenen Namen braucht?" }
    hints: [ { en: "Run the failing case alone and print the value next to what your function said about it.", de: "Lass den fehlschlagenden Fall allein laufen und gib den Wert neben der Aussage deiner Funktion aus." }, { en: "Two standard checks exist for exactly these two values; one is a comparison, one is a method on Array.", de: "Für genau diese zwei Werte gibt es zwei Standardprüfungen; eine ist ein Vergleich, eine eine Methode auf Array." }, { en: "The array check answers false for the other value, so the order of your two branches decides the outcome.", de: "Die Array-Prüfung antwortet für den anderen Wert false, die Reihenfolge deiner beiden Zweige entscheidet also." } ]
  - trigger: "task:typeof-limits:failed"
    question: { en: "Does your second line give a check that actually distinguishes the value, or the one that failed?", de: "Nennt deine zweite Zeile eine Prüfung, die den Wert wirklich unterscheidet, oder die gescheiterte?" }
    hints: [ { en: "The operator that answered wrongly cannot be part of the answer.", de: "Der Operator, der falsch geantwortet hat, kann nicht Teil der Antwort sein." }, { en: "For one value a strict comparison suffices; for the other the standard library provides a predicate.", de: "Bei einem Wert genügt ein strikter Vergleich; für den anderen bietet die Standardbibliothek ein Prädikat." }, { en: "Order matters because one of the two checks answers false for the other value.", de: "Die Reihenfolge zählt, weil eine der beiden Prüfungen für den anderen Wert false antwortet." } ]
misconceptions:
  - pattern: "'object' !== 'null'"
    question: { en: "typeof answered object for a value that is not an object at all. Which one is it, and which check catches it?", de: "typeof hat object für einen Wert geantwortet, der gar kein Objekt ist. Welcher ist es, und welche Prüfung fängt ihn?" }
    hints: [ { en: "typeof null has been object since 1995 and cannot be changed without breaking the web.", de: "typeof null ist seit 1995 object und kann nicht geändert werden, ohne das Web zu brechen." }, { en: "Order matters: check null first, then arrays, then fall back to typeof.", de: "Die Reihenfolge zählt: erst null, dann Arrays, dann typeof als Rückfall." }, { en: "Three branches in the right order; the operator that misled you belongs in the last one only.", de: "Drei Zweige in der richtigen Reihenfolge; der irreführende Operator gehört nur in den letzten." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Benenne die Werttypen, die JavaScript wirklich hat, nutze `typeof` für das, wofür es taugt, und greif dort zu einer anderen Prüfung, wo `typeof` nicht weiterhilft.

## Die Typen, einmal im Überblick

MDNs Kapitel [Grammar and types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types) nennt sieben primitive Typen plus Objekte:

| Typ | Beispiel | `typeof` sagt |
|---|---|---|
| number | `42`, `4.5`, `NaN` | `"number"` |
| string | `"42"` | `"string"` |
| boolean | `true` | `"boolean"` |
| undefined | eine deklarierte, nicht zugewiesene Variable | `"undefined"` |
| null | `null` | **`"object"`** |
| bigint | `9007199254740993n` | `"bigint"` |
| symbol | `Symbol("id")` | `"symbol"` |
| object | `{}`, `[]`, eine Funktion | `"object"`, `"function"` |

Zwei Zeilen sind Fallen. `typeof null` antwortet `"object"` - ein Fehler aus der ersten Implementierung von 1995, der sich nicht mehr beheben lässt, ohne bestehende Webseiten zu brechen. Und ein Array ist ein Objekt, also ist `typeof [1, 2]` ebenfalls `"object"`: `typeof` kann ein Array nicht von einem einfachen Objekt unterscheiden.

Ein drittes Detail, das man früh kennen sollte: **JavaScript hat genau einen Zahlentyp**. `1` und `1.5` sind beide Gleitkommazahlen; einen eigenen Ganzzahltyp gibt es nicht. Deshalb ist `0.1 + 0.2` nicht exakt `0.3`, und deshalb brauchen sehr große ganze Zahlen `bigint`.

## Erst vorhersagen

Öffne [`examples/m1-typeof.js`](file:examples/m1-typeof.js), schreib alle acht Antworten auf und führe es dann aus:

```bash
node examples/m1-typeof.js
```

Zähl, wie viele der acht du richtig hattest. Die zwei, die du vermutlich nicht hattest, sind genau die, um die es in der Übung geht.

## Die Aufgabe

Öffne [`src/m1/describe.js`](file:src/m1/describe.js). `typeName(value)` soll einen lesbaren Namen liefern: `"null"` für `null`, `"array"` für Arrays und sonst das, was `typeof` sagt. Im Moment gibt die Funktion nur `typeof value` zurück, deshalb besteht der erste Test und der zweite nicht.

Ergänze die zwei Prüfungen, die `typeof` nicht leisten kann, in dieser Reihenfolge:

1. `value === null` - ein strikter Vergleich, denn `null` ist ein Wert, kein Typ.
2. `Array.isArray(value)` - der standardisierte Weg, die Frage zu stellen, und der einzige verlässliche.

Die Reihenfolge zählt: `Array.isArray(null)` ist `false`, aber ein Zweig, der zuerst `typeof` fragt, hätte schon `"object"` geantwortet und die Funktion verlassen.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m1-02-types-typeof.test.js
node examples/m1-typeof.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m1-02-types-typeof.test.js
```

Beide Tests grün, und du kannst sagen, warum `typeof` Hilfe brauchte. Weiter mit [dem, was passiert, wenn Typen aufeinandertreffen](step:m1-03-coercion-nan).
