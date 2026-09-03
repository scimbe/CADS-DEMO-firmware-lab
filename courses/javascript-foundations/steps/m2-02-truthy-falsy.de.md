---
id: m2-02-truthy-falsy
title: Truthy, falsy und Standardwerte, die deine Werte auffressen
bloom: analyze
objectives: [javascript-web-javascript-guide-control-flow-and-error-handling]
requires: [m2-01-if-switch]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m2-01-if-switch, m1-03-coercion-nan]
links:
  - { step: m2-01-if-switch }
  - { step: m2-03-try-catch-finally }
  - { file: "src/m2/settings.js", line: 8 }
  - { step: m5-02-optional-chaining }
sources: [src/m2/settings.js, test/m2-02-truthy-falsy.test.js]
tasks:
  - id: defaults
    title: Beide Standardwert-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m2-02 withDefaults fills in missing properties", "m2-02 withDefaults keeps falsy values the caller passed on purpose"], minPass: 2 }
  - id: which-question
    title: Fehlend oder falsy
    check: { type: question, prompt: { en: "A caller passes port 0, label \"\" and verbose false. The old code replaced all three with defaults. Explain the difference between asking 'is this value truthy' and asking 'was this value supplied', and name the operator that asks the second question.", de: "Ein Aufrufer übergibt port 0, label \"\" und verbose false. Der alte Code hat alle drei durch Standardwerte ersetzt. Erkläre den Unterschied zwischen der Frage 'ist dieser Wert truthy' und der Frage 'wurde dieser Wert übergeben', und nenne den Operator, der die zweite Frage stellt." }, rubric: "Lists the falsy values (false, 0, -0, 0n, \"\", null, undefined, NaN) and states that || replaces every one of them, whereas ?? replaces only null and undefined, so ?? (or an explicit undefined check) is the right tool for defaulting an option a caller may legitimately set to 0, \"\" or false.", bloom: analyze, minChars: 80 }
socratic:
  - { trigger: "task:defaults:failed", question: { en: "Which of the three properties is still being replaced when the caller supplied it on purpose?", de: "Welche der drei Eigenschaften wird noch ersetzt, obwohl der Aufrufer sie absichtlich übergeben hat?" }, hints: [ { en: "0, the empty string and false are all falsy, so a truthiness test cannot see that they were supplied.", de: "0, die leere Zeichenkette und false sind alle falsy, eine Truthiness-Prüfung kann also nicht sehen, dass sie übergeben wurden." }, { en: "?? falls back only for null and undefined, which is exactly the question being asked here.", de: "?? greift nur bei null und undefined, und genau das ist hier die Frage." }, { en: "verbose has a second problem: value || true can never be false. Use ?? there too.", de: "verbose hat ein zweites Problem: value || true kann nie false sein. Nutze auch dort ??." } ] }
misconceptions:
  - pattern: "8080 !== 0|'untitled' !== ''|true !== false"
    question: { en: "A default replaced a value the caller actually passed. Which operator made that decision, and what does it consider empty?", de: "Ein Standardwert hat einen Wert ersetzt, den der Aufrufer wirklich übergeben hat. Welcher Operator hat das entschieden, und was hält er für leer?" }
    hints: [ { en: "|| and a ternary on truthiness both treat 0, \"\" and false as absent.", de: "|| und ein Ternär auf Truthiness behandeln 0, \"\" und false beide als nicht vorhanden." }, { en: "?? is the nullish coalescing operator: it falls back only for null and undefined.", de: "?? ist der Nullish-Coalescing-Operator: er greift nur bei null und undefined." }, { en: "options.port ?? 8080 keeps a port of 0 and still defaults a missing one.", de: "options.port ?? 8080 behält einen Port 0 und setzt einen fehlenden trotzdem." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Unterscheide „dieser Wert ist leer" von „dieser Wert wurde nie übergeben" und wähle den Operator, der die Frage stellt, die du wirklich meinst.

## Die acht falsy-Werte

Überall, wo JavaScript einen Wahrheitswert braucht - eine `if`-Bedingung, `||`, `&&`, ein Ternär -, wandelt es den übergebenen Wert um. MDNs Kapitel [Control flow](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling) listet die Werte, die zu `false` werden:

```
false    0    -0    0n    ""    null    undefined    NaN
```

Alles andere ist truthy. Auch Dinge, die viele für falsy halten: `"0"`, `"false"`, `[]` und `{}` sind alle truthy, weil sie eine nicht-leere Zeichenkette, eine nicht-leere Zeichenkette, ein Objekt und ein Objekt sind.

## Warum `||` der falsche Standardwert-Operator ist

Die klassische Redewendung für Standardwerte lautet:

```js
const port = options.port || 8080;
```

Sie liest sich als „nimm den Port des Aufrufers, oder 8080, wenn er keinen angegeben hat". Tatsächlich sagt sie „nimm den Port des Aufrufers, außer er ist falsy". Ein Aufrufer, der `0` übergibt - eine echte, absichtliche Portnummer -, bekommt stillschweigend 8080. Dasselbe gilt für ein `label` von `""` und ein `verbose` von `false`. Der letzte Fall ist der schlimmste: `options.verbose || true` kann überhaupt nie `false` ergeben.

Der Operator, der die gemeinte Frage stellt, ist **Nullish Coalescing**:

```js
const port = options.port ?? 8080;
```

`??` greift bei `null` und `undefined` und sonst bei nichts. `0 ?? 8080` ist `0`.

Faustregel: nimm `||`, wenn du wirklich „oder irgendetwas Leeres" meinst, und `??`, wenn du „falls das nicht übergeben wurde" meinst. Bei Optionen, Standardwerten und Konfiguration ist es fast immer `??`. In [M5](step:m5-02-optional-chaining) nutzt du es wieder, dort zusammen mit Optional Chaining.

## Die Aufgabe

Öffne [`src/m2/settings.js`](file:src/m2/settings.js). `withDefaults(options)` muss `port` 8080, `label` `"untitled"` und `verbose` `true` **nur dann** einsetzen, wenn die Eigenschaft fehlt. Drei Zeilen, drei Varianten desselben Fehlers: ein Ternär auf Truthiness, ein `||`, und ein `||`, dessen Standardwert die Flagge unwiderlegbar macht.

Der erste Test besteht bereits: bei einem leeren Objekt stimmen Truthiness und Nullishness überein. Der zweite Test übergibt `{ port: 0, label: "", verbose: false }`, und auf ihn kommt es an.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m2-02-truthy-falsy.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m2-02-truthy-falsy.test.js
```

Beide grün. Sag in der Frage-Aufgabe, was sich an der *gestellten Frage* geändert hat, nicht nur, welchen Operator du getippt hast. Als Nächstes [Fehler, die mit Absicht geworfen werden](step:m2-03-try-catch-finally).
