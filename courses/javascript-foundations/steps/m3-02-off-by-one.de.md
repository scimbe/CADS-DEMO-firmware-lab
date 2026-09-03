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
    check: { type: question, prompt: { en: "The first failure was a TypeError about reading a property of undefined, not a wrong number. Explain the chain from the loop condition to that message, and say why a loop that reads one element too far is easier to find than one that reads one too few.", de: "Der erste Fehlschlag war ein TypeError über das Lesen einer Eigenschaft von undefined, keine falsche Zahl. Erkläre die Kette von der Schleifenbedingung bis zu dieser Meldung, und sag, warum eine Schleife, die ein Element zu weit liest, leichter zu finden ist als eine, die eines zu wenig liest." }, rubric: "Traces i <= list.length reading index list.length, which is out of range, so the array yields undefined rather than throwing; the TypeError appears only at the next operation on that undefined. Notes the asymmetry: reading too far eventually produces undefined and a loud error, while reading too few simply returns a short result that no error announces - it needs a test on the boundary.", bloom: analyze, minChars: 100 }
socratic:
  - { trigger: "task:window:failed", question: { en: "Write down the first and last index your loop touches for a three-element array. Which of the two is outside the array?", de: "Schreib den ersten und den letzten Index auf, den deine Schleife bei einem dreielementigen Array berührt. Welcher der beiden liegt außerhalb?" }, hints: [ { en: "Indices run from 0 to length - 1, so a condition with <= against length always reaches one too far.", de: "Indizes laufen von 0 bis length - 1, eine Bedingung mit <= gegen length greift also immer eins zu weit." }, { en: "lastThree also has to survive a list shorter than three: a negative start index must be clamped to 0.", de: "lastThree muss auch eine Liste unter drei Elementen überstehen: ein negativer Startindex muss auf 0 begrenzt werden." }, { en: "For movingAverage there are two loops and two bugs: the window must contain size elements, and the last window must end at the last element.", de: "In movingAverage stecken zwei Schleifen und zwei Fehler: das Fenster muss size Elemente enthalten, und das letzte Fenster muss am letzten Element enden." } ] }
misconceptions:
  - pattern: "Cannot read properties of undefined"
    question: { en: "An index produced undefined, and the next operation on it threw. Which index was it, and what is the largest valid one?", de: "Ein Index hat undefined geliefert, und die nächste Operation darauf hat geworfen. Welcher Index war es, und was ist der größte gültige?" }
    hints: [ { en: "An array of length 3 has indices 0, 1 and 2. Index 3 is not an error - it is undefined.", de: "Ein Array der Länge 3 hat die Indizes 0, 1 und 2. Index 3 ist kein Fehler - er ist undefined." }, { en: "The loop condition decides the last index touched: i < length stops at length - 1, i <= length does not.", de: "Die Schleifenbedingung bestimmt den letzten berührten Index: i < length hört bei length - 1 auf, i <= length nicht." }, { en: "The error surfaces one operation later than the mistake; look at the loop head, not the line that threw.", de: "Der Fehler zeigt sich eine Operation nach der Ursache; sieh dir den Schleifenkopf an, nicht die werfende Zeile." } ]
  - pattern: "NaN"
    question: { en: "A sum became NaN. Which term in it was undefined, and why did adding it not throw?", de: "Eine Summe wurde NaN. Welcher Summand war undefined, und warum hat das Addieren nicht geworfen?" }
    hints: [ { en: "undefined + a number is NaN, silently - the same silent coercion you met in M1.", de: "undefined + eine Zahl ergibt NaN, und zwar stillschweigend - dieselbe stille Umwandlung wie in M1." }, { en: "An inner loop that runs size + 1 times reads one element past its window.", de: "Eine innere Schleife, die size + 1 mal läuft, liest ein Element über ihr Fenster hinaus." }, { en: "A window of size elements is k = 0 up to but not including size.", de: "Ein Fenster aus size Elementen ist k = 0 bis ausschließlich size." } ]
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

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m3-02-off-by-one.test.js
```

Beide grün, einschließlich der kurzen Liste und des Falls mit genau einem Fenster. Die Frage-Aufgabe verlangt, das Symptom auf die Ursache zurückzuverfolgen; diese Rückverfolgung ist der übertragbare Teil. Als Nächstes: [Iterieren ganz ohne Indizes](step:m3-03-for-of-and-in).
