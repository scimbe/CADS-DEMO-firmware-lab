---
id: m1-03-coercion-nan
title: Typumwandlung, + und der Wert, der nichts gleicht
bloom: analyze
objectives: [javascript-web-javascript-guide-grammar-and-types]
requires: [m1-02-types-typeof]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m1-02-types-typeof, m0-03-read-a-test]
links:
  - { step: m1-02-types-typeof }
  - { step: m1-04-equality }
  - { file: "src/m1/numbers.js", line: 8 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types", title: "MDN: Grammar and types" }
sources: [src/m1/numbers.js, test/m1-03-coercion-nan.test.js]
tasks:
  - id: numbers
    title: Beide Zahlen-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m1-03 sumStrings adds numeric strings as numbers", "m1-03 isValidNumber rejects text that converts to NaN"], minPass: 2 }
  - id: why-silent
    title: Warum keiner der beiden Fehler geworfen hat
    check: { type: question, prompt: { en: "Neither bug threw. For each, name the single step where a wrong type slipped through.", de: "Keiner der Fehler warf. Nenne für jeden die eine Stelle, an der ein falscher Typ durchkam." }, rubric: "Points at one operator in each function: in the first, the one whose behaviour depends on what it is handed; in the second, the one whose verdict is settled in advance. Does not pass: pointing at a printed result rather than an operator, or arguing that either case should have stopped the program.", bloom: analyze, minChars: 60 }
socratic:
  - trigger: "task:numbers:failed"
    question: { en: "Look at the actual value the test printed. Is it a wrong number, or not a number at all?", de: "Sieh dir den tatsächlichen Wert an. Ist es eine falsche Zahl, oder gar keine Zahl?" }
    hints: [ { en: "Quotation marks around a result mean a type changed somewhere before the comparison.", de: "Anführungszeichen um ein Ergebnis heißen, dass sich irgendwo vor dem Vergleich ein Typ geändert hat." }, { en: "Print the running total inside the loop and watch which pass changes its type.", de: "Gib die laufende Summe in der Schleife aus und beobachte, welcher Durchlauf ihren Typ ändert." }, { en: "The second function tests against a value that is unequal to everything, itself included.", de: "Die zweite Funktion prüft gegen einen Wert, der allem ungleich ist, sich selbst eingeschlossen." } ]
  - trigger: "task:why-silent:failed"
    question: { en: "Are you naming the step where the type changed, or the wrong result that came out later?", de: "Nennst du die Stelle, an der der Typ wechselte, oder das falsche Ergebnis danach?" }
    hints: [ { en: "Walk the first function one pass at a time and note the type of the accumulator after each.", de: "Geh die erste Funktion Durchlauf für Durchlauf durch und notiere nach jedem den Typ des Akkumulators." }, { en: "For the second, evaluate the comparison on paper for a value that really is the special one.", de: "Wertes den Vergleich der zweiten auf Papier für einen Wert aus, der wirklich der besondere ist." }, { en: "One of the two operators in this file behaves differently depending on the types it is given.", de: "Einer der beiden Operatoren in dieser Datei verhält sich je nach übergebenen Typen anders." } ]
misconceptions:
  - pattern: "NaN"
    question: { en: "NaN appeared. Which operation produced it, and does the code compare against NaN with an equality operator anywhere?", de: "NaN ist aufgetaucht. Welche Operation hat es erzeugt, und vergleicht der Code irgendwo mit einem Gleichheitsoperator gegen NaN?" }
    hints: [ { en: "NaN comes from an arithmetic operation on something that is not a number, for example Number('abc').", de: "NaN entsteht aus einer Rechenoperation auf etwas, das keine Zahl ist, zum Beispiel Number('abc')." }, { en: "NaN is the only JavaScript value that is not equal to itself, so === against it is always false.", de: "NaN ist der einzige JavaScript-Wert, der sich selbst ungleich ist, also ist === dagegen immer falsch." }, { en: "Use Number.isNaN(x) to detect it, or Number.isFinite(x) to accept only real numbers.", de: "Nutze Number.isNaN(x), um es zu erkennen, oder Number.isFinite(x), um nur echte Zahlen zu akzeptieren." } ]
  - pattern: "'[0-9]+' !== [0-9]+"
    question: { en: "The two sides differ only by quotation marks. What turned your number into a string?", de: "Die beiden Seiten unterscheiden sich nur durch Anführungszeichen. Was hat deine Zahl in eine Zeichenkette verwandelt?" }
    hints: [ { en: "In JavaScript + means addition only when both operands are numbers; otherwise it joins strings.", de: "In JavaScript bedeutet + nur dann Addition, wenn beide Operanden Zahlen sind; sonst hängt es Zeichenketten aneinander." }, { en: "Once one side is a string the whole expression becomes a string, and it stays one for the rest of the loop.", de: "Sobald eine Seite eine Zeichenkette ist, wird der ganze Ausdruck eine Zeichenkette - und bleibt es für den Rest der Schleife." }, { en: "Convert explicitly with Number(...) before you add.", de: "Wandle vor dem Addieren ausdrücklich mit Number(...) um." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Sag vorher, was `+` mit gemischten Typen macht, erkenne `NaN` daran, dass ein Programm nicht abstürzt, sondern still Unsinn liefert, und prüfe korrekt darauf.

## `+` sind zwei Operatoren

Jeder andere Rechenoperator wandelt seine Operanden in Zahlen um. `+` nicht: ist **eine** Seite eine Zeichenkette, hängt `+` Zeichenketten aneinander.

```js
"1" + 2      // "12"   - Verkettung
"1" - 2      // -1     - Subtraktion, "1" wurde also umgewandelt
0 + "1"      // "01"   - und jetzt ist das Ergebnis eine Zeichenkette
```

Deshalb liefert eine Schleife, die mit `let total = 0` beginnt und Zeichenketten addiert, `"0123"` statt `6`. Nichts wirft. Die Funktion gibt einen Wert des falschen Typs zurück, und der Fehler zeigt sich woanders - möglicherweise viel später. MDNs Kapitel [Grammar and types](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types) nennt die Umwandlungsregeln; die praktische Regel ist kürzer: **wandle ausdrücklich um, bevor du rechnest**, mit `Number(x)` oder `parseFloat(x)`.

`Number("")` ist `0`, und `Number(" ")` ebenfalls `0`, was beim Umwandeln von Benutzereingaben überrascht. `parseInt("12px")` ist `12`, `Number("12px")` dagegen `NaN`. Nimm das, dessen Verhalten du wirklich willst.

## NaN ist keine Zahl und sich selbst nicht gleich

`NaN` heißt „not a number" und entsteht bei einer Rechenoperation ohne sinnvolle Zahlantwort: `Number("abc")`, `0 / 0`, `Math.sqrt(-1)`.

Seine bestimmende Eigenschaft erwischt alle:

```js
NaN === NaN     // false
NaN == NaN      // false
```

`NaN` ist der einzige Wert in JavaScript, der sich selbst nicht gleich ist. Jeder Vergleich dagegen ist `false`, eine Prüfung `if (n === NaN)` greift also nie, egal was `n` ist. Die funktionierenden Prüfungen sind:

- `Number.isNaN(n)` - genau dann wahr, wenn der Wert `NaN` ist
- `Number.isFinite(n)` - wahr für echte Zahlen, falsch für `NaN` und beide Unendlichkeiten

Nimm die `Number.`-Varianten. Das nackte globale `isNaN` wandelt sein Argument zuerst um, `isNaN("abc")` ist deshalb `true`, obwohl `"abc"` eine Zeichenkette ist und nicht `NaN`.

## Die Aufgabe

Öffne [`src/m1/numbers.js`](file:src/m1/numbers.js). Zwei Funktionen, beide falsch, keine wirft:

- `sumStrings(["1", "2", "3"])` muss die Zahl `6` liefern. Aktuell liefert sie die Zeichenkette `"0123"`. Wandle jedes Element vor dem Addieren um.
- `isValidNumber("abc")` muss `false` liefern. Sie vergleicht `n === NaN`, was nie wahr ist, und antwortet deshalb auf alles mit `true`. Stell stattdessen die richtige Frage.

Lass zuerst den Test laufen und sieh dir die **tatsächlichen** Werte an, die er ausgibt. Anführungszeichen um ein Ergebnis sind das Erkennungszeichen: eine Zeichenkette ist dort gelandet, wo eine Zahl hingehörte.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m1-03-coercion-nan.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m1-03-coercion-nan.test.js
```

Beide grün. Erkläre danach in der Frage-Aufgabe, warum keiner der beiden Fehler zu einer Fehlermeldung geführt hat. Genau darum geht es in diesem Step: manche Fehler schreien, und diese zwei flüstern. Als Nächstes [Gleichheit](step:m1-04-equality) - dieselbe Geschichte eine Ebene höher.
