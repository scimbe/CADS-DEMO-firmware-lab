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
    check: { type: predict, prompt: { en: "examples/m1-typeof.js prints typeof for eight values, among them null, an array, a function and a BigInt. Write down all eight answers before running it.", de: "examples/m1-typeof.js gibt typeof für acht Werte aus, darunter null, ein Array, eine Funktion und ein BigInt. Schreib alle acht Antworten auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m1-typeof.js", expectExitCode: 0, expectStdout: "bigint" }, rubric: "Compares prediction and output and names the two results that surprise almost everyone: typeof null is object (a bug preserved for backwards compatibility) and typeof an array is also object, so typeof alone cannot distinguish them.", bloom: evaluate }
  - id: type-name
    title: Beide typeName-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m1-02 typeName reports primitives via typeof", "m1-02 typeName distinguishes null and arrays from objects"], minPass: 2 }
  - id: typeof-limits
    title: Wo typeof aufhört
    check: { type: question, prompt: { en: "typeof answered 'object' for two values that are not plain objects. Name both, say which check identifies each, and explain why the order of the two checks matters.", de: "typeof hat für zwei Werte 'object' geantwortet, die keine einfachen Objekte sind. Nenne beide, sag, welche Prüfung jeden erkennt, und erkläre, warum die Reihenfolge der beiden Prüfungen wichtig ist." }, rubric: "Names null and arrays; identifies value === null and Array.isArray(value) as the checks; explains that the null check has to come first because Array.isArray(null) is false and a branch that consulted typeof first would already have answered 'object' and left the function.", bloom: understand, minChars: 60 }
socratic:
  - { trigger: "task:type-name:failed", question: { en: "Which value is still reported as object when it should have its own name?", de: "Welcher Wert wird noch als object gemeldet, obwohl er einen eigenen Namen bekommen soll?" }, hints: [ { en: "typeof cannot help here; both null and arrays answer object.", de: "typeof hilft hier nicht; sowohl null als auch Arrays antworten mit object." }, { en: "Test for null with a strict comparison, value === null, before anything else.", de: "Prüfe auf null mit einem strikten Vergleich, value === null, noch vor allem anderen." }, { en: "Arrays have their own test: Array.isArray(value).", de: "Arrays haben ihren eigenen Test: Array.isArray(value)." } ] }
misconceptions:
  - pattern: "object..!== ..null"
    question: { en: "typeof answered object for a value that is not an object at all. Which one is it, and which check catches it?", de: "typeof hat object für einen Wert geantwortet, der gar kein Objekt ist. Welcher ist es, und welche Prüfung fängt ihn?" }
    hints: [ { en: "typeof null has been object since 1995 and cannot be changed without breaking the web.", de: "typeof null ist seit 1995 object und kann nicht geändert werden, ohne das Web zu brechen." }, { en: "Order matters: check null first, then arrays, then fall back to typeof.", de: "Die Reihenfolge zählt: erst null, dann Arrays, dann typeof als Rückfall." }, { en: "return value === null ? \"null\" : Array.isArray(value) ? \"array\" : typeof value;", de: "return value === null ? \"null\" : Array.isArray(value) ? \"array\" : typeof value;" } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
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
