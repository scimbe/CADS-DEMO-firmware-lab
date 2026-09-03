---
id: m3-01-for-and-while
title: for und while, und welche wozu passt
bloom: apply
objectives: [javascript-web-javascript-guide-loops-and-iteration]
requires: [m2-04-error-objects]
estimatedMinutes: 15
scaffold: worked
recallFrom: [m2-01-if-switch, m1-01-let-const]
links:
  - { step: m2-04-error-objects }
  - { step: m3-02-off-by-one }
  - { file: "src/m3/tally.js", line: 8 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration", title: "MDN: Loops and iteration" }
sources: [src/m3/tally.js, test/m3-01-for-and-while.test.js]
tasks:
  - id: tally
    title: Beide Schleifen-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m3-01 countUp builds 1..n and an empty array for 0", "m3-01 sumUntil stops at the first element that reaches stop"], minPass: 2 }
  - id: which-loop
    title: Warum jede Schleife ihre Form bekam
    check: { type: question, prompt: { en: "Why does one function suit a counting head and the other a condition? One sentence each.", de: "Warum passt zu einer Funktion ein Zählkopf und zur anderen eine Bedingung? Je ein Satz." }, rubric: "Ties the first to a trip count that is known before the loop starts, and the second to a stop that only the data can decide. Does not pass: an answer based on which form is shorter or more familiar, or one that says both would work without naming what differs.", bloom: understand, minChars: 40 }
socratic:
  - trigger: "task:tally:failed"
    question: { en: "Which function fails, and does it stop too early, too late, or never?", de: "Welche Funktion scheitert, und hört sie zu früh, zu spät oder nie auf?" }
    hints: [ { en: "Try each function with the smallest input the test uses and say what it should return there.", de: "Probier jede Funktion mit der kleinsten Eingabe des Tests und sag, was sie dort liefern soll." }, { en: "For the second, list the two things that must both hold for another pass to be safe.", de: "Liste für die zweite die zwei Dinge auf, die beide gelten müssen, damit ein weiterer Durchlauf sicher ist." }, { en: "Those two things have to be checked in one order only, because one of them protects the other.", de: "Diese zwei Dinge dürfen nur in einer Reihenfolge geprüft werden, weil eines das andere schützt." } ]
  - trigger: "task:which-loop:failed"
    question: { en: "Does your answer name what is known before the loop starts, or only which form you prefer?", de: "Nennt deine Antwort, was vor dem Schleifenstart bekannt ist, oder nur die bevorzugte Form?" }
    hints: [ { en: "For each function, ask how many passes you could predict before the first one runs.", de: "Frag für jede Funktion, wie viele Durchläufe du vor dem ersten vorhersagen könntest." }, { en: "One answer is a number you can compute from the argument; the other depends on the contents.", de: "Eine Antwort ist eine aus dem Argument berechenbare Zahl; die andere hängt vom Inhalt ab." }, { en: "The third form in the chapter differs from these two only in when it asks, which is the tell.", de: "Die dritte Form des Kapitels unterscheidet sich von diesen zwei nur darin, wann sie fragt, und das ist der Hinweis." } ]
misconceptions:
  - pattern: "Cannot read properties of undefined"
    question: { en: "The loop reached past the last element. Which condition let it get there?", de: "Die Schleife ist über das letzte Element hinausgelaufen. Welche Bedingung hat das zugelassen?" }
    hints: [ { en: "Reading list[i] beyond the end gives undefined; the error appears one step later, when something is done with it.", de: "list[i] hinter dem Ende zu lesen liefert undefined; der Fehler erscheint einen Schritt später, wenn damit etwas gemacht wird." }, { en: "The last valid index is list.length - 1, so the condition is i < list.length.", de: "Der letzte gültige Index ist list.length - 1, die Bedingung lautet also i < list.length." }, { en: "In a compound condition, test the index before you use it: && evaluates left to right and stops early.", de: "Prüfe in einer zusammengesetzten Bedingung den Index, bevor du ihn benutzt: && wertet von links nach rechts aus und bricht früh ab." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Wähle die Schleife, die zum Problem passt: eine zählende `for`, wenn die Anzahl der Durchläufe feststeht, eine `while`, wenn eine Bedingung unterwegs entscheidet.

## Die drei Formen

MDNs Kapitel [Loops and iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration) zählt sie auf; der praktisch entscheidende Unterschied ist, **wann die Bedingung geprüft wird**.

```js
for (let i = 0; i < n; i++) { … }   // Initialisierung, Bedingung, Fortschaltung in einem Kopf
while (condition) { … }             // Bedingung vor jedem Durchlauf geprüft
do { … } while (condition);         // Bedingung danach geprüft - läuft mindestens einmal
```

Ein `for`-Kopf hält die drei Teile einer gezählten Schleife zusammen, ein Leser sieht die Anzahl der Durchläufe also auf einen Blick. Ein `while`-Kopf sagt: „Ich weiß nicht, wie viele Durchläufe; diese Bedingung entscheidet." `do...while` ist der seltene Fall: es führt den Rumpf aus, bevor es fragt, läuft also immer mindestens einmal. Nimm es nur, wenn du genau das meinst.

Deklariere den Zähler im Kopf mit `let`. Aus [M1](step:m1-01-let-const) weißt du, dass `const i` bei der ersten Fortschaltung scheitern würde - und dass `let` im `for`-Kopf **pro Durchlauf eine frische Bindung** erzeugt, was in [M4](step:m4-03-closures) wichtig wird.

## Zwei Bedingungen, in der richtigen Reihenfolge

`sumUntil` muss weiterlaufen, solange zwei Dinge gelten: es gibt noch ein Element, und dieses Element liegt unter dem Stoppwert. Als eine Bedingung geschrieben:

```js
while (i < list.length && list[i] < stop) { … }
```

Die Reihenfolge ist nicht kosmetisch. `&&` wertet von links nach rechts aus und bricht ab, sobald die Antwort feststeht, die Indexprüfung schützt also den Array-Zugriff. Vertausch die beiden, und der letzte Durchlauf liest `list[list.length]`, was `undefined` ist, und `undefined < stop` ergibt `false` - dieser Tausch scheitert also still. In [dem nächsten Step](step:m3-02-off-by-one) scheitert derselbe Fehler stattdessen laut.

## Die Aufgabe

Öffne [`src/m3/tally.js`](file:src/m3/tally.js). Beide Funktionen werfen; schreib sie.

- `countUp(n)` liefert `[1, 2, …, n]` und `[]` für `n = 0`. Die Anzahl der Durchläufe steht vor dem Start fest - das ist eine `for`.
- `sumUntil(list, stop)` addiert die Zahlen vor dem ersten Element, das `stop` erreicht. Niemand weiß vorher, wie viele das sind - das ist eine `while`.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m3-01-for-and-while.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m3-01-for-and-while.test.js
```

Beide grün. Beantworte danach die Frage-Aufgabe. Hier geht es um die *Wahl* der Schleife; [im nächsten Step](step:m3-02-off-by-one) geht es darum, die Grenzen der gewählten richtig zu setzen.
