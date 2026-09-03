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
    check: { type: question, prompt: { en: "No test ran: the module itself threw. Explain why calling buildBanner at the top of the file was fine even though it is defined below, while reading decorate from inside it was not.", de: "Kein Test lief: das Modul selbst hat geworfen. Erkläre, warum der Aufruf von buildBanner am Dateianfang in Ordnung war, obwohl es weiter unten definiert ist, während das Lesen von decorate darin nicht in Ordnung war." }, rubric: "States that a function declaration is hoisted complete with its body, so buildBanner is callable anywhere in the module, whereas a function expression assigned to a const is only a binding in the temporal dead zone until its line runs - so calling buildBanner before that line reaches decorate too early. Connects it to m1-01: same rule, now with a whole module failing to load.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:banner:failed", question: { en: "Which name did the ReferenceError mention, and which line first initialises it?", de: "Welchen Namen nannte der ReferenceError, und welche Zeile initialisiert ihn zuerst?" }, hints: [ { en: "The module-level line export const DEFAULT_BANNER = buildBanner(\"world\") runs the moment the file loads.", de: "Die Modulzeile export const DEFAULT_BANNER = buildBanner(\"world\") läuft in dem Moment, in dem die Datei geladen wird." }, { en: "At that moment decorate has not been initialised yet, so buildBanner cannot use it.", de: "In diesem Moment ist decorate noch nicht initialisiert, buildBanner kann es also nicht benutzen." }, { en: "Move the const decorate line above the DEFAULT_BANNER line; leave the arrow function an arrow function.", de: "Verschiebe die Zeile const decorate über die DEFAULT_BANNER-Zeile; lass die Pfeilfunktion eine Pfeilfunktion." } ] }
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
