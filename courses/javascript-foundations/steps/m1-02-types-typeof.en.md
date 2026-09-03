---
id: m1-02-types-typeof
title: Types and what typeof will not tell you
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
    title: Predict all eight typeof results, then run the example
    check: { type: predict, prompt: { en: "examples/m1-typeof.js prints typeof for eight values, among them null, an array, a function and a BigInt. Write down all eight answers before running it.", de: "examples/m1-typeof.js gibt typeof für acht Werte aus, darunter null, ein Array, eine Funktion und ein BigInt. Schreib alle acht Antworten auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m1-typeof.js", expectExitCode: 0, expectStdout: "bigint" }, rubric: "Compares prediction and output and names the two results that surprise almost everyone: typeof null is object (a bug preserved for backwards compatibility) and typeof an array is also object, so typeof alone cannot distinguish them.", bloom: evaluate }
  - id: type-name
    title: Both typeName tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m1-02 typeName reports primitives via typeof", "m1-02 typeName distinguishes null and arrays from objects"], minPass: 2 }
  - id: typeof-limits
    title: Where typeof stops
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
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Name the value types JavaScript actually has, use `typeof` for what it is good at, and reach for a different check where `typeof` cannot help.

## The types, once

MDN's [Grammar and types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types) chapter lists seven primitive types plus objects:

| Type | Example | `typeof` says |
|---|---|---|
| number | `42`, `4.5`, `NaN` | `"number"` |
| string | `"42"` | `"string"` |
| boolean | `true` | `"boolean"` |
| undefined | a variable declared and not assigned | `"undefined"` |
| null | `null` | **`"object"`** |
| bigint | `9007199254740993n` | `"bigint"` |
| symbol | `Symbol("id")` | `"symbol"` |
| object | `{}`, `[]`, a function | `"object"`, `"function"` |

Two rows are traps. `typeof null` answers `"object"` - a bug from the first implementation in 1995 that can no longer be fixed without breaking existing web pages. And an array is an object, so `typeof [1, 2]` is `"object"` too: `typeof` cannot tell an array from a plain object.

A third detail worth knowing early: **JavaScript has one number type**. `1` and `1.5` are both doubles; there is no separate integer type. That is why `0.1 + 0.2` is not exactly `0.3`, and why very large whole numbers need `bigint`.

## Predict first

Open [`examples/m1-typeof.js`](file:examples/m1-typeof.js), write down all eight answers, then run it:

```bash
node examples/m1-typeof.js
```

Count how many of the eight you got right. The two you probably did not are exactly the ones the exercise is about.

## The exercise

Open [`src/m1/describe.js`](file:src/m1/describe.js). `typeName(value)` should answer with a readable name: `"null"` for `null`, `"array"` for arrays, and otherwise whatever `typeof` says. Right now it returns `typeof value` and nothing else, so the first test passes and the second does not.

Add the two checks `typeof` cannot make, in this order:

1. `value === null` - a strict comparison, because `null` is a value, not a type.
2. `Array.isArray(value)` - the standard way to ask, and the only reliable one.

Order matters: `Array.isArray(null)` is `false`, but a `typeof`-first branch would already have answered `"object"` and left the function.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m1-02-types-typeof.test.js
node examples/m1-typeof.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m1-02-types-typeof.test.js
```

Both tests green, and you can say why `typeof` needed help. Next, [what happens when types meet](step:m1-03-coercion-nan).
