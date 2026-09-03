---
id: m5-01-objects
title: Objects, references and copying
bloom: apply
objectives: [javascript-web-javascript-guide-working-with-objects]
requires: [m4-04-arrow-and-this]
estimatedMinutes: 15
scaffold: worked
recallFrom: [m4-04-arrow-and-this, m1-04-equality]
links:
  - { step: m4-04-arrow-and-this }
  - { step: m5-02-optional-chaining }
  - { file: "src/m5/config.js", line: 10 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects", title: "MDN: Working with objects" }
sources: [src/m5/config.js, test/m5-01-objects.test.js, src/m3/iterate.js]
tasks:
  - id: settings
    title: All three settings tests are green
    check: { type: testSuite, runner: node-test, expectPass: ["m5-01 readSettings copies the fields", "m5-01 readSettings copies the tags instead of sharing them", "m5-01 listEntries renders key=value in insertion order"], minPass: 3 }
  - id: shared-or-copied
    title: What was actually copied
    check: { type: question, prompt: { en: "The first test passed while the second failed, using the same function. Explain what a property holding an array actually stores, why copying the object did not copy the array, and what 'shallow copy' means in that sentence.", de: "Der erste Test bestand, während der zweite mit derselben Funktion fehlschlug. Erkläre, was eine Eigenschaft, die ein Array hält, tatsächlich speichert, warum das Kopieren des Objekts das Array nicht mitkopiert hat, und was 'flache Kopie' in diesem Satz bedeutet." }, rubric: "States that an object property holds a reference, not the array itself, so copying the property copies the reference and both objects then point at one array; defines a shallow copy as one level deep, which leaves nested objects and arrays shared; and names a fix such as spreading the array into a new one.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:settings:failed", question: { en: "Is the failure about the shared array, or about the key=value strings?", de: "Geht es beim Fehlschlag um das geteilte Array oder um die key=value-Zeichenketten?" }, hints: [ { en: "The test pushes onto the result's tags and then checks that the input is unchanged.", de: "Der Test hängt an die tags des Ergebnisses an und prüft danach, dass die Eingabe unverändert ist." }, { en: "[...raw.tags] builds a new array with the same elements.", de: "[...raw.tags] baut ein neues Array mit denselben Elementen." }, { en: "Object.entries(obj) gives [key, value] pairs in insertion order; map them into strings.", de: "Object.entries(obj) liefert [key, value]-Paare in Einfügereihenfolge; wandle sie per map in Zeichenketten um." } ] }
misconceptions:
  - pattern: "'a',\\s*'b'|deep-equal"
    question: { en: "The caller's data changed although you only touched the result. What do the two objects have in common?", de: "Die Daten des Aufrufers haben sich geändert, obwohl du nur das Ergebnis angefasst hast. Was haben die beiden Objekte gemeinsam?" }
    hints: [ { en: "Copying a property that holds an array copies the reference, not the elements.", de: "Eine Eigenschaft zu kopieren, die ein Array hält, kopiert die Referenz, nicht die Elemente." }, { en: "Both objects now name one array, so a push through either is visible through both.", de: "Beide Objekte benennen jetzt ein Array, ein push über eines ist also über beide sichtbar." }, { en: "The link breaks as soon as the property holds a different array with the same elements.", de: "Die Verbindung löst sich, sobald die Eigenschaft ein anderes Array mit denselben Elementen hält." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Read an object as a set of named references, and know exactly how much of a structure a copy actually copies.

## Objects hold references

An object property holds a value. When that value is an array or another object, what is stored is a **reference** to it, not the thing itself. Two properties can therefore name the same array:

```js
const raw = { tags: ["a"] };
const copy = { tags: raw.tags };   // one array, two names
copy.tags.push("b");
raw.tags;                          // ["a", "b"]
```

Nothing is wrong with that code as such - sharing is sometimes what you want. The bug is sharing *by accident*, when a function was supposed to hand back something the caller could modify freely.

This is the same identity rule as [m1-04](step:m1-04-equality): `{a:1} === {a:1}` is `false` because those are two objects, and `raw.tags === copy.tags` is `true` because that is one.

## Shallow copy

The spread form copies an object **one level deep**:

```js
const copy = { ...raw };           // new object, same nested references
const copy2 = { ...raw, tags: [...raw.tags] };   // nested array copied too
```

"Shallow" is exactly that: the top level is new, everything below is shared. For a settings object with one array, spreading that array is enough. For arbitrarily deep structures, `structuredClone(raw)` makes a full copy.

## Reading properties out

MDN's [Working with objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_objects) chapter covers the three standard ways to walk an object's own enumerable properties, all in insertion order:

```js
Object.keys(obj)      // ["host", "port"]
Object.values(obj)    // ["localhost", 3000]
Object.entries(obj)   // [["host", "localhost"], ["port", 3000]]
```

These are the direct replacement for the guarded `for...in` from [m3-03](step:m3-03-for-of-and-in): no inherited properties, no `Object.hasOwn` guard, no index strings.

`Object.entries(obj).map(([key, value]) => …)` destructures each pair in the parameter list - the same destructuring you will use throughout [M5](step:m5-04-transformations).

## The exercise

Open [`src/m5/config.js`](file:src/m5/config.js):

- `readSettings(raw)` copies `host`, `port` and `tags`, but hands back the caller's array. The first test passes, the second does not. Copy the array.
- `listEntries(obj)` throws; build `["key=value", …]` in insertion order.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m5-01-objects.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

```bash
node --test test/m5-01-objects.test.js
```

Three green. Next: [reading through levels that may not exist](step:m5-02-optional-chaining).
