---
id: m3-03-for-of-and-in
title: "for...of gegen for...in"
bloom: analyze
objectives: [javascript-web-javascript-guide-loops-and-iteration, javascript-web-javascript-guide-working-with-objects]
requires: [m3-02-off-by-one]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m3-02-off-by-one, m1-02-types-typeof]
links:
  - { step: m3-02-off-by-one }
  - { step: m3-04-break-continue }
  - { file: "src/m3/iterate.js", line: 10 }
  - { file: "examples/m3-loop-order.js" }
sources: [src/m3/iterate.js, test/m3-03-for-of-and-in.test.js, examples/m3-loop-order.js]
tasks:
  - id: guess-loop-order
    title: Sag vorher, was jede Schleife liefert
    check: { type: predict, prompt: { en: "examples/m3-loop-order.js puts an extra named property on an array and then walks it with for...in and for...of. Write down every line, including what typeof each for...in value is and whether the extra property appears in either loop.", de: "examples/m3-loop-order.js hängt eine zusätzliche benannte Eigenschaft an ein Array und läuft es dann mit for...in und for...of durch. Schreib jede Zeile auf, einschließlich des typeof jedes for...in-Werts und ob die Zusatz-Eigenschaft in einer der Schleifen auftaucht." }, then: { type: command, command: "node examples/m3-loop-order.js", expectExitCode: 0, expectStdout: "not an element|extra" }, rubric: "Notices that for...in yields property KEYS as strings, including the extra non-index property, while for...of yields the element VALUES and ignores it; and that length stays 3 because a named property is not an element. Bonus if the do...while running once despite a false condition was predicted.", bloom: evaluate }
  - id: iterate
    title: Alle drei Iterations-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m3-03 ownValues returns values, not keys", "m3-03 firstMatch yields elements, not index strings", "m3-03 firstMatch does not visit elements after the match"], minPass: 3 }
  - id: which-iteration
    title: Die Iterationsform wählen
    check: { type: question, prompt: { en: "You now have four ways to walk a collection: a counting for loop, for...of, for...in, and Object.entries. Say what each one yields, and name the one case where for...in is still the right choice.", de: "Du hast jetzt vier Wege, eine Sammlung zu durchlaufen: eine zählende for-Schleife, for...of, for...in und Object.entries. Sag, was jeder liefert, und nenne den einen Fall, in dem for...in noch die richtige Wahl ist." }, rubric: "Says a counting loop yields indices the author controls, for...of yields the values of any iterable, for...in yields enumerable property-name strings including inherited ones, and Object.entries yields own key/value pairs; identifies walking the property names of a plain object, typically with an Object.hasOwn guard, as the remaining legitimate use of for...in, and rules it out for arrays.", bloom: understand, minChars: 80 }
socratic:
  - { trigger: "task:iterate:failed", question: { en: "Look at what your loop variable actually holds on the first pass. Is it a key, an index, or a value?", de: "Sieh dir an, was deine Schleifenvariable im ersten Durchlauf wirklich enthält. Ein Schlüssel, ein Index oder ein Wert?" }, hints: [ { en: "for...in gives keys. For an object those are the property names; for an array they are index strings like '0'.", de: "for...in liefert Schlüssel. Bei einem Objekt sind das die Eigenschaftsnamen, bei einem Array Index-Zeichenketten wie '0'." }, { en: "ownValues needs the value behind the key: obj[key], guarded with Object.hasOwn(obj, key).", de: "ownValues braucht den Wert hinter dem Schlüssel: obj[key], abgesichert mit Object.hasOwn(obj, key)." }, { en: "firstMatch should walk elements, so it wants for...of - and returning from inside the loop stops it at the match.", de: "firstMatch soll Elemente durchlaufen, braucht also for...of - und ein return aus der Schleife heraus hält sie beim Treffer an." } ] }
