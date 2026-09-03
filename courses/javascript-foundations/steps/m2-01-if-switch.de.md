---
id: m2-01-if-switch
title: if, else und ein switch, der durchfällt
bloom: apply
objectives: [javascript-web-javascript-guide-control-flow-and-error-handling]
requires: [m1-04-equality]
estimatedMinutes: 15
scaffold: worked
recallFrom: [m1-04-equality]
links:
  - { step: m1-04-equality }
  - { step: m2-02-truthy-falsy }
  - { file: "src/m2/grade.js", line: 7 }
  - { file: "examples/m2-switch-fallthrough.js" }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling", title: "MDN: Control flow and error handling" }
sources: [src/m2/grade.js, test/m2-01-if-switch.test.js, examples/m2-switch-fallthrough.js]
tasks:
  - id: guess-fallthrough
    title: Sag vorher, was das switch-Beispiel ausgibt
    check: { type: predict, prompt: { en: "examples/m2-switch-fallthrough.js calls price() three times with 'Apples', 'Cherries' and 'Mangoes'. Write down every line you expect, in order, and count them.", de: "examples/m2-switch-fallthrough.js ruft price() dreimal auf, mit 'Apples', 'Cherries' und 'Mangoes'. Schreib jede erwartete Zeile in der richtigen Reihenfolge auf und zähle sie." }, then: { type: command, command: "node examples/m2-switch-fallthrough.js", expectExitCode: 0, expectStdout: "Bananas" }, rubric: "Sets the predicted line count against the printed one and names the call that produced more lines than expected. Does not pass: a prediction of three lines defended after the fact, or an answer that reports the output without naming which call surprised them.", bloom: evaluate }
  - id: grade
    title: Beide Benotungs-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m2-01 letterGrade handles the boundaries", "m2-01 dayKind does not fall through from weekend to weekday"], minPass: 2 }
  - id: fallthrough-intent
    title: Wann Durchfallen Absicht ist
    check: { type: question, prompt: { en: "Fall-through is a bug here and a feature two lines up. What does a reader see that tells them apart?", de: "Durchfallen ist hier ein Fehler und zwei Zeilen höher Absicht. Woran erkennt ein Leser den Unterschied?" }, rubric: "Names the visible difference: stacked labels with nothing between them against a body that runs statements and then continues. Adds that a body meant to continue needs a comment, because nothing in the syntax marks it. Does not pass: an answer that only says break is missing, or one that calls all fall-through a mistake.", bloom: understand, minChars: 50 }
socratic:
  - trigger: "task:guess-fallthrough:failed"
    question: { en: "How many lines did you predict, and how many appeared?", de: "Wie viele Zeilen hast du vorhergesagt, und wie viele erschienen?" }
    hints: [ { en: "Three calls are made; count the print statements each one can reach.", de: "Es werden drei Aufrufe gemacht; zähl die Ausgaben, die jeder erreichen kann." }, { en: "Follow the first call with your finger from its matching label downwards, not just to its own body.", de: "Verfolge den ersten Aufruf mit dem Finger von seiner Marke abwärts, nicht nur bis zu seinem Rumpf." }, { en: "One of the three reaches a body that was written for a different value.", de: "Einer der drei erreicht einen Rumpf, der für einen anderen Wert geschrieben wurde." } ]
  - trigger: "task:grade:failed"
    question: { en: "Is the failure a score sitting exactly on a boundary, or a day coming back as the wrong kind?", de: "Ist der Fehlschlag eine Punktzahl genau auf einer Grenze oder ein Tag der falschen Art?" }
    hints: [ { en: "Write the four ranges out with both endpoints and mark which endpoint each comparison includes.", de: "Schreib die vier Bereiche mit beiden Enden auf und markiere, welches Ende jeder Vergleich einschließt." }, { en: "For the day, print the variable after every case body to see where it last changed.", de: "Gib beim Tag die Variable nach jedem case-Rumpf aus, um zu sehen, wo sie sich zuletzt änderte." }, { en: "One branch excludes a single value, and one body keeps running after it has already answered.", de: "Ein Zweig schließt einen einzigen Wert aus, und ein Rumpf läuft weiter, nachdem er schon geantwortet hat." } ]
  - trigger: "task:fallthrough-intent:failed"
    question: { en: "Does your answer describe something a reader can see, or only what the code does?", de: "Beschreibt deine Antwort etwas, das ein Leser sieht, oder nur, was der Code tut?" }
    hints: [ { en: "Put the intended fall-through and the accidental one side by side and look at what sits between the labels.", de: "Stell gewolltes und versehentliches Durchfallen nebeneinander und sieh, was zwischen den Marken steht." }, { en: "One of the two has no statements at all between one label and the next.", de: "Bei einem der beiden stehen zwischen einer Marke und der nächsten überhaupt keine Anweisungen." }, { en: "Since the syntax marks neither, anything deliberate has to be marked by the author.", de: "Da die Syntax keines von beiden markiert, muss Absicht der Autor markieren." } ]
