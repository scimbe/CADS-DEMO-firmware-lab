---
id: m4-03-closures
title: Closures und was eine Schleifenvariable einfängt
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
    title: Sag vorher, was die Schleifen-Closures liefern
    check: { type: predict, prompt: { en: "examples/m4-closure-loop.js builds three functions in a var loop and three in a let loop, then calls them all. Write down both arrays and the three numbers from the counter section before running it.", de: "examples/m4-closure-loop.js baut drei Funktionen in einer var-Schleife und drei in einer let-Schleife und ruft dann alle auf. Schreib beide Arrays und die drei Zahlen aus dem Zähler-Abschnitt auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m4-closure-loop.js", expectExitCode: 0, expectStdout: "3, 3, 3" }, rubric: "Recognises that the var loop has one binding shared by all three closures, so all of them see the final value 3, while the let loop creates a fresh binding per pass and yields 0, 1, 2; and that two calls to the same factory produce independent counters.", bloom: evaluate }
  - id: counters
    title: Alle drei Closure-Tests sind grün
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
## Lernziel

Erkläre, worauf eine zurückgegebene Funktion weiterhin zugreifen kann, und sag vorher, welche Bindung eine Closure eingefangen hat, wenn die umgebende Schleife längst beendet ist.

## Eine Closure ist eine Funktion plus der Gültigkeitsbereich, in dem sie entstand

MDNs Kapitel [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) definiert es direkt: eine verschachtelte Funktion behält Zugriff auf die Variablen der Funktion, die sie erzeugt hat, auch nachdem diese äußere Funktion zurückgekehrt ist.

```js
export function makeCounter(start) {
  let current = start;                 // privat für diesen Aufruf
  return {
    next() { return current++; },
    value() { return current; },
  };
}
```

`current` ist keine Eigenschaft des zurückgegebenen Objekts und von außen nicht erreichbar. Es überlebt, weil die beiden Funktionen sich noch darauf beziehen. Ruf `makeCounter` zweimal auf, und du bekommst zwei unabhängige `current`-Variablen - die Closure entsteht pro Aufruf, nicht pro Funktion.

Das ist die nützliche Hälfte. Die verwirrende Hälfte ist, welche *Bindung* eingefangen wurde.

## Eine Bindung oder eine pro Durchlauf

```js
for (var a = 0; a < 3; a++) fns.push(() => a);   // [3, 3, 3]
for (let b = 0; b < 3; b++) fns.push(() => b);   // [0, 1, 2]
```

`var` erzeugt **eine** Bindung für die ganze Funktion, alle drei Closures beziehen sich also auf dasselbe `a`, und wenn sie laufen, steht es auf 3. `let` im `for`-Kopf erzeugt **für jeden Durchlauf eine frische Bindung**, jede Closure hat also ihr eigenes `b`. Das ist einer der stärksten Gründe für den Wechsel zu `let`, und deshalb sagt [M1](step:m1-01-let-const), dass du `var` liegen lassen sollst.

Dieselbe Falle gibt es ganz ohne `var`: ein `let i` **oberhalb** der Schleife zu deklarieren und im Kopf nur zuzuweisen ergibt wieder eine geteilte Bindung, und genau das ist der Fehler in dieser Übung.

Sag [`examples/m4-closure-loop.js`](file:examples/m4-closure-loop.js) vorher, dann führe es aus:

```bash
node examples/m4-closure-loop.js
```

## Die Aufgabe

Öffne [`src/m4/counter-factory.js`](file:src/m4/counter-factory.js):

- `makeCounter(start)` wirft; schreib es. `next()` liefert den aktuellen Wert und zählt danach hoch, `value()` liest. Zwei Zähler dürfen sich keinen Zustand teilen.
- `makeAdders(list)` baut eine Funktion je Zahl, deklariert seinen Index aber einmal außerhalb der Schleife. Alle drei Closures sehen dann den Endindex, `list[i]` ist `undefined`, und `undefined + 5` ergibt `NaN` - [M1](step:m1-03-coercion-nan), diesmal über eine Closure.

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m4-03-closures.test.js
```

Drei grün, und deine Vorhersage ist erfasst. Als Nächstes das andere, was eine Funktion von ihrer Aufrufstelle mitbekommt: [`this`](step:m4-04-arrow-and-this).
