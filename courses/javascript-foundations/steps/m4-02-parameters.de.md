---
id: m4-02-parameters
title: Standard- und Rest-Parameter
bloom: apply
objectives: [javascript-web-javascript-guide-functions]
requires: [m4-01-declare-and-call]
estimatedMinutes: 15
scaffold: faded
recallFrom: [m4-01-declare-and-call, m2-02-truthy-falsy]
links:
  - { step: m4-01-declare-and-call }
  - { step: m4-03-closures }
  - { file: "src/m4/format.js", line: 9 }
  - { step: m2-02-truthy-falsy }
sources: [src/m4/format.js, test/m4-02-parameters.test.js, src/m2/settings.js]
tasks:
  - id: format
    title: Beide Formatierungs-Tests sind grün
    check: { type: testSuite, runner: node-test, expectPass: ["m4-02 joinWords uses the default separator when none is given", "m4-02 describeCall reports count and values from the rest parameter"], minPass: 2 }
  - id: default-trigger
    title: Wann ein Standardwert wirklich greift
    check: { type: question, prompt: { en: "For which single argument value does a default fire, and what does joinWords(null, \\\"a\\\") return?", de: "Bei welchem einzigen Argumentwert greift ein Standardwert, und was liefert joinWords(null, \\\"a\\\")?" }, rubric: "Names the one value a parameter default reacts to, and gives the return for the null call with a reason that follows from it. Does not pass: naming more than one triggering value, or a return value that would require the default to have fired.", bloom: analyze, minChars: 40 }
socratic:
  - trigger: "task:format:failed"
    question: { en: "Is the separator wrong, or the number of collected arguments?", de: "Stimmt das Trennzeichen nicht oder die Anzahl gesammelter Argumente?" }
    hints: [ { en: "Call each function with no arguments at all and say what it should answer there.", de: "Ruf jede Funktion ganz ohne Argumente auf und sag, was sie dort antworten soll." }, { en: "A default belongs in the parameter list, not in a check inside the body; the test proves which by passing undefined itself.", de: "Ein Standardwert gehört in die Parameterliste, nicht in eine Prüfung im Rumpf; der Test beweist das, indem er selbst undefined übergibt." }, { en: "The second function is an arrow, and arrows lack the older way of reaching a call's arguments.", de: "Die zweite Funktion ist ein Pfeil, und Pfeilen fehlt der ältere Weg zu den Argumenten eines Aufrufs." } ]
  - trigger: "task:default-trigger:failed"
    question: { en: "Does your answer name exactly one triggering value, or a family of them?", de: "Nennt deine Antwort genau einen auslösenden Wert oder eine ganze Familie?" }
    hints: [ { en: "Call the function with each of the empty-ish values in turn and record which ones get the default.", de: "Ruf die Funktion mit jedem der leer wirkenden Werte auf und notiere, welche den Standardwert bekommen." }, { en: "Compare that list with the two other defaulting mechanisms you met in M2.", de: "Vergleich diese Liste mit den zwei anderen Standardwert-Mechanismen aus M2." }, { en: "The three mechanisms react to sets of one, two and eight values, and only one of them is in play here.", de: "Die drei Mechanismen reagieren auf Mengen von einem, zwei und acht Werten, und nur einer ist hier im Spiel." } ]
