---
id: m3-02-off-by-one
title: Off by one und der Fehler, den es dir gibt
bloom: analyze
objectives: [javascript-web-javascript-guide-loops-and-iteration, javascript-web-javascript-guide-indexed-collections]
requires: [m3-01-for-and-while]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m3-01-for-and-while, m2-01-if-switch]
links:
  - { step: m3-01-for-and-while }
  - { step: m3-03-for-of-and-in }
  - { file: "src/m3/window.js", line: 9 }
  - { step: m5-03-arrays }
sources: [src/m3/window.js, test/m3-02-off-by-one.test.js]
tasks:
  - id: window
    title: Beide Fenster-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m3-02 lastThree returns exactly the last three elements", "m3-02 movingAverage returns one value per full window"], minPass: 2 }
  - id: read-the-symptom
    title: Vom Symptom zur Ursache
    check: { type: question, prompt: { en: "Why is reading one element too far easier to find than reading one too few? Two sentences.", de: "Warum ist ein Element zu weit zu lesen leichter zu finden als eines zu wenig? Zwei Sätze." }, rubric: "Explains that reading past the end yields a value that has no properties, so the next operation on it stops the program, while reading too few simply returns a shorter result that nothing announces. Names the consequence: only a test on the boundary catches the second. Does not pass: an answer that says the first throws immediately, or one that does not say why the second stays silent.", bloom: analyze, minChars: 60 }
socratic:
  - trigger: "task:window:failed"
    question: { en: "Write down the first and last index your loop touches for a three-element input. Which lies outside?", de: "Schreib ersten und letzten Index für eine dreielementige Eingabe auf. Welcher liegt außerhalb?" }
    hints: [ { en: "Do it on paper for the shortest input the test uses before changing any comparison.", de: "Mach es auf Papier für die kürzeste Eingabe des Tests, bevor du einen Vergleich änderst." }, { en: "The second function has two loops, so write the pair of indices down for each of them separately.", de: "Die zweite Funktion hat zwei Schleifen, notiere das Indexpaar also für jede getrennt." }, { en: "One of the four boundaries also has to survive an input shorter than the window itself.", de: "Eine der vier Grenzen muss außerdem eine Eingabe überstehen, die kürzer als das Fenster selbst ist." } ]
  - trigger: "task:read-the-symptom:failed"
    question: { en: "Does your answer say why the second mistake produces no message at all?", de: "Sagt deine Antwort, warum der zweite Fehler überhaupt keine Meldung erzeugt?" }
    hints: [ { en: "Ask what an index past the end returns, and whether returning it is itself an error.", de: "Frag, was ein Index hinter dem Ende liefert, und ob das Liefern selbst schon ein Fehler ist." }, { en: "Then ask what the next operation does with that value, and how many steps later that happens.", de: "Frag dann, was die nächste Operation mit diesem Wert tut, und wie viele Schritte später das passiert." }, { en: "A result that is merely short is still a valid result, which is why only one kind of test finds it.", de: "Ein nur zu kurzes Ergebnis ist immer noch ein gültiges Ergebnis, deshalb findet es nur eine Art von Test." } ]