misconceptions:
  - pattern: "[+] 'weekday'"
    question: { en: "The weekend branch ran and then something overwrote its answer. What ends a case in JavaScript?", de: "Der Wochenend-Zweig lief, und dann hat etwas seine Antwort überschrieben. Was beendet einen case in JavaScript?" }
    hints: [ { en: "Cases do not end on their own; execution falls into the next case body.", de: "Ein case endet nicht von selbst; die Ausführung fällt in den nächsten case-Rumpf." }, { en: "Stacked case labels with no body between them are the deliberate use of that behaviour.", de: "Gestapelte case-Marken ohne Rumpf dazwischen sind die beabsichtigte Nutzung dieses Verhaltens." }, { en: "Add break after the weekend assignment.", de: "Ergänze break nach der Wochenend-Zuweisung." } ]
  - pattern: "'B' !== 'A'|'A' !== 'B'|'C' !== 'B'"
    question: { en: "A value sitting exactly on a boundary went to the wrong branch. Is the comparison > or >=?", de: "Ein Wert genau auf einer Grenze ist im falschen Zweig gelandet. Ist der Vergleich > oder >=?" }
    hints: [ { en: "Write the ranges out: 90..100 A, 80..89 B, 70..79 C. Which endpoint is excluded by >?", de: "Schreib die Bereiche auf: 90..100 A, 80..89 B, 70..79 C. Welchen Endpunkt schließt > aus?" }, { en: "Boundary values are exactly where off-by-one bugs live; the tests check them on purpose.", de: "Grenzwerte sind genau der Ort, an dem Off-by-one-Fehler wohnen; die Tests prüfen sie mit Absicht." }, { en: "score > 80 has to become score >= 80.", de: "score > 80 muss score >= 80 werden." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Schreib verzweigenden Code, dessen Grenzen stimmen, und verstehe, warum ein `switch` nach einem passenden Fall weiterläuft, wenn du ihn nicht anhältst.

## if / else if / else

Eine `if`-Kette wird von oben nach unten gelesen und hält beim ersten Zweig, dessen Bedingung wahr ist. Damit gehört die Reihenfolge zur Logik: eine Kette, die `score >= 70` vor `score >= 90` prüft, kann nie ein A vergeben.

Die interessanten Fehler wohnen an den Grenzen. `>` und `>=` unterscheiden sich für genau einen Wert, und genau diesen Wert übergibt irgendwann jemand. Wenn ein Bereich „80 bis einschließlich 89" lautet, schreib ihn als `score >= 80` und lass den Zweig darüber die 90 abfangen - versuche nicht, beide Enden in einer Bedingung auszudrücken.

## switch fällt durch

MDNs Kapitel [Control flow](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling) sagt es unumwunden: ein `case` endet nicht von selbst. Passt ein Fall, springt die Ausführung dorthin und **läuft weiter** in die folgenden case-Rümpfe, bis sie auf ein `break` oder das Ende des switch trifft.

Sag vorher, was das ausgibt, und führe dann [`examples/m2-switch-fallthrough.js`](file:examples/m2-switch-fallthrough.js) aus:

```bash
node examples/m2-switch-fallthrough.js
```

Die Frage nach Äpfeln gibt zwei Zeilen aus. Das ist Durchfallen, und es ist kein Mangel der Sprache: gestapelte Marken ohne Rumpf dazwischen sind die Art zu sagen „diese Fälle teilen sich eine Antwort".

```js
switch (day) {
  case "sat":
  case "sun":
    kind = "weekend";
    break;          // <- ohne das läuft die Ausführung in "mon" weiter
  case "mon":
  …
}
```

Die Regel lässt sich leicht merken: **gestapelte Marken ohne etwas dazwischen sind Absicht; ein case-Rumpf ohne `break` ist ein Fehler**, sofern kein Kommentar das Gegenteil sagt.

## Die Aufgabe

Öffne [`src/m2/grade.js`](file:src/m2/grade.js). Zwei Funktionen, je ein Fehler:

- `letterGrade(score)` muss für 80 bis 89 ein B vergeben. Ein Vergleich schließt einen Grenzwert aus; der Test übergibt genau diesen Wert.
- `dayKind(day)` muss für `"sat"` und `"sun"` mit `"weekend"` antworten. Der Wochenend-Fall weist die richtige Antwort zu und fällt dann direkt in den Wochentags-Fall, der sie überschreibt.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m2-01-if-switch.test.js
node examples/m2-switch-fallthrough.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m2-01-if-switch.test.js
```

Beide grün, und deine Vorhersage zum Beispiel ist erfasst. Als Nächstes: [was als wahr gilt](step:m2-02-truthy-falsy) - dort wird die Bedingung selbst zum Problem.
