---
id: m4-01-declare-and-call
title: Declarations, expressions and when a name exists
bloom: understand
objectives: [javascript-web-javascript-guide-functions]
requires: [m3-04-break-continue]
estimatedMinutes: 15
scaffold: worked
recallFrom: [m1-01-let-const, m0-03-modules]
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
    check: { type: question, prompt: { en: "No test ran: the module itself threw. Explain why calling buildBanner at the top of the file was fine even though it is defined below, while reading decorate from inside it was not.", de: "Kein Test lief: das Modul selbst hat geworfen. Erkläre, warum der Aufruf von buildBanner am Dateianfang in Ordnung war, obwohl es weiter unten definiert ist, während das Lesen von decorate darin nicht in Ordnung war." }, rubric: "States that a function declaration is hoisted complete with its body, so buildBanner is callable anywhere in the module, whereas a function expression assigned to a const is only a binding in the temporal dead zone until its line runs - so calling buildBanner before that line reaches decorate too early. Connects it to m1-01: same rule, now with a whole module failing to load.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:banner:failed", question: { en: "Which name did the ReferenceError mention, and which line first initialises it?", de: "Welchen Namen nannte der ReferenceError, und welche Zeile initialisiert ihn zuerst?" }, hints: [ { en: "The module-level line export const DEFAULT_BANNER = buildBanner(\"world\") runs the moment the file loads.", de: "Die Modulzeile export const DEFAULT_BANNER = buildBanner(\"world\") läuft in dem Moment, in dem die Datei geladen wird." }, { en: "At that moment decorate has not been initialised yet, so buildBanner cannot use it.", de: "In diesem Moment ist decorate noch nicht initialisiert, buildBanner kann es also nicht benutzen." }, { en: "Move the const decorate line above the DEFAULT_BANNER line; leave the arrow function an arrow function.", de: "Verschiebe die Zeile const decorate über die DEFAULT_BANNER-Zeile; lass die Pfeilfunktion eine Pfeilfunktion." } ] }
misconceptions:
  - pattern: "Cannot access .* before initialization"
    question: { en: "Which line runs first when this module loads, and which binding does it need that does not exist yet?", de: "Welche Zeile läuft beim Laden dieses Moduls zuerst, und welche Bindung braucht sie, die es noch nicht gibt?" }
    hints: [ { en: "Module bodies run top to bottom on load; a top-level call happens before the lines below it.", de: "Modulrümpfe laufen beim Laden von oben nach unten; ein Aufruf auf oberster Ebene passiert vor den Zeilen darunter." }, { en: "function declarations are hoisted with their body; const arrow functions are not.", de: "function-Deklarationen werden mitsamt Rumpf hochgezogen; const-Pfeilfunktionen nicht." }, { en: "This is the temporal dead zone from m1-01, one file larger.", de: "Das ist die Temporal Dead Zone aus m1-01, eine Dateigröße größer." } ]
  - pattern: "is not a function"
    question: { en: "A name existed but did not hold a function when it was called. What did it hold?", de: "Ein Name existierte, hielt beim Aufruf aber keine Funktion. Was hielt er?" }
    hints: [ { en: "var declarations hoist as undefined, so calling one too early gives 'is not a function' rather than a ReferenceError.", de: "var-Deklarationen werden als undefined hochgezogen, ein zu früher Aufruf ergibt also 'is not a function' statt eines ReferenceError." }, { en: "This course uses let and const only; if you introduced a var, that is the difference you are seeing.", de: "Dieser Kurs benutzt nur let und const; wenn du ein var eingeführt hast, ist das der Unterschied, den du siehst." }, { en: "Keep the declarations as they are and change only their order.", de: "Lass die Deklarationen, wie sie sind, und ändere nur ihre Reihenfolge." } ]
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

That is why this step's exercise fails in a way you have not seen since [m0-03](step:m0-03-modules): **no test runs at all**. The module throws while loading, so the test file never gets its imports. A crossed-out file name with no individual test results is the signature.

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

## How you know it worked

Three tests green. Then explain, in the question task, why one of the two names was reachable from above and the other was not. Next: [what a function does with its arguments](step:m4-02-parameters).