misconceptions:
  - pattern: "Cannot read properties of undefined"
    question: { en: "An index produced undefined, and the next operation on it threw. Which index was it, and what is the largest valid one?", de: "Ein Index hat undefined geliefert, und die nächste Operation darauf hat geworfen. Welcher Index war es, und was ist der größte gültige?" }
    hints: [ { en: "An array of length 3 has indices 0, 1 and 2. Index 3 is not an error - it is undefined.", de: "Ein Array der Länge 3 hat die Indizes 0, 1 und 2. Index 3 ist kein Fehler - er ist undefined." }, { en: "The loop condition decides the last index touched: i < length stops at length - 1, i <= length does not.", de: "Die Schleifenbedingung bestimmt den letzten berührten Index: i < length hört bei length - 1 auf, i <= length nicht." }, { en: "The error surfaces one operation later than the mistake; look at the loop head, not the line that threw.", de: "Der Fehler zeigt sich eine Operation nach der Ursache; sieh dir den Schleifenkopf an, nicht die werfende Zeile." } ]
  - pattern: "NaN"
    question: { en: "A sum became NaN. Which term in it was undefined, and why did adding it not throw?", de: "Eine Summe wurde NaN. Welcher Summand war undefined, und warum hat das Addieren nicht geworfen?" }
    hints: [ { en: "undefined + a number is NaN, silently - the same silent coercion you met in M1.", de: "undefined + eine Zahl ergibt NaN, und zwar stillschweigend - dieselbe stille Umwandlung wie in M1." }, { en: "An inner loop that runs size + 1 times reads one element past its window.", de: "Eine innere Schleife, die size + 1 mal läuft, liest ein Element über ihr Fenster hinaus." }, { en: "A window of size elements is k = 0 up to but not including size.", de: "Ein Fenster aus size Elementen ist k = 0 bis ausschließlich size." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Lies ein Symptom außerhalb des Bereichs auf die verursachende Schleifenbedingung zurück und korrigiere Grenzen, indem du sie aufschreibst, statt Operatoren durchzuprobieren.

## Indizes enden eins vor der Länge

Ein Array der Länge 3 hat die Indizes 0, 1, 2. Einen Index 3 gibt es nicht. JavaScript hindert dich aber nicht daran zu fragen:

```js
const a = [10, 20, 30];
a[3]              // undefined - kein Fehler
a[3].toString()   // TypeError: Cannot read properties of undefined (reading 'toString')
```

Dieses zweistufige Verhalten ist der ganze Grund, warum Off-by-one-Fehler verwirren. Der Fehler steckt in der **Schleifenbedingung**; die Meldung erscheint eine Operation später, in einer harmlos aussehenden Zeile. Wenn du `Cannot read properties of undefined` siehst, sieh dir den Schleifenkopf an, nicht die Zeile aus dem Stacktrace.

Ein Element zu weit zu lesen ist der glückliche Fall. Eines zu *wenig* zu lesen liefert ein Ergebnis, das schlicht zu kurz ist, ganz ohne Fehler - deshalb prüfen die Tests dieses Steps genau die Grenze und nicht einen bequemen Fall in der Mitte.

## Eine Grenze aufschreiben

Die verlässliche Methode besteht nicht darin, zwischen `<` und `<=` zu raten. Sie besteht darin, ersten und letzten Index für eine kleine Eingabe aufzuschreiben:

- `lastThree([1,2,3,4,5])` soll die Indizes 2, 3, 4 berühren. Start `length - 3`, Ende `length - 1`. Also: `i < list.length`.
- `lastThree([1,2])` soll 0 und 1 berühren. `length - 3` ist `-1`, der Start muss also auf 0 begrenzt werden.
- `movingAverage([1,2,3,4], 2)` soll Fenster ab 0, 1, 2 erzeugen. Das letzte Fenster beginnt dort, wo `i + size` noch im Array liegt, also: `i + size <= list.length`.
- Die innere Schleife deckt `size` Elemente ab: `k = 0` bis ausschließlich `size`.

Vier Zeilen Arithmetik, einmal gemacht, schlagen jedes Operator-Tauschen.

## Die Aufgabe

Öffne [`src/m3/window.js`](file:src/m3/window.js). Beide Funktionen haben Off-by-one-Fehler, und `movingAverage` hat je einen in jeder seiner zwei Schleifen.

Lass zuerst den Test laufen und lies die Fehlschläge. Einer ist ein `TypeError`; der andere ist ein `NaN`, entstanden durch das Addieren von `undefined` zu einer Zahl - die stille Umwandlung aus [M1](step:m1-03-coercion-nan), diesmal innerhalb einer Schleife.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `>Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m3-02-off-by-one.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m3-02-off-by-one.test.js
```

Beide grün, einschließlich der kurzen Liste und des Falls mit genau einem Fenster. Die Frage-Aufgabe verlangt, das Symptom auf die Ursache zurückzuverfolgen; diese Rückverfolgung ist der übertragbare Teil. Als Nächstes: [Iterieren ganz ohne Indizes](step:m3-03-for-of-and-in).
