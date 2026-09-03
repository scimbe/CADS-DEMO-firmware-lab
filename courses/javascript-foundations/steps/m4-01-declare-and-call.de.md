---
id: m4-01-declare-and-call
title: Deklarationen, Ausdrücke und wann ein Name existiert
bloom: understand
objectives: [javascript-web-javascript-guide-functions]
requires: [m3-04-break-continue]
estimatedMinutes: 15
scaffold: worked
recallFrom: [m1-01-let-const, m0-04-modules]
links:
  - { step: m3-04-break-continue }
  - { step: m4-02-parameters }
  - { file: "src/m4/greet.js", line: 12 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions", title: "MDN: Functions" }
sources: [src/m4/greet.js, test/m4-01-declare-and-call.test.js, src/m1/counter.js]
tasks:
  - id: banner
    title: Alle drei Banner-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m4-01 buildBanner decorates the salute", "m4-01 the module-level banner is computed at load time", "m4-01 bannerLength counts the finished banner"], minPass: 3 }
  - id: hoisting
    title: Warum die ganze Datei sich weigerte zu laden
    check: { type: question, prompt: { en: "One name was reachable from the top of the file and one was not. Why? Two sentences.", de: "Ein Name war vom Dateianfang erreichbar, einer nicht. Warum? Zwei Sätze." }, rubric: "Distinguishes a form that is available in full throughout its scope from a form that only becomes readable when its own line has run, and connects that to the order module statements execute in. Does not pass: an answer that says one is a function and the other is not, or one that names the fix without saying what differs between the two forms.", bloom: analyze, minChars: 50 }
socratic:
  - trigger: "task:banner:failed"
    question: { en: "Which name did the failure mention, and which line first gives that name a value?", de: "Welchen Namen nannte der Fehlschlag, und welche Zeile gibt ihm zuerst einen Wert?" }
    hints: [ { en: "No test ran at all, so look at what the file does while it is being loaded, not at any function.", de: "Kein Test lief, sieh also an, was die Datei beim Laden tut, nicht eine Funktion." }, { en: "Find the statement at the top level that calls something, and list what it needs to be ready.", de: "Finde die Anweisung auf oberster Ebene, die etwas aufruft, und liste auf, was dafür bereit sein muss." }, { en: "Exactly one thing it needs is not ready yet, and only its position has to change.", de: "Genau eines davon ist noch nicht bereit, und nur seine Position muss sich ändern." } ]
  - trigger: "task:hoisting:failed"
    question: { en: "Does your answer explain the difference between the two forms, or only which one failed?", de: "Erklärt deine Antwort den Unterschied der beiden Formen, oder nur, welche scheiterte?" }
    hints: [ { en: "Try calling each of the two from the very first line of a scratch file and note which complains.", de: "Ruf beide von der ersten Zeile einer Testdatei aus auf und notiere, welche sich beschwert." }, { en: "One of them is complete before any line runs; the other is only a name until its line runs.", de: "Eine ist vollständig, bevor eine Zeile läuft; die andere ist bis zu ihrer Zeile nur ein Name." }, { en: "You met the same rule in M1 on a single variable; here it takes a whole file with it.", de: "Dieselbe Regel hast du in M1 an einer Variable gesehen; hier reißt sie eine ganze Datei mit." } ]
misconceptions:
  - pattern: "Cannot access .* before initialization"
    question: { en: "Which line runs first when this module loads, and which binding does it need that does not exist yet?", de: "Welche Zeile läuft beim Laden dieses Moduls zuerst, und welche Bindung braucht sie, die es noch nicht gibt?" }
    hints: [ { en: "Module bodies run top to bottom on load; a top-level call happens before the lines below it.", de: "Modulrümpfe laufen beim Laden von oben nach unten; ein Aufruf auf oberster Ebene passiert vor den Zeilen darunter." }, { en: "function declarations are hoisted with their body; const arrow functions are not.", de: "function-Deklarationen werden mitsamt Rumpf hochgezogen; const-Pfeilfunktionen nicht." }, { en: "This is the temporal dead zone from m1-01, one file larger.", de: "Das ist die Temporal Dead Zone aus m1-01, eine Dateigröße größer." } ]
  - pattern: "is not a function"
    question: { en: "A name existed but did not hold a function when it was called. What did it hold?", de: "Ein Name existierte, hielt beim Aufruf aber keine Funktion. Was hielt er?" }
    hints: [ { en: "var declarations hoist as undefined, so calling one too early gives 'is not a function' rather than a ReferenceError.", de: "var-Deklarationen werden als undefined hochgezogen, ein zu früher Aufruf ergibt also 'is not a function' statt eines ReferenceError." }, { en: "This course uses let and const only; if you introduced a var, that is the difference you are seeing.", de: "Dieser Kurs benutzt nur let und const; wenn du ein var eingeführt hast, ist das der Unterschied, den du siehst." }, { en: "Keep the declarations as they are and change only their order.", de: "Lass die Deklarationen, wie sie sind, und ändere nur ihre Reihenfolge." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Kenne den Unterschied zwischen Funktionsdeklaration und Funktionsausdruck und sag vorher, welche Namen zu welchem Zeitpunkt während des Modulladens existieren.

## Zwei Arten, eine Funktion zu bauen

```js
function salute(name) { … }            // Deklaration
const decorate = (text) => …;          // Ausdruck, einer const zugewiesen
```

Beide erzeugen denselben Wert-Typ. Sie unterscheiden sich darin, **ab wann der Name benutzbar ist**, und MDNs Kapitel [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) sagt es klar:

- Eine **Deklaration** wird samt Rumpf hochgezogen. Der Name ist überall im umgebenden Gültigkeitsbereich aufrufbar, auch in Zeilen über der Definition.
- Ein **Funktionsausdruck** ist ein Wert, der einer Bindung zugewiesen wird. Bei `const` oder `let` liegt diese Bindung bis zu ihrer eigenen Zeile in der Temporal Dead Zone aus [M1](step:m1-01-let-const).

Das hier funktioniert also:

```js
console.log(salute("Ada"));
function salute(n) { return "Hi, " + n; }
```

und das hier nicht:

```js
console.log(decorate("x"));
const decorate = (t) => t;   // ReferenceError: Cannot access 'decorate' before initialization
```

## Modulrümpfe laufen von oben nach unten

Die Anweisungen auf oberster Modulebene werden beim Laden der Datei der Reihe nach ausgeführt. Ein `const X = f()` auf oberster Ebene ruft `f` also *in diesem Moment* auf, mit nur den darüber stehenden Bindungen initialisiert - selbst wenn `f` selbst eine weiter unten stehende hochgezogene Deklaration ist.

Deshalb schlägt die Übung dieses Steps auf eine Art fehl, die du seit [m0-04](step:m0-04-modules) nicht mehr gesehen hast: **kein einziger Test läuft**. Das Modul wirft beim Laden, die Testdatei bekommt ihre Importe also nie. Ein durchgestrichener Dateiname ohne einzelne Testergebnisse ist das Erkennungszeichen.

## Die Aufgabe

Öffne [`src/m4/greet.js`](file:src/m4/greet.js). Lass zuerst den Test laufen und lies den Fehlschlag:

```bash
node --test test/m4-01-declare-and-call.test.js
```

```
ReferenceError: Cannot access 'decorate' before initialization
```

`buildBanner` ist eine Deklaration, der Aufruf in der ersten Zeile ist also in Ordnung. Darin ist `decorate` eine weiter unten definierte `const`-Pfeilfunktion, und zur Ladezeit ist diese Zeile noch nicht gelaufen.

Behebe es, indem du genau das verschiebst, was verschoben werden muss. Wandle die Pfeilfunktion nicht in eine Deklaration um: es geht darum zu sehen, dass dieser Fehler von der Reihenfolge handelt und nicht von der Wahl des Schlüsselworts.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m4-01-declare-and-call.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

Drei Tests grün. Erkläre danach in der Frage-Aufgabe, warum einer der beiden Namen von oben erreichbar war und der andere nicht. Als Nächstes: [was eine Funktion mit ihren Argumenten macht](step:m4-02-parameters).
