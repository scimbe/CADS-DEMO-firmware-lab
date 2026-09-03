---
id: m5-03-arrays
title: Arrays, length und wem die Daten gehören
bloom: apply
objectives: [javascript-web-javascript-guide-indexed-collections]
requires: [m5-02-optional-chaining]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m5-01-objects, m3-02-off-by-one]
links:
  - { step: m5-02-optional-chaining }
  - { step: m5-04-transformations }
  - { file: "src/m5/collection.js", line: 10 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections", title: "MDN: Indexed collections" }
sources: [src/m5/collection.js, test/m5-03-arrays.test.js, src/m3/window.js]
tasks:
  - id: collection
    title: Alle drei Sammlungs-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m5-03 addTask appends without touching the input", "m5-03 removeAt drops one element without touching the input", "m5-03 trimTo shortens without touching the input"], minPass: 3 }
  - id: mutate-or-copy
    title: Verändernde und nicht verändernde Methoden
    check: { type: question, prompt: { en: "Sort the methods you used or replaced into two groups: those that change the array they are called on, and those that return a new one. Then say when a mutating API is the better design, and what a caller has to know when you ship one.", de: "Ordne die Methoden, die du benutzt oder ersetzt hast, in zwei Gruppen: die, die das Array verändern, auf dem sie aufgerufen werden, und die, die ein neues zurückgeben. Sag dann, wann eine verändernde Schnittstelle der bessere Entwurf ist und was ein Aufrufer wissen muss, wenn du eine solche ausliefert." }, rubric: "Groups correctly: push, pop, shift, unshift, splice, sort, reverse and assigning to length mutate; slice, concat, map, filter and spreading produce new arrays. Argues that mutation is defensible for a large array or a private accumulator inside one function, and that a mutating API must document it, because a caller who keeps a reference will see the change everywhere.", bloom: evaluate, minChars: 100 }
socratic:
  - { trigger: "task:collection:failed", question: { en: "Is the returned array wrong, or is the caller's array no longer what it was?", de: "Ist das zurückgegebene Array falsch, oder ist das Array des Aufrufers nicht mehr das, was es war?" }, hints: [ { en: "push, splice and assigning to length all change the array in place.", de: "push, splice und die Zuweisung an length verändern das Array alle an Ort und Stelle." }, { en: "slice(start, end) returns a new array and never touches the original.", de: "slice(start, end) liefert ein neues Array und fasst das Original nie an." }, { en: "removeAt has to leave an out-of-range index alone - and still return a new array.", de: "removeAt muss einen Index außerhalb des Bereichs unangetastet lassen - und trotzdem ein neues Array zurückgeben." } ] }
misconceptions:
  - pattern: "deep-equal|'a',\\s*'b'"
    question: { en: "The input array changed. Which of the methods you called writes into the array it is called on?", de: "Das Eingabe-Array hat sich geändert. Welche der aufgerufenen Methoden schreibt in das Array, auf dem sie aufgerufen wird?" }
    hints: [ { en: "push, splice, sort and reverse mutate; slice, concat and map do not.", de: "push, splice, sort und reverse verändern; slice, concat und map nicht." }, { en: "list.length = size truncates the original array as well.", de: "list.length = size kürzt ebenfalls das Original-Array." }, { en: "Build the answer from copies: [...list, task] and list.slice(0, size).", de: "Bau die Antwort aus Kopien: [...list, task] und list.slice(0, size)." } ]
---
## Lernziel

Wähle Array-Operationen danach, was sie mit den Daten des Aufrufers machen, und lies `length` als Eigenschaft, die sich nicht nur lesen, sondern auch schreiben lässt.

## length ist keine beobachtete Anzahl

MDNs Kapitel [Indexed collections](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Indexed_collections) macht einen Punkt, mit dem Einsteiger selten rechnen: `length` ist eine schreibbare Eigenschaft, und eine Zuweisung daran verändert das Array.

```js
const a = [1, 2, 3];
a.length = 2;    // a ist jetzt [1, 2]
a.length = 5;    // a ist jetzt [1, 2, <3 empty items>]
```

Eine kleinere Länge zuzuweisen kürzt an Ort und Stelle - deshalb zerstört es still die Daten des Aufrufers, wenn man damit „die ersten n Elemente" liefern will. Eine größere zuzuweisen erzeugt ein **dünnbesetztes** Array: `a[3]` ist `undefined`, aber der Platz existiert nicht, `3 in a` ist `false`, und `map` überspringt ihn und behält das Loch. Dünnbesetzte Arrays sind eine Ecke der Sprache, die man erkennen und meiden sollte.

## Zwei Familien von Methoden

| Verändern an Ort und Stelle | Liefern ein neues Array |
|---|---|
| `push`, `pop`, `shift`, `unshift` | `slice`, `concat`, Spread `[...a]` |
| `splice`, `sort`, `reverse` | `map`, `filter`, `flat` |
| `a.length = n` | `Array.from(a)` |

Keine Familie ist grundsätzlich besser. Die entscheidende Regel betrifft die **Eigentümerschaft**: eine Funktion, der ein Aufrufer ein Array übergibt, besitzt es nicht. Es zu verändern ist ein Nebeneffekt, um den der Aufrufer nicht gebeten hat, und weil [ein Array eine Referenz ist](step:m5-01-objects), ist diese Änderung überall sichtbar, wo das Array gehalten wird.

Verändern ist eine gute Wahl für einen Akkumulator, den du in deiner eigenen Funktion erzeugt hast, oder für ein sehr großes Array, bei dem Kopieren Verschwendung wäre - dann aber sag es im Namen und in der Dokumentation.

## Die Aufgabe

Öffne [`src/m5/collection.js`](file:src/m5/collection.js). Alle drei Funktionen erledigen ihre Aufgabe und zerstören dabei die Eingabe:

- `addTask(list, task)` benutzt `push`.
- `removeAt(list, index)` benutzt `splice` und muss außerdem einen Index außerhalb des Arrays ignorieren.
- `trimTo(list, size)` weist an `length` zu.

Schreib alle drei so um, dass sie neue Arrays liefern. Jeder Test prüft das Ergebnis **und** dass die Eingabe unangetastet blieb.

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m5-03-arrays.test.js
```

Drei grün. Die Frage-Aufgabe verlangt, die Methoden in die zwei Familien einzuordnen und zu begründen, wann Verändern richtig ist. Als Nächstes: [Arrays in Antworten verwandeln](step:m5-04-transformations).
