---
id: m6-02-async-await
title: async, await und das fehlende await
bloom: apply
objectives: [js.async.promises]
requires: [m6-01-promises]
estimatedMinutes: 20
scaffold: faded
recallFrom: [m6-01-promises, m5-04-transformations]
links:
  - { step: m6-01-promises }
  - { step: m6-03-async-errors }
  - { file: "src/m6/store.js", line: 20 }
  - { file: "examples/m6-await-order.js" }
sources: [src/m6/store.js, test/m6-02-async-await.test.js, examples/m6-await-order.js]
tasks:
  - id: guess-order
    title: Sag die Reihenfolge der ausgegebenen Zeilen vorher
    check: { type: predict, prompt: { en: "Read examples/m6-await-order.js. Write down the exact order of its nine printed lines.", de: "Lies examples/m6-await-order.js. Schreib die genaue Reihenfolge seiner neun Ausgabezeilen auf." }, then: { type: command, command: "node examples/m6-await-order.js", expectExitCode: 0, expectStdout: "timeout" }, rubric: "Sets the predicted order against the printed one and names at least two lines that moved, with the rule each move follows. Does not pass: reproducing the output as a list without saying which expectation it corrected.", bloom: evaluate }
  - id: store
    title: Alle drei Store-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m6-02 nameOf resolves with a string, not a Promise", "m6-02 nameOf falls back for unknown ids", "m6-02 namesOf resolves with plain strings in order"], minPass: 3 }
  - id: spot-missing-await
    title: Woran du ein fehlendes await erkennst
    check: { type: question, prompt: { en: "A missing await raises no error. Name two symptoms and where you would look first.", de: "Ein fehlendes await wirft nicht. Nenne zwei Symptome und wo du zuerst nachsiehst." }, rubric: "Two distinct symptoms, such as the container printed where a value belonged, a property read off it coming back undefined, a truthiness test that always takes one branch, or work finishing out of order. Plus a first place to look that is the call, not the assertion. Does not pass: two wordings of the same symptom, or a first place to look that is the failing test line.", bloom: analyze, minChars: 50 }
socratic:
  - trigger: "task:guess-order:failed"
    question: { en: "Which line did you place too early, and which too late?", de: "Welche Zeile hast du zu früh eingeordnet, welche zu spät?" }
    hints: [ { en: "Mark the one keyword in the example that can interrupt a function part-way.", de: "Markiere im Beispiel das eine Schlüsselwort, das eine Funktion mitten drin unterbrechen kann." }, { en: "Everything before it in that function runs at once; everything after it is queued for later.", de: "Alles davor in dieser Funktion läuft sofort; alles danach wird für später eingereiht." }, { en: "Two queues exist, and the one fed by the timer facility is served after the other.", de: "Es gibt zwei Warteschlangen, und die von der Timer-Funktion gespeiste wird nach der anderen bedient." } ]
  - trigger: "task:store:failed"
    question: { en: "Look at the value in the diff. Is it one container, or a collection of them?", de: "Sieh dir den Wert im Diff an. Ist es ein Behälter oder eine Sammlung davon?" }
    hints: [ { en: "The given function is correct, so the fault is in what the two callers do with what it returns.", de: "Die vorgegebene Funktion ist korrekt, der Fehler liegt also darin, was die zwei Aufrufer damit tun." }, { en: "A container is an object, and every object passes a truthiness test, which is why the fallback never fires.", de: "Ein Behälter ist ein Objekt, und jedes Objekt besteht eine Truthiness-Prüfung, deshalb greift der Ersatzwert nie." }, { en: "Mapping with an asynchronous callback gives you a collection of containers, and one call turns that into one container.", de: "Ein map mit asynchronem Callback liefert eine Sammlung von Behältern, und ein Aufruf macht daraus einen Behälter." } ]
  - trigger: "task:spot-missing-await:failed"
    question: { en: "Are your two symptoms genuinely different, or the same one twice?", de: "Sind deine zwei Symptome wirklich verschieden oder dasselbe zweimal?" }
    hints: [ { en: "List what a caller sees for the two cases: reading a property off it, and comparing it.", de: "Liste auf, was ein Aufrufer in zwei Fällen sieht: eine Eigenschaft davon lesen, und es vergleichen." }, { en: "One symptom shows up in a printed value, one in a branch always taken, one in the order of side effects.", de: "Ein Symptom zeigt sich in einem ausgegebenen Wert, eines in einem stets genommenen Zweig, eines in der Reihenfolge von Nebeneffekten." }, { en: "Trace the value backwards from the assertion to the line that produced it, and stop there.", de: "Verfolge den Wert von der Assertion zurück zu der Zeile, die ihn erzeugt hat, und halte dort." } ]
