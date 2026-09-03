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
    check: { type: predict, prompt: { en: "examples/m6-await-order.js prints A, B, C, D, two lines from an async function, a then callback, a microtask and a timeout. Write down the exact order before running it.", de: "examples/m6-await-order.js gibt A, B, C, D, zwei Zeilen aus einer async-Funktion, einen then-Callback, einen Microtask und einen Timeout aus. Schreib die genaue Reihenfolge auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m6-await-order.js", expectExitCode: 0, expectStdout: "timeout" }, rubric: "Recognises that an async function body runs synchronously up to its first await, so 'start one' appears before B; that everything after the await is queued and runs only once the synchronous code is finished, hence A, start one, B, C, D and then end one; and that promise callbacks (microtasks) run before a setTimeout callback even with a delay of 0.", bloom: evaluate }
  - id: store
    title: Alle drei Store-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m6-02 nameOf resolves with a string, not a Promise", "m6-02 nameOf falls back for unknown ids", "m6-02 namesOf resolves with plain strings in order"], minPass: 3 }
  - id: spot-missing-await
    title: Woran du ein fehlendes await erkennst
    check: { type: question, prompt: { en: "A missing await raises no error at all. Name two symptoms that give it away in a test failure or a log line, and say where you would look first.", de: "Ein fehlendes await erzeugt überhaupt keinen Fehler. Nenne zwei Symptome, die es in einem Testfehlschlag oder einer Logzeile verraten, und sag, wo du zuerst nachsehen würdest." }, rubric: "Names symptoms such as a Promise printed where a value was expected (Promise { <pending> } or a Promise on the actual side of a diff), a value that is undefined because a property was read off a promise, a truthiness test that always takes the same branch because a promise is always truthy, or work that completes in the wrong order. Says the first place to look is the call that produced the value: whether an await stands in front of it, and whether it sits inside an async function.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:store:failed", question: { en: "Look at the actual value in the diff. Is it a Promise, or an array of Promises?", de: "Sieh dir den tatsächlichen Wert im Diff an. Ist es ein Promise oder ein Array von Promises?" }, hints: [ { en: "readRecord returns a promise, and a promise is always truthy - so the ternary always took the first branch.", de: "readRecord liefert ein Promise, und ein Promise ist immer truthy - der Ternär hat also stets den ersten Zweig genommen." }, { en: "await the call before you test the record.", de: "Warte den Aufruf mit await ab, bevor du den Datensatz prüfst." }, { en: "map with an async callback gives an array of promises; Promise.all turns that into a promise for an array.", de: "map mit einem async-Callback liefert ein Array von Promises; Promise.all macht daraus ein Promise auf ein Array." } ] }
misconceptions:
  - pattern: "Promise \\{"
    question: { en: "A Promise reached an assertion. Which call produced it, and is there an await in front of that call?", de: "Ein Promise ist bei einer Assertion angekommen. Welcher Aufruf hat es erzeugt, und steht ein await davor?" }
    hints: [ { en: "Every async function returns a promise, even when its body looks synchronous.", de: "Jede async-Funktion liefert ein Promise, auch wenn ihr Rumpf synchron aussieht." }, { en: "A missing await produces no error - just a Promise where a value belonged.", de: "Ein fehlendes await erzeugt keinen Fehler - nur ein Promise dort, wo ein Wert hingehörte." }, { en: "await may only be used inside an async function; the enclosing function here already is one.", de: "await darf nur in einer async-Funktion stehen; die umgebende Funktion ist hier bereits eine." } ]
  - pattern: "undefined !== 'unknown'|'Ada' !== undefined"
    question: { en: "The fallback never fired, or a name came back undefined. What was actually tested for truthiness?", de: "Der Ersatzwert griff nie, oder ein Name kam als undefined zurück. Was wurde tatsächlich auf Truthiness geprüft?" }
    hints: [ { en: "A pending promise is an object, and every object is truthy - the m2-02 rule again.", de: "Ein ausstehendes Promise ist ein Objekt, und jedes Objekt ist truthy - wieder die Regel aus m2-02." }, { en: "Await first, then test the record: const record = await readRecord(id);", de: "Erst awaiten, dann den Datensatz prüfen: const record = await readRecord(id);" }, { en: "readRecord resolves with null for an unknown id, which is falsy once it is awaited.", de: "readRecord löst bei unbekannter id mit null auf, und das ist nach dem await falsy." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
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
