---
id: m4-01-declare-and-call
title: Declarations, expressions and when a name exists
bloom: understand
objectives: [javascript-web-javascript-guide-functions]
requires: [m3-04-break-continue]
estimatedMinutes: 15
scaffold: worked
recallFrom: [m1-01-let-const, m0-04-modules]
links:
  - { step: m3-04-break-continue }
  - { step: m4-02-parameters }
  - { file: "src/m4/greet.js", line: 12 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions", title: "MDN: Functions" }
sources: [src/m4/greet.js, test/m4-01-declare-and-call.test.js, src/m1/counter.js]
tasks:
  - id: banner
    title: All three banner tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m4-01 buildBanner decorates the salute", "m4-01 the module-level banner is computed at load time", "m4-01 bannerLength counts the finished banner"], minPass: 3 }
  - id: hoisting
    title: Why the whole file refused to load
    check: { type: question, prompt: { en: "One name was reachable from the top of the file and one was not. Why? Two sentences.", de: "Ein Name war vom Dateianfang erreichbar, einer nicht. Warum? Zwei Sätze." }, rubric: "Distinguishes a form that is available in full throughout its scope from a form that only becomes readable when its own line has run, and connects that to the order module statements execute in. Does not pass: an answer that says one is a function and the other is not, or one that names the fix without saying what differs between the two forms.", bloom: analyze, minChars: 50 }
socratic:
  - trigger: "task:banner:failed"
    question: { en: "Which name did the failure mention, and which line first gives that name a value?", de: "Welchen Namen nannte der Fehlschlag, und welche Zeile gibt ihm zuerst einen Wert?" }
    hints: [ { en: "No test ran at all, so look at what the file does while it is being loaded, not at any function.", de: "Kein Test lief, sieh also an, was die Datei beim Laden tut, nicht eine Funktion." }, { en: "Find the statement at the top level that calls something, and list what it needs to be ready.", de: "Finde die Anweisung auf oberster Ebene, die etwas aufruft, und liste auf, was dafür bereit sein muss." }, { en: "Exactly one thing it needs is not ready yet, and only its position has to change.", de: "Genau eines davon ist noch nicht bereit, und nur seine Position muss sich ändern." } ]
  - trigger: "task:hoisting:failed"
    question: { en: "Does your answer explain the difference between the two forms, or only which one failed?", de: "Erklärt deine Antwort den Unterschied der beiden Formen, oder nur, welche scheiterte?" }
    hints: [ { en: "Try calling each of the two from the very first line of a scratch file and note which complains.", de: "Ruf beide von der ersten Zeile einer Testdatei aus auf und notiere, welche sich beschwert." }, { en: "One of them is complete before any line runs; the other is only a name until its line runs.", de: "Eine ist vollständig, bevor eine Zeile läuft; die andere ist bis zu ihrer Zeile nur ein Name." }, { en: "You met the same rule in M1 on a single variable; here it takes a whole file with it.", de: "Dieselbe Regel hast du in M1 an einer Variable gesehen; hier reißt sie eine ganze Datei mit." } ]
misconceptions:
  - pattern: "Cannot access .* before initialization"
    question: { en: "Which line runs first when this module loads, and which binding does it need that does not exist yet?", de: "Welche Zeile läuft beim Laden dieses Moduls zuerst, und welche Bindung braucht sie, die es noch nicht gibt?" }
    hints: [ { en: "Module bodies run top to bottom on load; a top-level call happens before the lines below it.", de: "Modulrümpfe laufen beim Laden von oben nach unten; ein Aufruf auf oberster Ebene passiert vor den Zeilen darunter." }, { en: "function declarations are hoisted with their body; const arrow functions are not.", de: "function-Deklarationen werden mitsamt Rumpf hochgezogen; const-Pfeilfunktionen nicht." }, { en: "This is the temporal dead zone from m1-01, one file larger.", de: "Das ist die Temporal Dead Zone aus m1-01, eine Dateigröße größer." } ]
  - pattern: "is not a function"
    question: { en: "A name existed but did not hold a function when it was called. What did it hold?", de: "Ein Name existierte, hielt beim Aufruf aber keine Funktion. Was hielt er?" }
    hints: [ { en: "var declarations hoist as undefined, so calling one too early gives 'is not a function' rather than a ReferenceError.", de: "var-Deklarationen werden als undefined hochgezogen, ein zu früher Aufruf ergibt also 'is not a function' statt eines ReferenceError." }, { en: "This course uses let and const only; if you introduced a var, that is the difference you are seeing.", de: "Dieser Kurs benutzt nur let und const; wenn du ein var eingeführt hast, ist das der Unterschied, den du siehst." }, { en: "Keep the declarations as they are and change only their order.", de: "Lass die Deklarationen, wie sie sind, und ändere nur ihre Reihenfolge." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Know the difference between a function declaration and a function expression, and predict which names exist at which point while a module is loading.

## Two ways to make a function

```js
function salute(name) { … }            // declaration
const decorate = (text) => …;          // expression assigned to a const
```

They produce the same kind of value. They differ in **when the name becomes usable**, and MDN's [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) chapter puts it plainly:

- A **declaration** is hoisted together with its body. The name is callable anywhere in the enclosing scope, including lines above the definition.
- A **function expression** is a value assigned to a binding. With `const` or `let`, that binding is in the temporal dead zone from [M1](step:m1-01-let-const) until its own line runs.

So this works:

```js
console.log(salute("Ada"));
function salute(n) { return "Hi, " + n; }
```

and this does not:

```js
console.log(decorate("x"));
const decorate = (t) => t;   // ReferenceError: Cannot access 'decorate' before initialization
```

## Module bodies run top to bottom

A module's top-level statements execute in order when the file is loaded. A top-level `const X = f()` therefore calls `f` *at that moment*, with only the bindings above it initialised - even if `f` itself is a hoisted declaration defined lower down.

That is why this step's exercise fails in a way you have not seen since [m0-04](step:m0-04-modules): **no test runs at all**. The module throws while loading, so the test file never gets its imports. A crossed-out file name with no individual test results is the signature.

## The exercise

Open [`src/m4/greet.js`](file:src/m4/greet.js). Run the test first and read the failure:

```bash
node --test test/m4-01-declare-and-call.test.js
```

```
ReferenceError: Cannot access 'decorate' before initialization
```

`buildBanner` is a declaration, so calling it on the first line is fine. Inside it, `decorate` is a `const` arrow function defined further down, and at load time that line has not run yet.

Fix it by moving exactly what has to move. Do not convert the arrow function into a declaration: the point is to see that ordering, not keyword choice, is what this error is about.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m4-01-declare-and-call.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

Three tests green. Then explain, in the question task, why one of the two names was reachable from above and the other was not. Next: [what a function does with its arguments](step:m4-02-parameters).
