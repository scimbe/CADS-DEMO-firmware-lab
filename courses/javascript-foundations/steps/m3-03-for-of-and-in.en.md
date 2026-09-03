---
id: m3-03-for-of-and-in
title: "for...of against for...in"
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
    title: Predict what each loop yields
    check: { type: predict, prompt: { en: "examples/m3-loop-order.js puts an extra named property on an array and then walks it with for...in and for...of. Write down every line, including what typeof each for...in value is and whether the extra property appears in either loop.", de: "examples/m3-loop-order.js hängt eine zusätzliche benannte Eigenschaft an ein Array und läuft es dann mit for...in und for...of durch. Schreib jede Zeile auf, einschließlich des typeof jedes for...in-Werts und ob die Zusatz-Eigenschaft in einer der Schleifen auftaucht." }, then: { type: command, command: "node examples/m3-loop-order.js", expectExitCode: 0, expectStdout: "not an element|extra" }, rubric: "Notices that for...in yields property KEYS as strings, including the extra non-index property, while for...of yields the element VALUES and ignores it; and that length stays 3 because a named property is not an element. Bonus if the do...while running once despite a false condition was predicted.", bloom: evaluate }
  - id: iterate
    title: All three iteration tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m3-03 ownValues returns values, not keys", "m3-03 firstMatch yields elements, not index strings", "m3-03 firstMatch does not visit elements after the match"], minPass: 3 }
  - id: which-iteration
    title: Choosing the iteration form
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
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Pick the iteration form by what you need out of it - keys or values - and know why `for...in` is the wrong tool for an array.

## Two loops that look alike and are not

```js
for (const key in object) { … }   // yields KEYS, as strings
for (const value of iterable) { … }   // yields VALUES
```

MDN's [Loops and iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration) chapter is explicit: `for...in` walks enumerable **property names**, and `for...of` walks the **values** of anything iterable - arrays, strings, `Map`, `Set`.

Two consequences catch everyone at least once:

- Over an array, `for...in` gives you `"0"`, `"1"`, `"2"` - index **strings**, not numbers and not the elements. `"0" + 1` is `"01"`, which is [M1](step:m1-03-coercion-nan) waiting to happen.
- `for...in` also yields any other enumerable property attached to the array. Arrays are objects, so someone can put a name on one, and `for...in` will hand it to you between the indices.

Predict [`examples/m3-loop-order.js`](file:examples/m3-loop-order.js), then run it:

```bash
node examples/m3-loop-order.js
```

The extra property shows up in one loop and not the other, and `length` stays 3 - because a named property is not an element.

## Own properties

Over a plain object, `for...in` also walks inherited enumerable properties. In this course's exercises nothing inherits, but the habit is worth forming now:

```js
for (const key in obj) {
  if (!Object.hasOwn(obj, key)) continue;
  …
}
```

`Object.hasOwn` is the modern spelling of that guard. For most real code, `Object.keys(obj)`, `Object.values(obj)` or `Object.entries(obj)` say the same thing more directly, and you will use them in [M5](step:m5-01-objects).

## The exercise

Open [`src/m3/iterate.js`](file:src/m3/iterate.js):

- `ownValues(obj)` must return the object's own values in insertion order. It currently collects the keys.
- `firstMatch(list, predicate)` must return the first element the predicate accepts. It uses `for...in` over an array, so the predicate is being handed index strings. The third test also checks that the loop **stops** at the match - returning from inside the loop is how you do that.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m3-03-for-of-and-in.test.js
node examples/m3-loop-order.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m3-03-for-of-and-in.test.js
```

Three green. Next: leaving a loop early on purpose, including [two loops at once](step:m3-04-break-continue).
