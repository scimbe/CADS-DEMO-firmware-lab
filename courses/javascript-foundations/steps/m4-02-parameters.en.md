---
id: m4-02-parameters
title: Default and rest parameters
bloom: apply
objectives: [javascript-web-javascript-guide-functions]
requires: [m4-01-declare-and-call]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m4-01-declare-and-call, m2-02-truthy-falsy]
links:
  - { step: m4-01-declare-and-call }
  - { step: m4-03-closures }
  - { file: "src/m4/format.js", line: 9 }
  - { step: m2-02-truthy-falsy }
sources: [src/m4/format.js, test/m4-02-parameters.test.js, src/m2/settings.js]
tasks:
  - id: format
    title: Both formatting tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m4-02 joinWords uses the default separator when none is given", "m4-02 describeCall reports count and values from the rest parameter"], minPass: 2 }
  - id: default-trigger
    title: When a default actually fires
    check: { type: question, prompt: { en: "For which single argument value does a default fire, and what does joinWords(null, \\\"a\\\") return?", de: "Bei welchem einzigen Argumentwert greift ein Standardwert, und was liefert joinWords(null, \\\"a\\\")?" }, rubric: "Names the one value a parameter default reacts to, and gives the return for the null call with a reason that follows from it. Does not pass: naming more than one triggering value, or a return value that would require the default to have fired.", bloom: analyze, minChars: 40 }
socratic:
  - trigger: "task:format:failed"
    question: { en: "Is the separator wrong, or the number of collected arguments?", de: "Stimmt das Trennzeichen nicht oder die Anzahl gesammelter Argumente?" }
    hints: [ { en: "Call each function with no arguments at all and say what it should answer there.", de: "Ruf jede Funktion ganz ohne Argumente auf und sag, was sie dort antworten soll." }, { en: "A default belongs in the parameter list, not in a check inside the body; the test proves which by passing undefined itself.", de: "Ein Standardwert gehört in die Parameterliste, nicht in eine Prüfung im Rumpf; der Test beweist das, indem er selbst undefined übergibt." }, { en: "The second function is an arrow, and arrows lack the older way of reaching a call's arguments.", de: "Die zweite Funktion ist ein Pfeil, und Pfeilen fehlt der ältere Weg zu den Argumenten eines Aufrufs." } ]
  - trigger: "task:default-trigger:failed"
    question: { en: "Does your answer name exactly one triggering value, or a family of them?", de: "Nennt deine Antwort genau einen auslösenden Wert oder eine ganze Familie?" }
    hints: [ { en: "Call the function with each of the empty-ish values in turn and record which ones get the default.", de: "Ruf die Funktion mit jedem der leer wirkenden Werte auf und notiere, welche den Standardwert bekommen." }, { en: "Compare that list with the two other defaulting mechanisms you met in M2.", de: "Vergleich diese Liste mit den zwei anderen Standardwert-Mechanismen aus M2." }, { en: "The three mechanisms react to sets of one, two and eight values, and only one of them is in play here.", de: "Die drei Mechanismen reagieren auf Mengen von einem, zwei und acht Werten, und nur einer ist hier im Spiel." } ]
misconceptions:
  - pattern: "arguments is not defined"
    question: { en: "You reached for the arguments object inside an arrow function. What does an arrow function have instead?", de: "Du hast in einer Pfeilfunktion nach dem arguments-Objekt gegriffen. Was hat eine Pfeilfunktion stattdessen?" }
    hints: [ { en: "Arrow functions have no own arguments object - MDN's Functions chapter lists that with no separate this.", de: "Pfeilfunktionen haben kein eigenes arguments-Objekt - MDNs Kapitel Functions führt das zusammen mit 'no separate this' auf." }, { en: "A rest parameter ...args gives a real array, which arguments never was.", de: "Ein Rest-Parameter ...args liefert ein echtes Array, was arguments nie war." }, { en: "Rest parameters work in every function form, so prefer them everywhere.", de: "Rest-Parameter funktionieren in jeder Funktionsform, nimm sie deshalb überall." } ]
  - pattern: "', ' !== undefined|undefined !== "
    question: { en: "The separator came through as undefined. Was a default written for that parameter at all?", de: "Das Trennzeichen kam als undefined an. Wurde für diesen Parameter überhaupt ein Standardwert geschrieben?" }
    hints: [ { en: "A missing argument arrives as undefined; that is exactly what a default parameter reacts to.", de: "Ein fehlendes Argument kommt als undefined an; genau darauf reagiert ein Standardparameter." }, { en: "The test passes undefined explicitly to prove the default is a parameter default, not a check in the body.", de: "Der Test übergibt undefined ausdrücklich, um zu zeigen, dass der Standardwert ein Parameter-Standardwert ist und keine Prüfung im Rumpf." }, { en: "Write it as separator = \", \" in the parameter list.", de: "Schreib es als separator = \", \" in die Parameterliste." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Give a function a sensible default without swallowing the caller's value, and collect a variable number of arguments into a real array.

## Default parameters

```js
function joinWords(separator = ", ", ...words) { … }
```

A default parameter fires for exactly one input: **`undefined`**. That is what an omitted argument arrives as, and it is also what a caller can pass explicitly - the tests do that on purpose, to prove the default lives in the parameter list rather than in an `if` inside the body.

Compare that with [m2-02](step:m2-02-truthy-falsy). Three mechanisms, three different sets of values they replace:

| Written as | Replaces |
|---|---|
| `x = default` in the parameter list | `undefined` only |
| `x ?? default` | `undefined` and `null` |
| `x \|\| default` | every falsy value, including `0`, `""`, `false` |

So `joinWords(null, "a")` does **not** use `", "`. `null` is not `undefined`, so it is taken as the separator. Being able to say that out loud is the second task.

Defaults are evaluated at call time, left to right, and may refer to earlier parameters: `function f(a, b = a * 2)` is valid and computes a fresh `b` on every call.

## Rest parameters

`...words` in the last position collects every remaining argument into a **real array**:

```js
describeCall("a", "b", "c")   //  args is ["a", "b", "c"]
```

The old way was the `arguments` object, and MDN's [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) chapter explains why it should stay old: `arguments` is array-like but not an array, so it has no `map`, `filter` or `join`. Worse, **arrow functions have no `arguments` object at all** - reaching for it inside one gives `ReferenceError: arguments is not defined`. Rest parameters work in every function form.

## The exercise

Open [`src/m4/format.js`](file:src/m4/format.js). Both functions throw; write them.

- `joinWords(separator, ...words)` joins the words with the separator, defaulting to `", "`. `joinWords()` is `""`.
- `describeCall(...args)` returns `"3 args: a|b|c"`. It is an arrow function, so the rest parameter is your only option.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m4-02-parameters.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m4-02-parameters.test.js
```

Both green. The question task is about the difference between three kinds of default - a distinction that has now come up twice and will decide real bugs. Next: [functions that remember](step:m4-03-closures).
