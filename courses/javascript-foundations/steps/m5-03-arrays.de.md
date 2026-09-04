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
    check: { type: question, prompt: { en: "Sort the calls you used and replaced into two groups, then say when a mutating design is right.", de: "Ordne die benutzten und ersetzten Aufrufe in zwei Gruppen und sag, wann Verändern richtig ist." }, rubric: "Two groups that are actually disjoint, plus a defensible case for mutation such as a collection the function created itself or one large enough that copying costs. Adds what a caller has to be told. Does not pass: a grouping that puts a non-mutating call in the mutating group, or a case for mutation that is only about typing less.", bloom: evaluate, minChars: 60 }
socratic:
  - trigger: "task:collection:failed"
    question: { en: "Is the returned collection wrong, or is the caller's no longer what it was?", de: "Ist die zurückgegebene Sammlung falsch, oder ist die des Aufrufers nicht mehr dieselbe?" }
    hints: [ { en: "Each test checks two things; read which of the two is failing before changing anything.", de: "Jeder Test prüft zwei Dinge; lies, welches der beiden scheitert, bevor du etwas änderst." }, { en: "For each of the three calls, look up whether it answers with a new collection or edits the one it is on.", de: "Sieh für jeden der drei Aufrufe nach, ob er mit einer neuen Sammlung antwortet oder die vorhandene bearbeitet." }, { en: "One of the three does not even look like a call; assigning to a property can shorten a collection too.", de: "Einer der drei sieht nicht einmal wie ein Aufruf aus; auch eine Zuweisung an eine Eigenschaft kann kürzen." } ]
  - trigger: "task:mutate-or-copy:failed"
    question: { en: "Would every call in your first group really change the collection it is called on?", de: "Würde jeder Aufruf deiner ersten Gruppe die Sammlung wirklich ändern, auf der er läuft?" }
    hints: [ { en: "Test each one in isolation: call it, then print the original.", de: "Prüf jeden einzeln: aufrufen, dann das Original ausgeben." }, { en: "Two of the ones you might expect to be safe are not, and one of them is not a method call at all.", de: "Zwei der vermeintlich sicheren sind es nicht, und einer davon ist gar kein Methodenaufruf." }, { en: "Ask of each candidate whether anyone outside the function still holds the thing being changed.", de: "Frag bei jedem Kandidaten, ob außerhalb der Funktion noch jemand das Geänderte in der Hand hält." } ]
misconceptions:
  - pattern: "deep-equal|'a',\\s*'b'"
    question: { en: "The input array changed. Which of the methods you called writes into the array it is called on?", de: "Das Eingabe-Array hat sich geändert. Welche der aufgerufenen Methoden schreibt in das Array, auf dem sie aufgerufen wird?" }
    hints: [ { en: "push, splice, sort and reverse mutate; slice, concat and map do not.", de: "push, splice, sort und reverse verändern; slice, concat und map nicht." }, { en: "list.length = size truncates the original array as well.", de: "list.length = size kürzt ebenfalls das Original-Array." }, { en: "Each of the three has a non-mutating counterpart that returns a fresh array instead of editing one.", de: "Jede der drei hat ein nicht verändernderes Gegenstück, das ein frisches Array liefert statt eines zu bearbeiten." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
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

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `>Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m5-03-arrays.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m5-03-arrays.test.js
```

Drei grün. Die Frage-Aufgabe verlangt, die Methoden in die zwei Familien einzuordnen und zu begründen, wann Verändern richtig ist. Als Nächstes: [Arrays in Antworten verwandeln](step:m5-04-transformations).
