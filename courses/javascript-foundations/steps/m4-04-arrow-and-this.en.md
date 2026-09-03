---
id: m4-04-arrow-and-this
title: Arrow functions and losing this
bloom: analyze
objectives: [javascript-web-javascript-guide-functions, javascript-web-javascript-guide-working-with-objects]
requires: [m4-03-closures]
estimatedMinutes: 20
scaffold: independent
recallFrom: [m4-03-closures, m2-04-error-objects]
links:
  - { step: m4-03-closures }
  - { step: m5-01-objects }
  - { file: "src/m4/timer.js", line: 11 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions", title: "MDN: Functions" }
sources: [src/m4/timer.js, test/m4-04-arrow-and-this.test.js, src/m4/counter-factory.js]
tasks:
  - id: ticker
    title: All three ticker tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m4-04 a ticker counts when called as a method", "m4-04 tick survives being detached from its object", "m4-04 two tickers stay independent"], minPass: 3 }
  - id: this-rules
    title: What decided the value of this
    check: { type: question, prompt: { en: "The same tick function worked as t.tick() and failed as a detached reference. Explain what decides the value of this in a normal function, why a module makes the failing case a TypeError rather than a silent global, and name two fixes other than the closure you used.", de: "Dieselbe tick-Funktion funktionierte als t.tick() und scheiterte als losgelöste Referenz. Erkläre, was den Wert von this in einer normalen Funktion bestimmt, warum ein Modul den scheiternden Fall zu einem TypeError statt zu einer stillen globalen Variable macht, und nenne zwei Korrekturen außer der von dir benutzten Closure." }, rubric: "States that in a normal function this is set by the call site - the object before the dot - so a detached reference has no receiver; that module code is strict mode, where this is undefined instead of the global object, which is why the failure is TypeError: Cannot read properties of undefined rather than a silently created global; and names alternatives such as fn.bind(t), calling it as t.tick(), or wrapping it in an arrow function that closes over t.", bloom: analyze, minChars: 120 }
socratic:
  - { trigger: "task:ticker:failed", question: { en: "Which of the three tests fails - the method call, the detached call, or the independence of two tickers?", de: "Welcher der drei Tests schlägt fehl - der Methodenaufruf, der losgelöste Aufruf oder die Unabhängigkeit zweier Zähler?" }, hints: [ { en: "A method that uses this only works when it is called with a receiver in front of the dot.", de: "Eine Methode, die this benutzt, funktioniert nur, wenn sie mit einem Empfänger vor dem Punkt aufgerufen wird." }, { en: "An arrow function inside an object literal does not help: it has no this of its own and the enclosing module scope has none either.", de: "Eine Pfeilfunktion im Objektliteral hilft nicht: sie hat kein eigenes this, und der umgebende Modulbereich hat auch keines." }, { en: "Keep the count in a closure inside makeTicker and expose it through a getter; then tick never mentions this at all.", de: "Halte den Zähler in einer Closure innerhalb von makeTicker und mach ihn über einen Getter sichtbar; dann erwähnt tick this überhaupt nicht mehr." } ] }
misconceptions:
  - pattern: "Cannot read properties of undefined"
    question: { en: "this was undefined at the moment of the call. What was in front of the dot when the function ran?", de: "this war im Moment des Aufrufs undefined. Was stand beim Ausführen der Funktion vor dem Punkt?" }
    hints: [ { en: "In a normal function this is decided by the call site, not by where the function was written.", de: "In einer normalen Funktion entscheidet die Aufrufstelle über this, nicht der Ort, an dem die Funktion geschrieben wurde." }, { en: "Passing t.tick as a value drops the receiver; the function is called with nothing in front of the dot.", de: "t.tick als Wert weiterzugeben verliert den Empfänger; die Funktion wird ohne etwas vor dem Punkt aufgerufen." }, { en: "Modules are strict mode, so this is undefined rather than the global object - which is why you get an error instead of a silent global.", de: "Module sind Strict Mode, this ist deshalb undefined statt des globalen Objekts - darum bekommst du einen Fehler statt einer stillen globalen Variable." } ]
  - pattern: "1 !== 2|0 !== 1"
    question: { en: "The count did not advance, or advanced on the wrong object. Where is the state kept?", de: "Der Zähler ist nicht weitergelaufen, oder auf dem falschen Objekt. Wo wird der Zustand gehalten?" }
    hints: [ { en: "A getter must report the same variable that tick increments.", de: "Ein Getter muss dieselbe Variable melden, die tick hochzählt." }, { en: "count: 0 as a plain property is still readable and writable from outside; a closure variable is not.", de: "count: 0 als einfache Eigenschaft bleibt von außen les- und schreibbar; eine Closure-Variable nicht." }, { en: "makeTicker must create fresh state on every call, exactly as makeCounter did in m4-03.", de: "makeTicker muss bei jedem Aufruf frischen Zustand erzeugen, genau wie makeCounter in m4-03." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
---
## Learning goal

Explain what sets `this`, recognise the error a detached method produces, and choose a design in which the question does not arise.

## `this` comes from the call, not from the code

In a normal function, `this` is whatever was in front of the dot **at the moment of the call**:

```js
const t = { count: 0, tick() { this.count += 1; return this.count; } };

t.tick();            // this is t
const fn = t.tick;
fn();                // this is undefined - nothing was in front of a dot
```

Writing `t.tick` without calling it takes the function out of the object. The function is unchanged; what is missing is the receiver. This is why callbacks lose `this`: `setTimeout(t.tick, 100)` passes the function alone.

Module code is strict mode, so the failing call gives:

```
TypeError: Cannot read properties of undefined (reading 'count')
```

In old non-strict code `this` would have silently become the global object, and `count` would have been created there - a bug that produced no error at all. The `TypeError` is the improvement.

## Arrow functions have no `this` of their own

MDN's [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) chapter lists this under "no separate this": an arrow function takes `this` from the scope where it was **written**. That makes arrows right for callbacks inside a method:

```js
const obj = {
  items: [1, 2],
  total() { return this.items.reduce((sum, n) => sum + n, 0); },  // arrow keeps this
};
```

and wrong as the method itself: an arrow in an object literal inherits the module's `this`, which is `undefined`. Being able to say which of those two cases you are in is the skill.

## Three fixes, and one design

For a method that must survive detachment there are three repairs - `fn.bind(t)`, calling it as `t.tick()`, or wrapping it in an arrow that closes over `t`. All of them work, and all of them ask the caller to remember something.

The design that removes the question entirely is the one from [m4-03](step:m4-03-closures): keep the state in a closure, and `this` never appears.

```js
export function makeTicker() {
  let count = 0;
  return {
    get count() { return count; },
    tick: () => { count += 1; return count; },
  };
}
```

`get count()` is a getter - a property that runs a function when read. MDN covers getters in [Working with objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects), and [M5](step:m5-01-objects) uses them again.

## The exercise

Open [`src/m4/timer.js`](file:src/m4/timer.js). Run the test first: the method call passes and the detached call throws. Rewrite `makeTicker` so all three tests pass - including two tickers staying independent. `runTwice` must not change.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m4-04-arrow-and-this.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m4-04-arrow-and-this.test.js
```

Three green. The question task wants the rule, the reason for the error's shape, and two alternatives you did not use. That closes M4; [M5](step:m5-01-objects) is about the data these functions work on.