misconceptions:
  - pattern: "'[0-9]+' !== |is not a function"
    question: { en: "The loop handed you an index string where you expected an element. Which of the two loop forms did you use?", de: "Die Schleife hat dir eine Index-Zeichenkette gegeben, wo du ein Element erwartet hast. Welche der beiden Schleifenformen hast du benutzt?" }
    hints: [ { en: "for (const x in array) puts '0', '1', '2' into x - strings, not the elements.", de: "for (const x in array) legt '0', '1', '2' in x ab - Zeichenketten, nicht die Elemente." }, { en: "String methods exist, number methods do not: '0'.toFixed is not a function.", de: "String-Methoden gibt es, Zahlmethoden nicht: '0'.toFixed ist keine Funktion." }, { en: "Swap in to of to iterate the values themselves.", de: "Tausche in gegen of, um die Werte selbst zu durchlaufen." } ]
  - pattern: "Cannot read properties of undefined"
    question: { en: "An index went out of range, or a key did not exist. Which container are you actually walking?", de: "Ein Index lag außerhalb, oder ein Schlüssel existierte nicht. Welchen Container läufst du eigentlich durch?" }
    hints: [ { en: "for...in over an array also yields any non-index property someone attached to it.", de: "for...in über ein Array liefert auch jede Nicht-Index-Eigenschaft, die jemand daran gehängt hat." }, { en: "That is one reason MDN advises against for...in for arrays.", de: "Das ist einer der Gründe, warum MDN von for...in für Arrays abrät." }, { en: "Use for...of for arrays and for...in only for plain objects.", de: "Nutze for...of für Arrays und for...in nur für einfache Objekte." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
---
## Lernziel

Wähle die Iterationsform danach, was du herausbekommen willst - Schlüssel oder Werte - und wisse, warum `for...in` für ein Array das falsche Werkzeug ist.

## Zwei Schleifen, die sich ähneln und es nicht sind

```js
for (const key in object) { … }   // liefert SCHLÜSSEL, als Zeichenketten
for (const value of iterable) { … }   // liefert WERTE
```

MDNs Kapitel [Loops and iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration) ist eindeutig: `for...in` läuft über die aufzählbaren **Eigenschaftsnamen**, `for...of` über die **Werte** von allem Iterierbaren - Arrays, Zeichenketten, `Map`, `Set`.

Zwei Folgen erwischen jeden mindestens einmal:

- Über ein Array liefert `for...in` `"0"`, `"1"`, `"2"` - Index-**Zeichenketten**, keine Zahlen und nicht die Elemente. `"0" + 1` ist `"01"`, und damit wartet [M1](step:m1-03-coercion-nan) schon.
- `for...in` liefert außerdem jede weitere aufzählbare Eigenschaft, die am Array hängt. Arrays sind Objekte, jemand kann also einen Namen daranhängen, und `for...in` reicht ihn dir zwischen den Indizes durch.

Sag [`examples/m3-loop-order.js`](file:examples/m3-loop-order.js) vorher, dann führe es aus:

```bash
node examples/m3-loop-order.js
```

Die Zusatz-Eigenschaft taucht in einer Schleife auf und in der anderen nicht, und `length` bleibt 3 - weil eine benannte Eigenschaft kein Element ist.

## Eigene Eigenschaften

Über ein einfaches Objekt läuft `for...in` auch über geerbte aufzählbare Eigenschaften. In den Übungen dieses Kurses erbt nichts, aber die Gewohnheit lohnt sich schon jetzt:

```js
for (const key in obj) {
  if (!Object.hasOwn(obj, key)) continue;
  …
}
```

`Object.hasOwn` ist die moderne Schreibweise dieser Absicherung. Für die meisten realen Fälle sagen `Object.keys(obj)`, `Object.values(obj)` oder `Object.entries(obj)` dasselbe direkter, und du nutzt sie in [M5](step:m5-01-objects).

## Die Aufgabe

Öffne [`src/m3/iterate.js`](file:src/m3/iterate.js):

- `ownValues(obj)` muss die eigenen Werte des Objekts in Einfügereihenfolge liefern. Aktuell sammelt es die Schlüssel.
- `firstMatch(list, predicate)` muss das erste vom Prädikat akzeptierte Element liefern. Es benutzt `for...in` über ein Array, dem Prädikat werden also Index-Zeichenketten übergeben. Der dritte Test prüft außerdem, dass die Schleife beim Treffer **anhält** - ein return aus der Schleife heraus leistet das.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m3-03-for-of-and-in.test.js
node examples/m3-loop-order.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m3-03-for-of-and-in.test.js
```

Drei grün. Als Nächstes: eine Schleife absichtlich früh verlassen, auch [zwei Schleifen auf einmal](step:m3-04-break-continue).
