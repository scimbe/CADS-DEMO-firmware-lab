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
    check: { type: predict, prompt: { en: "Read examples/m3-loop-order.js. Write down every line it prints, in order, before you run it.", de: "Lies examples/m3-loop-order.js. Schreib jede ausgegebene Zeile in Reihenfolge auf, bevor du es ausführst." }, then: { type: command, command: "node examples/m3-loop-order.js", expectExitCode: 0, expectStdout: "not an element|extra" }, rubric: "Sets the predicted lines against the printed ones and names at least one place where the two loops differed, or where the extra property or the final loop behaved unexpectedly. Does not pass: reporting the output without naming which expectation it corrected.", bloom: evaluate }
  - id: iterate
    title: Alle drei Iterations-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m3-03 ownValues returns values, not keys", "m3-03 firstMatch yields elements, not index strings", "m3-03 firstMatch does not visit elements after the match"], minPass: 3 }
  - id: which-iteration
    title: Die Iterationsform wählen
    check: { type: question, prompt: { en: "Name what each of the four ways to walk a collection hands you. One line each.", de: "Nenne, was jeder der vier Wege durch eine Sammlung dir gibt. Je eine Zeile." }, rubric: "Four lines that differ from one another, each saying what lands in the variable rather than what the form is for. Does not pass: two lines that amount to the same thing, or a line describing a use case instead of the contents.", bloom: understand, minChars: 60 }
socratic:
  - trigger: "task:guess-loop-order:failed"
    question: { en: "How many lines did you predict, and did any of them surprise you?", de: "Wie viele Zeilen hast du vorhergesagt, und hat dich eine überrascht?" }
    hints: [ { en: "Count the loops in the example and how many passes each one can make.", de: "Zähl die Schleifen im Beispiel und wie viele Durchläufe jede machen kann." }, { en: "One of the two array loops sees something the other does not; look at what was attached to the array.", de: "Eine der beiden Array-Schleifen sieht etwas, das die andere nicht sieht; sieh, was am Array hängt." }, { en: "The last loop tests its condition after the body, so a false condition does not stop the first pass.", de: "Die letzte Schleife prüft ihre Bedingung nach dem Rumpf, ein falsches Ergebnis stoppt den ersten Durchlauf also nicht." } ]
  - trigger: "task:iterate:failed"
    question: { en: "Look at what your loop variable holds on the first pass. Is it a key, an index, or a value?", de: "Sieh, was deine Schleifenvariable im ersten Durchlauf hält. Schlüssel, Index oder Wert?" }
    hints: [ { en: "Print the loop variable and its type on the first pass before touching anything else.", de: "Gib die Schleifenvariable und ihren Typ im ersten Durchlauf aus, bevor du etwas anderes anfasst." }, { en: "The first function needs the value behind a key, and needs to skip anything it did not own.", de: "Die erste Funktion braucht den Wert hinter einem Schlüssel und muss überspringen, was ihr nicht gehört." }, { en: "The second is handed text where it expects elements, which is why its predicate never matches.", de: "Der zweiten wird Text übergeben, wo sie Elemente erwartet, deshalb passt ihr Prädikat nie." } ]
  - trigger: "task:which-iteration:failed"
    question: { en: "Do two of your four lines say the same thing in different words?", de: "Sagen zwei deiner vier Zeilen dasselbe mit anderen Worten?" }
    hints: [ { en: "Take one array and one plain object and run all four against both.", de: "Nimm ein Array und ein einfaches Objekt und lass alle vier auf beide laufen." }, { en: "Two of the four give you something you then have to look up; two give you the thing itself.", de: "Zwei der vier geben dir etwas, das du nachschlagen musst; zwei geben dir die Sache selbst." }, { en: "Only one of the four is still the right choice for a plain object, and it needs a guard.", de: "Nur einer der vier ist für ein einfaches Objekt noch die richtige Wahl, und er braucht eine Absicherung." } ]
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

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `>Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

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
