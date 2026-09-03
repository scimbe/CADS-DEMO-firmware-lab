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
    check: { type: question, prompt: { en: "A default parameter fires for exactly one argument value. Which one - and how does that differ from the || default you replaced in m2-02? Say what joinWords(null, \"a\") returns and why.", de: "Ein Standardparameter greift bei genau einem Argumentwert. Bei welchem - und wie unterscheidet sich das von dem ||-Standardwert, den du in m2-02 ersetzt hast? Sag, was joinWords(null, \"a\") liefert und warum." }, rubric: "States that a default parameter applies only when the argument is undefined - including when it is omitted entirely - and not for null, 0, \"\" or false; contrasts that with || which replaces every falsy value and with ?? which also covers null. Concludes that joinWords(null, \"a\") uses null as the separator, giving \"a\" for one word and joining with the string 'null' for more.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:format:failed", question: { en: "Is the separator wrong, or the count of the collected arguments?", de: "Stimmt das Trennzeichen nicht, oder die Anzahl der gesammelten Argumente?" }, hints: [ { en: "A default is written in the parameter list itself: function joinWords(separator = \", \", ...words)", de: "Ein Standardwert steht in der Parameterliste selbst: function joinWords(separator = \", \", ...words)" }, { en: "The rest parameter collects everything after it into a real array, so words.join(separator) does the work.", de: "Der Rest-Parameter sammelt alles Folgende in ein echtes Array, words.join(separator) erledigt also die Arbeit." }, { en: "describeCall is an arrow function and has no arguments object; use its rest parameter args.", de: "describeCall ist eine Pfeilfunktion und hat kein arguments-Objekt; nutze ihren Rest-Parameter args." } ] }
misconceptions:
  - pattern: "arguments is not defined"
    question: { en: "You reached for the arguments object inside an arrow function. What does an arrow function have instead?", de: "Du hast in einer Pfeilfunktion nach dem arguments-Objekt gegriffen. Was hat eine Pfeilfunktion stattdessen?" }
    hints: [ { en: "Arrow functions have no own arguments object - MDN's Functions chapter lists that with no separate this.", de: "Pfeilfunktionen haben kein eigenes arguments-Objekt - MDNs Kapitel Functions führt das zusammen mit 'no separate this' auf." }, { en: "A rest parameter ...args gives a real array, which arguments never was.", de: "Ein Rest-Parameter ...args liefert ein echtes Array, was arguments nie war." }, { en: "Rest parameters work in every function form, so prefer them everywhere.", de: "Rest-Parameter funktionieren in jeder Funktionsform, nimm sie deshalb überall." } ]
  - pattern: "', ' !== undefined|undefined !== "
    question: { en: "The separator came through as undefined. Was a default written for that parameter at all?", de: "Das Trennzeichen kam als undefined an. Wurde für diesen Parameter überhaupt ein Standardwert geschrieben?" }
    hints: [ { en: "A missing argument arrives as undefined; that is exactly what a default parameter reacts to.", de: "Ein fehlendes Argument kommt als undefined an; genau darauf reagiert ein Standardparameter." }, { en: "The test passes undefined explicitly to prove the default is a parameter default, not a check in the body.", de: "Der Test übergibt undefined ausdrücklich, um zu zeigen, dass der Standardwert ein Parameter-Standardwert ist und keine Prüfung im Rumpf." }, { en: "Write it as separator = \", \" in the parameter list.", de: "Schreib es als separator = \", \" in die Parameterliste." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
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