misconceptions:
  - pattern: "arguments is not defined"
    question: { en: "You reached for the arguments object inside an arrow function. What does an arrow function have instead?", de: "Du hast in einer Pfeilfunktion nach dem arguments-Objekt gegriffen. Was hat eine Pfeilfunktion stattdessen?" }
    hints: [ { en: "Arrow functions have no own arguments object - MDN's Functions chapter lists that with no separate this.", de: "Pfeilfunktionen haben kein eigenes arguments-Objekt - MDNs Kapitel Functions führt das zusammen mit 'no separate this' auf." }, { en: "A rest parameter ...args gives a real array, which arguments never was.", de: "Ein Rest-Parameter ...args liefert ein echtes Array, was arguments nie war." }, { en: "Rest parameters work in every function form, so prefer them everywhere.", de: "Rest-Parameter funktionieren in jeder Funktionsform, nimm sie deshalb überall." } ]
  - pattern: "', ' !== undefined|undefined !== "
    question: { en: "The separator came through as undefined. Was a default written for that parameter at all?", de: "Das Trennzeichen kam als undefined an. Wurde für diesen Parameter überhaupt ein Standardwert geschrieben?" }
    hints: [ { en: "A missing argument arrives as undefined; that is exactly what a default parameter reacts to.", de: "Ein fehlendes Argument kommt als undefined an; genau darauf reagiert ein Standardparameter." }, { en: "The test passes undefined explicitly to prove the default is a parameter default, not a check in the body.", de: "Der Test übergibt undefined ausdrücklich, um zu zeigen, dass der Standardwert ein Parameter-Standardwert ist und keine Prüfung im Rumpf." }, { en: "Write it as separator = \", \" in the parameter list.", de: "Schreib es als separator = \", \" in die Parameterliste." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Lernziel

Gib einer Funktion einen sinnvollen Standardwert, ohne den Wert des Aufrufers zu verschlucken, und sammle eine wechselnde Anzahl von Argumenten in ein echtes Array.

## Standardparameter

```js
function joinWords(separator = ", ", ...words) { … }
```

Ein Standardparameter greift bei genau einer Eingabe: **`undefined`**. So kommt ein weggelassenes Argument an, und so kann ein Aufrufer es auch ausdrücklich übergeben - die Tests tun genau das, um zu belegen, dass der Standardwert in der Parameterliste steht und nicht in einem `if` im Rumpf.

Vergleich das mit [m2-02](step:m2-02-truthy-falsy). Drei Mechanismen, drei verschiedene Mengen ersetzter Werte:

| Geschrieben als | Ersetzt |
|---|---|
| `x = default` in der Parameterliste | nur `undefined` |
| `x ?? default` | `undefined` und `null` |
| `x \|\| default` | jeden falsy-Wert, auch `0`, `""`, `false` |

`joinWords(null, "a")` benutzt also **nicht** `", "`. `null` ist nicht `undefined` und wird deshalb als Trennzeichen genommen. Das aussprechen zu können ist die zweite Aufgabe.

Standardwerte werden zur Aufrufzeit von links nach rechts ausgewertet und dürfen sich auf frühere Parameter beziehen: `function f(a, b = a * 2)` ist gültig und berechnet bei jedem Aufruf ein frisches `b`.

## Rest-Parameter

`...words` an letzter Position sammelt jedes weitere Argument in ein **echtes Array**:

```js
describeCall("a", "b", "c")   //  args ist ["a", "b", "c"]
```

Der alte Weg war das `arguments`-Objekt, und MDNs Kapitel [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions) erklärt, warum es alt bleiben sollte: `arguments` ist array-ähnlich, aber kein Array, hat also weder `map` noch `filter` noch `join`. Schlimmer: **Pfeilfunktionen haben überhaupt kein `arguments`-Objekt** - ein Zugriff darauf ergibt `ReferenceError: arguments is not defined`. Rest-Parameter funktionieren in jeder Funktionsform.

## Die Aufgabe

Öffne [`src/m4/format.js`](file:src/m4/format.js). Beide Funktionen werfen; schreib sie.

- `joinWords(separator, ...words)` verbindet die Wörter mit dem Trennzeichen, Standard `", "`. `joinWords()` ist `""`.
- `describeCall(...args)` liefert `"3 args: a|b|c"`. Es ist eine Pfeilfunktion, der Rest-Parameter ist also deine einzige Möglichkeit.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node --test test/m4-02-parameters.test.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

```bash
node --test test/m4-02-parameters.test.js
```

Beide grün. In der Frage-Aufgabe geht es um den Unterschied zwischen drei Arten von Standardwerten - eine Unterscheidung, die jetzt zum zweiten Mal aufgetaucht ist und über echte Fehler entscheiden wird. Als Nächstes: [Funktionen, die sich erinnern](step:m4-03-closures).