misconceptions:
  - pattern: "Promise \\{"
    question: { en: "A Promise reached an assertion. Which call produced it, and is there an await in front of that call?", de: "Ein Promise ist bei einer Assertion angekommen. Welcher Aufruf hat es erzeugt, und steht ein await davor?" }
    hints: [ { en: "Every async function returns a promise, even when its body looks synchronous.", de: "Jede async-Funktion liefert ein Promise, auch wenn ihr Rumpf synchron aussieht." }, { en: "A missing await produces no error - just a Promise where a value belonged.", de: "Ein fehlendes await erzeugt keinen Fehler - nur ein Promise dort, wo ein Wert hingehörte." }, { en: "await may only be used inside an async function; the enclosing function here already is one.", de: "await darf nur in einer async-Funktion stehen; die umgebende Funktion ist hier bereits eine." } ]
  - pattern: "[-] 'unknown'"
    question: { en: "The fallback never fired, or a name came back undefined. What was actually tested for truthiness?", de: "Der Ersatzwert griff nie, oder ein Name kam als undefined zurück. Was wurde tatsächlich auf Truthiness geprüft?" }
    hints: [ { en: "A pending promise is an object, and every object is truthy - the m2-02 rule again.", de: "Ein ausstehendes Promise ist ein Objekt, und jedes Objekt ist truthy - wieder die Regel aus m2-02." }, { en: "Await first, then test the record: const record = await readRecord(id);", de: "Erst awaiten, dann den Datensatz prüfen: const record = await readRecord(id);" }, { en: "readRecord resolves with null for an unknown id, which is falsy once it is awaited.", de: "readRecord löst bei unbekannter id mit null auf, und das ist nach dem await falsy." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Schreib asynchronen Code, der sich von oben nach unten liest, und erkenne den stillen Fehlschlag, den ein fehlendes `await` erzeugt.

## Zwei Schlüsselwörter über einem Mechanismus

```js
export async function nameOf(id) {
  const record = await readRecord(id);
  return record ? record.name : "unknown";
}
```

`async` markiert eine Funktion, deren Ergebnis ein Promise ist, egal was der Rumpf zurückgibt. `await` hält innerhalb dieser Funktion an, bis ein Promise besiegelt ist, und wird zu dessen Wert. Darunter passiert nichts Neues: MDNs [Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) beschreibt `async`/`await` als Syntax über der Promise-Kette, die du in [m6-01](step:m6-01-promises) geschrieben hast.

Zwei Tatsachen folgen direkt daraus, und beide sind wichtig:

- **Eine `async`-Funktion liefert immer ein Promise.** Auch `async function f() { return 1; }` liefert ein Promise auf `1`. Ihr Aufrufer muss es `await`en.
- **`await` hält nur die Funktion an, in der es steht.** Der Rest des Programms läuft weiter. Es ist kein blockierendes Schlafen.

## Das fehlende await

Das ist der prägende Fehler asynchronen JavaScripts, und er erzeugt überhaupt keine Fehlermeldung:

```js
const record = readRecord(id);       // ein ausstehendes Promise
return record ? record.name : "unknown";
```

Ein ausstehendes Promise ist ein Objekt, und [jedes Objekt ist truthy](step:m2-02-truthy-falsy), der Ternär nimmt also stets den ersten Zweig. `record.name` ist `undefined`, weil ein Promise keine `name`-Eigenschaft hat. Die Funktion liefert `undefined`. Nichts wirft.

Wenn der Wert bei einer Assertion ankommt, sagt es der Diff unmissverständlich:

```
+ Promise {
+   {
+     ok: true
+   }
- {
-   ok: true
  }
```

`+ Promise {` auf der Ist-Seite bedeutet genau eines: irgendwo darüber fehlt ein `await`.

## Reihenfolge

Sag [`examples/m6-await-order.js`](file:examples/m6-await-order.js) vorher, bevor du es ausführst:

```bash
node examples/m6-await-order.js
```

Zwei Regeln erklären die gesamte Ausgabe. Ein `async`-Rumpf läuft **synchron bis zu seinem ersten `await`**; alles danach wird für später eingereiht. Und eingereihte Promise-Callbacks - Microtasks - laufen vor jedem `setTimeout`-Callback, selbst bei einer Verzögerung von 0.

## Auf mehreres warten

`await` in einer Schleife lässt Aufrufe nacheinander laufen. Ein `map` mit async-Callback tut ebenfalls nicht, wonach es aussieht:

```js
ids.map((id) => nameOf(id))              // ein Array von Promises
await Promise.all(ids.map((id) => nameOf(id)))   // ein Promise auf ein Array von Werten
```

`Promise.all` ist die Brücke von vielen Promises zu einem. In [m6-04](step:m6-04-concurrency) geht es darum, wann man es einsetzt.

## Die Aufgabe

Öffne [`src/m6/store.js`](file:src/m6/store.js). `readRecord` ist vorgegeben und korrekt - ändere es nicht.

- `nameOf(id)` vergisst das await. Korrigiere es so, dass es mit einer Zeichenkette auflöst und mit `"unknown"` für eine id ohne Datensatz.
- `namesOf(ids)` mappt und liefert ein Array von Promises. Sorg dafür, dass es mit reinen Zeichenketten auflöst, in der richtigen Reihenfolge.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m6-02-async-await.test.js
node examples/m6-await-order.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m6-02-async-await.test.js
```

Drei grün, und deine Vorhersage ist erfasst. Als Nächstes: [was passiert, wenn etwas Erwartetes fehlschlägt](step:m6-03-async-errors).
