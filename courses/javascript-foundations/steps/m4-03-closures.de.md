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
    check: { type: predict, prompt: { en: "Read examples/m4-closure-loop.js. Write down the two arrays and the three numbers it prints.", de: "Lies examples/m4-closure-loop.js. Schreib die zwei Arrays und die drei Zahlen auf, die es ausgibt." }, then: { type: command, command: "node examples/m4-closure-loop.js", expectExitCode: 0, expectStdout: "3, 3, 3" }, rubric: "Sets both predicted arrays against the printed ones and names what differs between the two loops. Does not pass: reporting the output without saying why the two arrays differ.", bloom: evaluate }
  - id: counters
    title: Alle drei Closure-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m4-03 a counter keeps its own state", "m4-03 two counters do not share state", "m4-03 every adder captures its own number"], minPass: 3 }
  - id: closure-cost
    title: Was eine Closure am Leben hält
    check: { type: question, prompt: { en: "Give one case where keeping a captured variable alive is the point, and one where it is the bug.", de: "Nenne einen Fall, in dem eine festgehaltene Variable der Zweck ist, und einen, in dem sie der Fehler ist." }, rubric: "Two cases that turn on the same mechanism in opposite directions. Does not pass: two cases that are both about state you wanted, or a bug case that is really about a typo rather than about what was captured.", bloom: analyze, minChars: 50 }
socratic:
  - trigger: "task:guess-capture:failed"
    question: { en: "Did the two arrays match your prediction, and did you expect them to differ?", de: "Passten die zwei Arrays zu deiner Vorhersage, und hast du einen Unterschied erwartet?" }
    hints: [ { en: "Both loops look identical apart from one keyword; predict each array separately.", de: "Beide Schleifen sehen bis auf ein Schlüsselwort gleich aus; sag jedes Array einzeln vorher." }, { en: "Ask when each stored function actually runs, and what the loop variable holds by then.", de: "Frag, wann jede gespeicherte Funktion wirklich läuft, und was die Schleifenvariable dann hält." }, { en: "One of the two keywords gives every pass its own variable; the other gives the whole loop one.", de: "Eines der zwei Schlüsselwörter gibt jedem Durchlauf seine eigene Variable; das andere der ganzen Schleife eine." } ]
  - trigger: "task:counters:failed"
    question: { en: "Do the two counters interfere, or do all the adders answer the same?", de: "Stören sich die zwei Zähler, oder antworten alle Adder gleich?" }
    hints: [ { en: "Create two counters and print both after using only the first.", de: "Erzeuge zwei Zähler und gib beide aus, nachdem du nur den ersten benutzt hast." }, { en: "For the adders, print the captured index inside each function at the moment it is called.", de: "Gib bei den Addern den festgehaltenen Index in jeder Funktion im Aufrufmoment aus." }, { en: "State declared outside the factory is shared by everything it ever returns, and an index declared above a loop behaves the same way.", de: "Außerhalb der Fabrik deklarierter Zustand wird von allem Zurückgegebenen geteilt, und ein über der Schleife deklarierter Index verhält sich genauso." } ]
  - trigger: "task:closure-cost:failed"
    question: { en: "Are both of your cases about state you wanted, or is one of them about state you forgot?", de: "Handeln beide Fälle von gewolltem Zustand, oder einer von vergessenem?" }
    hints: [ { en: "Look at the two halves of this exercise: one keeps something on purpose, one keeps it by accident.", de: "Sieh dir die zwei Hälften dieser Übung an: eine behält etwas absichtlich, eine versehentlich." }, { en: "A bug case needs a second function that sees the same variable and did not expect to.", de: "Ein Fehlerfall braucht eine zweite Funktion, die dieselbe Variable sieht und das nicht erwartete." }, { en: "A long-lived function also keeps whatever it captured from being reclaimed, which is a cost even when nothing is wrong.", de: "Eine langlebige Funktion verhindert auch die Freigabe des Festgehaltenen, und das kostet, selbst wenn nichts falsch ist." } ]
misconceptions:
  - pattern: "NaN"
    question: { en: "An adder returned NaN. Which value did it read out of the list, and what was the index at the moment it was called?", de: "Ein Adder hat NaN geliefert. Welchen Wert hat er aus der Liste gelesen, und welchen Index hatte er im Moment des Aufrufs?" }
    hints: [ { en: "The closures run after the loop has finished, so a shared index has already reached list.length.", de: "Die Closures laufen nach dem Ende der Schleife, ein geteilter Index steht dann schon auf list.length." }, { en: "list[list.length] is undefined, and undefined + 5 is NaN - the silent coercion from M1 again.", de: "list[list.length] ist undefined, und undefined + 5 ergibt NaN - wieder die stille Umwandlung aus M1." }, { en: "A binding declared with let in the for head is created fresh for every pass, which is exactly what is needed.", de: "Eine mit let im for-Kopf deklarierte Bindung wird für jeden Durchlauf neu erzeugt, und genau das wird gebraucht." } ]
  - pattern: "1 !== 0|2 !== 0"
    question: { en: "One counter saw the other one's changes. Where does the state live?", de: "Ein Zähler hat die Änderungen des anderen gesehen. Wo liegt der Zustand?" }
    hints: [ { en: "State declared outside makeCounter is shared by every counter it ever returns.", de: "Zustand, der außerhalb von makeCounter deklariert ist, wird von jedem zurückgegebenen Zähler geteilt." }, { en: "Declare the variable inside the factory function; each call then creates a new one.", de: "Deklariere die Variable innerhalb der Fabrikfunktion; jeder Aufruf erzeugt dann eine neue." }, { en: "That private-per-call variable is what a closure preserves after the factory returns.", de: "Genau diese pro Aufruf private Variable bewahrt eine Closure, nachdem die Fabrik zurückgekehrt ist." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
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

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m4-03-closures.test.js
node examples/m4-closure-loop.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m4-03-closures.test.js
```

Drei grün, und deine Vorhersage ist erfasst. Als Nächstes das andere, was eine Funktion von ihrer Aufrufstelle mitbekommt: [`this`](step:m4-04-arrow-and-this).
