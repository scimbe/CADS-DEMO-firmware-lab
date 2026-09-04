---
id: m3-04-break-continue
title: break, continue und ein benannter Ausgang
bloom: apply
objectives: [javascript-web-javascript-guide-loops-and-iteration]
requires: [m3-03-for-of-and-in]
estimatedMinutes: 15
scaffold: independent
recallFrom: [m3-03-for-of-and-in, m2-01-if-switch]
links:
  - { step: m3-03-for-of-and-in }
  - { step: m4-01-declare-and-call }
  - { file: "src/m3/search.js", line: 8 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration", title: "MDN: Loops and iteration" }
sources: [src/m3/search.js, test/m3-04-break-continue.test.js, src/m3/iterate.js]
tasks:
  - id: search
    title: Alle drei Such-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m3-04 stripComments drops empty and commented lines", "m3-04 findInGrid reports the first hit row by row", "m3-04 findInGrid leaves both loops at the first hit"], minPass: 3 }
  - id: label-or-return
    title: Marke, Flagge oder return
    check: { type: question, prompt: { en: "Name three ways to leave both loops at the first hit, one line each, and pick one.", de: "Nenne drei Wege, beide Schleifen beim ersten Treffer zu verlassen, je eine Zeile, und wähle einen." }, rubric: "Three distinct mechanisms plus a choice with a reason. Accepts any of the three as the pick, provided the reason refers to this function rather than to taste. Does not pass: fewer than three distinct mechanisms, a pick with no reason, or a mechanism that leaves only the inner loop.", bloom: evaluate, minChars: 60 }
socratic:
  - trigger: "task:search:failed"
    question: { en: "Is the failure about which lines survive, or about how far the scan went before it stopped?", de: "Geht es um die überlebenden Zeilen oder darum, wie weit der Durchlauf lief, bevor er anhielt?" }
    hints: [ { en: "Read the three test names; one of them measures work done rather than the answer.", de: "Lies die drei Testnamen; einer misst geleistete Arbeit statt der Antwort." }, { en: "For the first function, decide per line whether the rest of the pass should run at all.", de: "Entscheide bei der ersten Funktion je Zeile, ob der Rest des Durchlaufs überhaupt laufen soll." }, { en: "For the second, an unlabelled exit ends only the loop that contains it, and there are two.", de: "Beim zweiten beendet ein unbenannter Ausgang nur die Schleife, die ihn enthält, und es sind zwei." } ]
  - trigger: "task:label-or-return:failed"
    question: { en: "Do your three entries differ in mechanism, or only in wording?", de: "Unterscheiden sich deine drei Einträge im Mechanismus oder nur in der Formulierung?" }
    hints: [ { en: "Write the inner loop's exit for each of your three and see which ones touch the outer head.", de: "Schreib für jeden deiner drei den Ausgang der inneren Schleife und sieh, welche den äußeren Kopf berühren." }, { en: "One needs a name on a loop, one needs extra state, and one leaves the function altogether.", de: "Einer braucht einen Namen an einer Schleife, einer zusätzlichen Zustand, und einer verlässt die Funktion ganz." }, { en: "The pick is easiest to defend from what else the function does after the loops.", de: "Die Wahl lässt sich am leichtesten damit begründen, was die Funktion nach den Schleifen noch tut." } ]
misconceptions:
  - pattern: "4 !== 2|visits"
    question: { en: "The scan kept going after it found the target. Which loop did your break actually leave?", de: "Der Durchlauf lief nach dem Fund weiter. Welche Schleife hat dein break tatsächlich verlassen?" }
    hints: [ { en: "An unlabelled break leaves only the innermost loop containing it.", de: "Ein unbenanntes break verlässt nur die innerste Schleife, die es enthält." }, { en: "The outer loop then starts its next row and keeps searching.", de: "Die äußere Schleife beginnt danach ihre nächste Zeile und sucht weiter." }, { en: "Two of the three mechanisms leave both loops in one statement; the third needs the outer condition to cooperate.", de: "Zwei der drei Mechanismen verlassen beide Schleifen in einer Anweisung; der dritte braucht die Mithilfe der äußeren Bedingung." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Verlasse eine Schleife im richtigen Moment: einen Durchlauf mit `continue` überspringen, eine Schleife mit `break` beenden, und zwei mit einer Marke oder einem `return`.

## continue und break

```js
for (const line of lines) {
  if (line === "") continue;     // Rest DIESES Durchlaufs überspringen
  if (done) break;               // DIESE Schleife ganz verlassen
  …
}
```

`continue` ist die Wächter-Klausel der Schleifen. Eine Kette von `continue` am Anfang eines Rumpfes liest sich deutlich besser als dieselbe Logik in verschachtelten `if`, aus demselben Grund, aus dem ein frühes `return` sich besser liest als ein `else`.

`break` verlässt **die innerste Schleife, die es enthält**, und nur diese. Bei einer einzelnen Schleife ist das offensichtlich. Bei verschachtelten Schleifen ist es der Fehler in diesem Step.

## Marken

MDNs Kapitel [Loops and iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration) dokumentiert benannte Anweisungen: ein Name vor einer Schleife, den `break` und `continue` dann ansteuern können.

```js
outer: for (let row = 0; row < grid.length; row++) {
  for (let col = 0; col < grid[row].length; col++) {
    if (grid[row][col] === target) {
      found = { row, col };
      break outer;          // verlässt BEIDE Schleifen
    }
  }
}
```

Das ist die eine Stelle, an der sich Marken lohnen. Die Alternativen sind eine Flagge, die die äußere Bedingung mitprüfen muss - korrekt, aber die Bedingung sagt jetzt zwei Dinge auf einmal -, oder ein `return` direkt aus der Funktion, was am saubersten ist, wenn die Schleifen die ganze Funktion sind. Erkenne alle drei; die Frage-Aufgabe verlangt eine Wahl.

## Warum es den dritten Test gibt

`findInGrid` könnte die ersten beiden Tests bestehen und trotzdem das gesamte Gitter durchsuchen: die Antwort wäre richtig und die Arbeit vergeudet. Der dritte Test zählt die Element-Zugriffe über einen `Proxy` und verlangt genau zwei, „es liefert zufällig das Richtige" reicht also nicht. Tests, die prüfen, *wie viel* Arbeit getan wurde und nicht nur das Ergebnis, sollte man kennen - einen ähnlichen schreibst du im [Abschlussprojekt](step:m7-02-capstone-build).

## Die Aufgabe

Öffne [`src/m3/search.js`](file:src/m3/search.js). Beide Funktionen werfen; schreib sie.

- `stripComments(lines)` behält die Zeilen, die weder leer sind noch mit `"#"` beginnen. Nutze `continue`.
- `findInGrid(grid, target)` liefert `{ row, col }` für das erste Vorkommen, zeilenweise durchsucht, oder `null`. Beide Schleifen müssen beim Treffer anhalten.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `>Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m3-04-break-continue.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m3-04-break-continue.test.js
```

Drei grün, einschließlich der Zugriffszählung. Damit ist M3 abgeschlossen; [M4](step:m4-01-declare-and-call) wendet sich den Funktionen selbst zu.
