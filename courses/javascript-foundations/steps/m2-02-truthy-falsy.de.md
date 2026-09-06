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
    check: { type: question, prompt: { en: "A caller passes 0 and a line written as `value || fallback` replaces it. Which question does that line ask, and which one was meant? Two sentences.", de: "Ein Aufrufer übergibt 0, und eine Zeile der Form `value || fallback` ersetzt sie. Welche Frage stellt diese Zeile, und welche war gemeint? Zwei Sätze." }, rubric: "Trennt die Prüfung, die diese Zeile durchführt, von der Prüfung, die gemeint war, und nennt einen Operator, der zur gemeinten passt. Besteht nicht: eine Aufzählung, welche Werte als leer gelten, oder ein genannter Ersatz, ohne beide Prüfungen zu benennen.", bloom: analyze, minChars: 50 }
socratic:
  - trigger: "task:defaults:failed"
    question: { en: "Which of the three properties is still replaced although the caller supplied it?", de: "Welche der drei Eigenschaften wird noch ersetzt, obwohl der Aufrufer sie übergab?" }
    hints: [ { en: "Run the second assertion alone; it passes the three values a truthiness test cannot see.", de: "Lass die zweite Assertion allein laufen; sie übergibt die drei Werte, die eine Truthiness-Prüfung nicht sieht." }, { en: "For each of the three lines, ask what it does when the property is present and empty.", de: "Frag für jede der drei Zeilen, was sie tut, wenn die Eigenschaft vorhanden und leer ist." }, { en: "One of the three lines cannot produce a false result at all, whatever the caller passes.", de: "Eine der drei Zeilen kann überhaupt kein false liefern, was der Aufrufer auch übergibt." } ]
  - trigger: "task:which-question:failed"
    question: { en: "Are you naming two different questions, or one question and its fix?", de: "Nennst du zwei verschiedene Fragen, oder eine Frage und ihre Korrektur?" }
    hints: [ { en: "Write down what each of the two questions answers for the value zero.", de: "Schreib auf, was jede der beiden Fragen für den Wert null antwortet." }, { en: "Only two values in the language mean that nobody supplied anything; the empty ones are a longer list.", de: "Nur zwei Werte der Sprache bedeuten, dass niemand etwas übergeben hat; die leeren sind eine längere Liste." }, { en: "The operator you want is the one whose list is exactly those two.", de: "Der gesuchte Operator ist der, dessen Liste genau diese beiden ist." } ]
misconceptions:
  - pattern: "8080 !== 0|'untitled' !== ''|true !== false"
    question: { en: "A default replaced a value the caller actually passed. Which operator made that decision, and what does it consider empty?", de: "Ein Standardwert hat einen Wert ersetzt, den der Aufrufer wirklich übergeben hat. Welcher Operator hat das entschieden, und was hält er für leer?" }
    hints: [ { en: "|| and a ternary on truthiness both treat 0, \"\" and false as absent.", de: "|| und ein Ternär auf Truthiness behandeln 0, \"\" und false beide als nicht vorhanden." }, { en: "?? is the nullish coalescing operator: it falls back only for null and undefined.", de: "?? ist der Nullish-Coalescing-Operator: er greift nur bei null und undefined." }, { en: "One operator falls back for exactly the two values that mean absent, and for nothing else.", de: "Ein Operator greift für genau die zwei Werte, die Abwesenheit bedeuten, und für nichts sonst." } ]
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

::: do palette="> Terminal: Create New Terminal"
Öffne ein Terminal. Von Hand: Menü **Terminal > New Terminal**, oder **F1** und der oben genannte Befehl.
> expect: Am unteren Fensterrand öffnet sich ein Panel mit einem Prompt darin, und der Prompt endet auf `javascript-foundations`.
> recover: Antwortet die Palette *No matching results*, fehlt das führende `>`; ohne dieses Zeichen sucht die Palette nach Dateinamen statt nach Befehlen. Öffnet sich gar nichts, nimm **F1** statt Strg+Umschalt+P, das der Browser für sich behalten kann. Endet der Prompt auf einem anderen Ordner, tippe `cd javascript-foundations` ins Terminal.
:::

Führe dann aus:

```bash
node --test test/m2-02-truthy-falsy.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m2-02-truthy-falsy.test.js
```

Beide grün. Sag in der Frage-Aufgabe, was sich an der *gestellten Frage* geändert hat, nicht nur, welchen Operator du getippt hast. Als Nächstes [Fehler, die mit Absicht geworfen werden](step:m2-03-try-catch-finally).
