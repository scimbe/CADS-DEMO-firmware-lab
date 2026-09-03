---
id: m1-04-equality
title: "== gegen ===, und der eine Fall, den === falsch beantwortet"
bloom: analyze
objectives: [javascript-web-javascript-guide-grammar-and-types]
requires: [m1-03-coercion-nan]
estimatedMinutes: 15
scaffold: independent
recallFrom: [m1-03-coercion-nan]
links:
  - { step: m1-03-coercion-nan }
  - { step: m2-01-if-switch }
  - { file: "src/m1/lookup.js", line: 9 }
  - { file: "test/m1-04-equality.test.js" }
sources: [src/m1/lookup.js, test/m1-04-equality.test.js, src/m1/numbers.js]
tasks:
  - id: lookup
    title: Beide lookup-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m1-04 findById compares ids without type conversion", "m1-04 sameValue treats NaN as the same value and never converts types"], minPass: 2 }
  - id: three-operators
    title: Wähle zwischen drei Vergleichen
    check: { type: question, prompt: { en: "JavaScript offers ==, === and Object.is. Give one concrete case for each where it is the right choice, and say which of the three you would forbid in a code base and why.", de: "JavaScript bietet ==, === und Object.is. Nenne für jedes einen konkreten Fall, in dem es die richtige Wahl ist, und sag, welches der drei du in einer Codebasis verbieten würdest und warum." }, rubric: "Describes == as converting types before comparing (its only defensible use being x == null to catch null and undefined together), === as comparing type and value without conversion (the default), and Object.is as === except that it treats NaN as equal to itself and distinguishes 0 from -0. Argues for banning == on the grounds that its conversion table is not memorable and its intent is not visible at the call site.", bloom: evaluate, minChars: 100 }
socratic:
  - { trigger: "task:lookup:failed", question: { en: "Which of the two functions still fails - the one that must NOT convert types, or the one that must recognise NaN?", de: "Welche der beiden Funktionen schlägt noch fehl - die, die NICHT umwandeln darf, oder die, die NaN erkennen muss?" }, hints: [ { en: "findById uses ==, so the string '1' matches the number 1. The test demands that it does not.", de: "findById benutzt ==, deshalb passt die Zeichenkette '1' auf die Zahl 1. Der Test verlangt, dass sie das nicht tut." }, { en: "=== fixes findById, but it cannot fix sameValue: NaN === NaN is false.", de: "=== behebt findById, kann aber sameValue nicht beheben: NaN === NaN ist false." }, { en: "Object.is(a, b) is === plus the NaN case; that is exactly what sameValue needs.", de: "Object.is(a, b) ist === plus den NaN-Fall; genau das braucht sameValue." } ] }
misconceptions:
  - pattern: "sameValue|findById"
    question: { en: "Which comparison is in that line, and does the test want type conversion to happen there or not?", de: "Welcher Vergleich steht in dieser Zeile, und will der Test dort eine Typumwandlung oder nicht?" }
    hints: [ { en: "== converts before comparing, so '1' == 1 is true; === does not convert, so it is false.", de: "== wandelt vor dem Vergleich um, '1' == 1 ist also true; === wandelt nicht um und ist deshalb false." }, { en: "Neither == nor === can report NaN as equal to itself.", de: "Weder == noch === kann NaN als sich selbst gleich melden." }, { en: "Object.is is the third option and the only one that treats NaN as the same value.", de: "Object.is ist die dritte Möglichkeit und die einzige, die NaN als denselben Wert behandelt." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Wähle einen Vergleichsoperator mit Absicht. Wisse, was `==` umwandelt, warum `===` der Standard ist, und den einen Fall, in dem `===` trotzdem die Antwort gibt, die du nicht willst.

## Drei Operatoren, drei Verhalten

```js
"1" == 1              // true   - == wandelt um, dann vergleicht es
"1" === 1             // false  - === vergleicht Typ und Wert
Object.is("1", 1)     // false  - wie ===
```

`==` arbeitet vor dem Vergleich eine Umwandlungstabelle ab. Die Tabelle ist real, spezifiziert und in sich stimmig - und fast niemand kann sie aufsagen. `0 == ""`, `0 == "0"` und `"" == "0"` stimmen nicht alle miteinander überein, und das allein ist Grund genug, `==` liegen zu lassen.

`===` vergleicht ohne Umwandlung. Es ist der Standard in diesem Kurs, und es ist das, was `node:assert/strict` intern verwendet - deshalb sind die Tests, die du bisher gelesen hast, so streng bei `"12"` gegen `12`.

Die eine vertretbare Verwendung von `==` ist die Null-Prüfung:

```js
if (value == null) { … }   // wahr für null UND undefined, für nichts sonst
```

Diese eine Redewendung ist verbreitet und sicher. Alles andere sollte `===` sein.

## Wo `===` nicht reicht

Aus [dem vorigen Step](step:m1-03-coercion-nan) weißt du, dass `NaN === NaN` `false` ist. Weder `==` noch `===` kann also die Frage „sind das derselbe Wert?" beantworten, wenn der Wert zufällig `NaN` ist. Dafür gibt es `Object.is`:

```js
Object.is(NaN, NaN)   // true
NaN === NaN           // false

Object.is(0, -0)      // false
0 === -0              // true
```

`Object.is` ist `===` mit diesen beiden Korrekturen. Nimm es, wenn du *derselbe Wert* meinst statt *gleich*; nimm `===` für alles andere.

Noch etwas, das viele erwischt und in [M5](step:m5-01-objects) zurückkommt: Objekte vergleichen sich über ihre Identität, nie über ihren Inhalt.

```js
{ a: 1 } === { a: 1 }   // false - zwei verschiedene Objekte
```

Strukturen zu vergleichen übernimmt in den Tests `assert.deepEqual` für dich.

## Die Aufgabe

Öffne [`src/m1/lookup.js`](file:src/m1/lookup.js):

- `findById(items, "1")` darf das Element mit der Zahl `1` als `id` **nicht** finden. Die Funktion benutzt `==` und findet es deshalb. Ändere den Vergleich.
- `sameValue(NaN, NaN)` muss `true` sein und `sameValue(1, "1")` muss `false` sein. Kein Gleichheitsoperator kann beides. Nimm die dritte Möglichkeit.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m1-04-equality.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m1-04-equality.test.js
```

Beide Tests grün. Die Frage-Aufgabe verlangt, alle drei Möglichkeiten zu begründen - dieses Urteil, nicht die Syntax, war das Ziel von M1. Mit verstandenen Werten wendet sich [M2](step:m2-01-if-switch) den Entscheidungen zu, die ein Programm damit trifft.
