---
id: m4-03-closures
title: Closures, and what a loop variable captures
bloom: analyze
objectives: [javascript-web-javascript-guide-functions]
requires: [m4-02-parameters]
estimatedMinutes: 20
scaffold: faded
recallFrom: [m4-02-parameters, m1-01-let-const]
links:
  - { step: m4-02-parameters }
  - { step: m4-04-arrow-and-this }
  - { file: "src/m4/counter-factory.js", line: 8 }
  - { file: "examples/m4-closure-loop.js" }
sources: [src/m4/counter-factory.js, test/m4-03-closures.test.js, examples/m4-closure-loop.js]
tasks:
  - id: guess-capture
    title: Predict what the loop closures return
    check: { type: predict, prompt: { en: "examples/m4-closure-loop.js builds three functions in a var loop and three in a let loop, then calls them all. Write down both arrays and the three numbers from the counter section before running it.", de: "examples/m4-closure-loop.js baut drei Funktionen in einer var-Schleife und drei in einer let-Schleife und ruft dann alle auf. Schreib beide Arrays und die drei Zahlen aus dem Zähler-Abschnitt auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m4-closure-loop.js", expectExitCode: 0, expectStdout: "3, 3, 3" }, rubric: "Recognises that the var loop has one binding shared by all three closures, so all of them see the final value 3, while the let loop creates a fresh binding per pass and yields 0, 1, 2; and that two calls to the same factory produce independent counters.", bloom: evaluate }
  - id: counters
    title: All three closure tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m4-03 a counter keeps its own state", "m4-03 two counters do not share state", "m4-03 every adder captures its own number"], minPass: 3 }
socratic:
  - { trigger: "task:counters:failed", question: { en: "Do the two counters interfere with each other, or do all the adders give the same answer?", de: "Stören sich die beiden Zähler gegenseitig, oder liefern alle Adder dieselbe Antwort?" }, hints: [ { en: "makeCounter must declare its state inside the function, so each call gets its own.", de: "makeCounter muss seinen Zustand innerhalb der Funktion deklarieren, jeder Aufruf bekommt so seinen eigenen." }, { en: "next() returns the current value and then increments; value() only reads.", de: "next() liefert den aktuellen Wert und zählt danach hoch; value() liest nur." }, { en: "In makeAdders the index is declared once outside the loop, so all three closures share it. Declare it in the loop head with let.", de: "In makeAdders ist der Index einmal außerhalb der Schleife deklariert, alle drei Closures teilen ihn sich. Deklariere ihn mit let im Schleifenkopf." } ] }
misconceptions:
  - pattern: "NaN"
    question: { en: "An adder returned NaN. Which value did it read out of the list, and what was the index at the moment it was called?", de: "Ein Adder hat NaN geliefert. Welchen Wert hat er aus der Liste gelesen, und welchen Index hatte er im Moment des Aufrufs?" }
    hints: [ { en: "The closures run after the loop has finished, so a shared index has already reached list.length.", de: "Die Closures laufen nach dem Ende der Schleife, ein geteilter Index steht dann schon auf list.length." }, { en: "list[list.length] is undefined, and undefined + 5 is NaN - the silent coercion from M1 again.", de: "list[list.length] ist undefined, und undefined + 5 ergibt NaN - wieder die stille Umwandlung aus M1." }, { en: "A binding declared with let in the for head is created fresh for every pass, which is exactly what is needed.", de: "Eine mit let im for-Kopf deklarierte Bindung wird für jeden Durchlauf neu erzeugt, und genau das wird gebraucht." } ]
  - pattern: "1 !== 0|2 !== 0"
    question: { en: "One counter saw the other one's changes. Where does the state live?", de: "Ein Zähler hat die Änderungen des anderen gesehen. Wo liegt der Zustand?" }
    hints: [ { en: "State declared outside makeCounter is shared by every counter it ever returns.", de: "Zustand, der außerhalb von makeCounter deklariert ist, wird von jedem zurückgegebenen Zähler geteilt." }, { en: "Declare the variable inside the factory function; each call then creates a new one.", de: "Deklariere die Variable innerhalb der Fabrikfunktion; jeder Aufruf erzeugt dann eine neue." }, { en: "That private-per-call variable is what a closure preserves after the factory returns.", de: "Genau diese pro Aufruf private Variable bewahrt eine Closure, nachdem die Fabrik zurückgekehrt ist." } ]
---
## Learning goal

Explain what a returned function still has access to, and predict which binding a closure captured when the surrounding loop has long finished.

## A closure is a function plus the scope it was born in

MDN's [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) chapter defines it directly: a nested function keeps access to the variables of the function that created it, even after that outer function has returned.

```js
export function makeCounter(start) {
  let current = start;                 // private to this call
  return {
    next() { return current++; },
    value() { return current; },
  };
}
```

`current` is not a property of the returned object and cannot be reached from outside. It survives because the two functions still refer to it. Call `makeCounter` twice and you get two independent `current` variables - the closure is created per call, not per function.

That is the useful half. The confusing half is which *binding* got captured.

## One binding, or one per pass

```js
for (var a = 0; a < 3; a++) fns.push(() => a);   // [3, 3, 3]
for (let b = 0; b < 3; b++) fns.push(() => b);   // [0, 1, 2]
```

`var` creates **one** binding for the whole function, so all three closures refer to the same `a`, and by the time they run it is 3. `let` in a `for` head creates a **fresh binding for every pass**, so each closure has its own `b`. That is one of the strongest reasons the language moved to `let`, and it is why [M1](step:m1-01-let-const) told you to leave `var` alone.

The same trap appears without `var` at all: declaring `let i` **above** the loop and only assigning it in the head gives one shared binding again, which is exactly the bug in this exercise.

Predict [`examples/m4-closure-loop.js`](file:examples/m4-closure-loop.js), then run it:

```bash
node examples/m4-closure-loop.js
```

## The exercise

Open [`src/m4/counter-factory.js`](file:src/m4/counter-factory.js):

- `makeCounter(start)` throws; write it. `next()` returns the current value and then increments, `value()` reads. Two counters must not share state.
- `makeAdders(list)` builds one function per number, but declares its index once outside the loop. All three closures then see the final index, `list[i]` is `undefined`, and `undefined + 5` is `NaN` - [M1](step:m1-03-coercion-nan) arriving through a closure.

## How you know it worked

```bash
node --test test/m4-03-closures.test.js
```

Three green, and your prediction recorded. Next, the other thing a function carries from its call site: [`this`](step:m4-04-arrow-and-this).
