---
id: m6-03-async-errors
title: Fehler, die spät ankommen
bloom: analyze
objectives: [js.async.errors]
requires: [m6-02-async-await]
estimatedMinutes: 20
scaffold: faded
recallFrom: [m6-02-async-await, m2-04-error-objects]
links:
  - { step: m6-02-async-await }
  - { step: m6-04-concurrency }
  - { file: "src/m6/robust.js", line: 16 }
  - { step: m2-03-try-catch-finally }
sources: [src/m6/robust.js, test/m6-03-async-errors.test.js, src/m2/safe-parse.js]
tasks:
  - id: robust
    title: Alle vier Fehlerbehandlungs-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m6-03 tryLoad reports a resolved value", "m6-03 tryLoad catches a rejection instead of leaking it", "m6-03 mustLoad passes a value through", "m6-03 mustLoad wraps a rejection and keeps the cause"], minPass: 4 }
  - id: why-catch-missed
    title: Warum der catch-Block nie ausgelöst hat
    check: { type: question, prompt: { en: "The call sat inside try and the failure still escaped. Why? Two sentences, plus what cause preserves.", de: "Der Aufruf stand im try und der Fehler entkam doch. Warum? Zwei Sätze, plus was cause bewahrt." }, rubric: "Accounts for the block finishing while the failure is still ahead of it, and names the keyword that brings the failure inside. Then says what the original object carries beyond its sentence. Does not pass: claiming the construct is unusable in asynchronous code, or valuing the outer wording over the inner object.", bloom: analyze, minChars: 60 }
socratic:
  - trigger: "task:robust:failed"
    question: { en: "Is a container being reported as the value, or is the failure escaping the block?", de: "Wird ein Behälter als Wert gemeldet, oder entkommt der Fehler dem Block?" }
    hints: [ { en: "Run the four assertions separately; two are about a value and two about a failure arriving.", de: "Lass die vier Assertions getrennt laufen; zwei handeln von einem Wert, zwei von einem ankommenden Fehler." }, { en: "Ask at which line the block finishes, and at which line the failure becomes real.", de: "Frag, in welcher Zeile der Block endet und in welcher der Fehler real wird." }, { en: "For the second function, the standard error constructor takes a second argument that keeps the original reachable.", de: "Beim zweiten nimmt der Standard-Fehlerkonstruktor ein zweites Argument, das das Original erreichbar hält." } ]
  - trigger: "task:why-catch-missed:failed"
    question: { en: "Does your answer say what the block was doing at the moment the failure appeared?", de: "Sagt deine Antwort, was der Block im Moment des Fehlers tat?" }
    hints: [ { en: "Put the two versions side by side and mark the line at which each one leaves the block.", de: "Stell die zwei Fassungen nebeneinander und markiere, in welcher Zeile jede den Block verlässt." }, { en: "One keyword turns a rejected container into something the surrounding block can see.", de: "Ein Schlüsselwort macht aus einem abgelehnten Behälter etwas, das der umgebende Block sehen kann." }, { en: "For the second half, ask what a person debugging needs that a retyped sentence cannot give them.", de: "Frag für die zweite Hälfte, was jemand beim Untersuchen braucht, das ein abgetippter Satz nicht liefert." } ]
misconceptions:
  - pattern: "unhandledRejection"
    question: { en: "A rejected promise reached the top of the program. Which call was not awaited and not caught?", de: "Ein abgelehntes Promise ist an der Programmspitze angekommen. Welcher Aufruf wurde weder awaited noch gefangen?" }
    hints: [ { en: "Node terminates the process on an unhandled rejection; it is not a warning.", de: "Node beendet den Prozess bei einer unbehandelten Ablehnung; das ist keine Warnung." }, { en: "Every promise needs an await, a .catch, or a caller that takes responsibility for it.", de: "Jedes Promise braucht ein await, ein .catch oder einen Aufrufer, der die Verantwortung übernimmt." }, { en: "Awaiting inside a try block satisfies both at once.", de: "Ein await innerhalb eines try-Blocks erledigt beides auf einmal." } ]
  - pattern: "Promise \\{|ok: true"
    question: { en: "The reported value is the promise itself. Where is the await?", de: "Der gemeldete Wert ist das Promise selbst. Wo ist das await?" }
    hints: [ { en: "const value = fn() stores the promise; const value = await fn() stores its value.", de: "const value = fn() speichert das Promise; const value = await fn() speichert dessen Wert." }, { en: "The await also has to be inside the try, not before it.", de: "Das await muss außerdem innerhalb des try stehen, nicht davor." }, { en: "This is the same missing await as m6-02, now with a catch block hiding it.", de: "Das ist dasselbe fehlende await wie in m6-02, nur verdeckt durch einen catch-Block." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Fang einen Fehlschlag ab, der noch nicht passiert ist, und reich einen Fehler nach oben, ohne die Beweise zu vernichten.

## try/catch fängt nur ein throw

`try`/`catch` aus [m2-03](step:m2-03-try-catch-finally) fängt ein **synchrones** throw. Eine Funktion, die ein abgelehntes Promise zurückgibt, wirft an der Aufrufstelle nicht - sie kehrt normal zurück, mit einem Objekt, das später scheitern wird.

```js
try {
  const value = fn();      // liefert ein ausstehendes Promise; hier wirft nichts
  return { ok: true, value };
} catch (error) {
  …                        // läuft nie
}
```

Der Block endet, bevor die Ablehnung existiert. Ergänze `await`, und das Bild ändert sich: `await` auf einem abgelehnten Promise wirft innerhalb der Funktion, in genau dieser Zeile, wo das umgebende `catch` es sehen kann.

```js
try {
  const value = await fn();   // jetzt landet eine Ablehnung im catch
  …
}
```

Das `await` muss **innerhalb** des `try` stehen. Vor dem Block zu awaiten ist derselbe Fehler mit Hut.

## Unbehandelte Ablehnungen beenden den Prozess

Ein Promise, das ablehnt, ohne dass jemand wartet, ist in Node keine Warnung. Der Prozess wird beendet:

```
ERR_UNHANDLED_REJECTION
```

Daraus folgt die Regel: jedes Promise braucht ein `await`, ein `.catch` oder einen Aufrufer, der die Verantwortung übernommen hat. Ein Promise aus deiner Funktion zurückzugeben ist ein legitimer Weg, diese Verantwortung weiterzureichen.

## Einpacken, ohne das Original zu verlieren

Wenn du einen Fehler fängst und Kontext ergänzen willst, kopiere nicht seine Meldung in einen neuen und wirf das Original weg. Jeder `Error`-Konstruktor nimmt ein Optionsobjekt mit `cause`:

```js
throw new Error(`load failed: ${error.message}`, { cause: error });
```

`error.cause` bewahrt den ursprünglichen Fehler - seinen Namen, seine Meldung und seinen Stack, der auf die Zeile zeigt, in der der Fehlschlag tatsächlich passiert ist. Node gibt die Kette aus. Ohne `cause` endet die Spur bei deiner Verpackung, und der wahre Ursprung ist weg.

Das ist dasselbe Argument wie in [m2-04](step:m2-04-error-objects): Fehler sind für das Programm und für die Person, die es untersucht, und beide brauchen mehr als einen Satz.

## Die Aufgabe

Öffne [`src/m6/robust.js`](file:src/m6/robust.js). `failing` ist vorgegeben.

- `tryLoad(fn)` hat ein `try`/`catch` und kein `await`, meldet also ein `Promise` als Wert und lässt Ablehnungen entkommen. Behebe beides mit einem Schlüsselwort an der richtigen Stelle.
- `mustLoad(fn)` wirft; schreib es. Gib den aufgelösten Wert zurück und wirf bei einer Ablehnung einen neuen `Error` mit der Meldung `load failed: <original>`, der das Original unter `cause` mitführt.

Der Test benutzt `assert.rejects`, das prüft, dass ein async-Aufruf ablehnt, und dich den Fehler untersuchen lässt - das asynchrone Gegenstück zu `assert.throws`.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m6-03-async-errors.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m6-03-async-errors.test.js
```

Vier grün. Als Nächstes: [Dinge absichtlich gleichzeitig laufen lassen](step:m6-04-concurrency).
