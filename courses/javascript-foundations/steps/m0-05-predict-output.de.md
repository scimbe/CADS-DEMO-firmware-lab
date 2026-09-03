---
id: m0-05-predict-output
title: Erst vorhersagen, dann ausführen
bloom: understand
objectives: [javascript-web-javascript-guide-introduction, js.tooling.node-test]
requires: [m0-04-modules]
estimatedMinutes: 12
scaffold: independent
links:
  - { step: m0-04-modules }
  - { step: m1-01-let-const }
  - { file: "examples/m0-console.js" }
  - { doc: "README.md" }
sources: [examples/m0-console.js, README.md]
tasks:
  - id: guess-console
    title: Sag die Ausgabe des Beispiels vorher, dann führe es aus
    check: { type: predict, prompt: { en: "examples/m0-console.js prints six lines. Write down, line by line, what you expect - including the exact shape of the last one, which prints an object.", de: "examples/m0-console.js gibt sechs Zeilen aus. Schreib Zeile für Zeile auf, was du erwartest - einschließlich der genauen Form der letzten Zeile, die ein Objekt ausgibt." }, then: { type: command, command: "node examples/m0-console.js", expectExitCode: 0, expectStdout: "Hello, JavaScript" }, rubric: "Compares the prediction with the six printed lines and names at least one place where they differed or where the student was unsure: console.log with two arguments joins them with a space; year + 1 is 1996 because both operands are numbers; typeof year is the string 'number'; an object logs as { name: 'JavaScript', year: 1995 } with single quotes and no quotes on the keys.", bloom: evaluate }
  - id: two-arguments
    title: Warum in der ersten Zeile ein Leerzeichen steht
    check: { type: question, prompt: { en: "The first line prints 'Hello, JavaScript' although the string ends in a comma and the name is a separate argument. Where does the space between them come from, and what would you write to get 'Hello,JavaScript' instead?", de: "Die erste Zeile gibt 'Hello, JavaScript' aus, obwohl die Zeichenkette mit einem Komma endet und der Name ein eigenes Argument ist. Woher kommt das Leerzeichen dazwischen, und was würdest du schreiben, um stattdessen 'Hello,JavaScript' zu bekommen?" }, rubric: "States that console.log joins its arguments with a single space, and that concatenation or a template literal produces the version without the space, e.g. console.log(\"Hello,\" + name) or console.log(`Hello,${name}`).", bloom: understand, minChars: 40 }
socratic:
  - { trigger: "task:guess-console:failed", question: { en: "Did the script run at all? The command has to start in the workspace folder, the one holding package.json.", de: "Lief das Skript überhaupt? Der Befehl muss im Workspace-Ordner starten, dem mit der package.json." }, hints: [ { en: "Run it exactly as written: node examples/m0-console.js", de: "Führe ihn genau so aus: node examples/m0-console.js" }, { en: "A prediction has to be written down before the run - that is the point of the exercise, not a formality.", de: "Eine Vorhersage muss vor dem Lauf notiert werden - das ist der Zweck der Übung, keine Formalie." }, { en: "If the file is not found, check the folder with pwd and change into javascript-foundations.", de: "Wird die Datei nicht gefunden, prüfe den Ordner mit pwd und wechsle nach javascript-foundations." } ] }
misconceptions:
  - pattern: "Cannot find module"
    question: { en: "Node looked for the file where you started it. Which folder is that, and where does the example actually live?", de: "Node hat die Datei dort gesucht, wo du es gestartet hast. Welcher Ordner ist das, und wo liegt das Beispiel wirklich?" }
    hints: [ { en: "pwd prints the current folder; it must end in javascript-foundations.", de: "pwd gibt den aktuellen Ordner aus; er muss auf javascript-foundations enden." }, { en: "The path in the command is relative to that folder: examples/m0-console.js", de: "Der Pfad im Befehl ist relativ zu diesem Ordner: examples/m0-console.js" }, { en: "ls examples/ shows every script you can run in this course.", de: "ls examples/ zeigt jedes Skript, das du in diesem Kurs ausführen kannst." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
---
## Lernziel

Lege dich auf eine Antwort fest, bevor die Maschine dir eine gibt, und nutze den Unterschied zwischen beiden als Information.

## Warum Vorhersagen in diesem Kurs eine Aufgabe ist

Code lesen und Code ausführen lehren Verschiedenes. Ausführen sagt dir, was passiert; vorher vorherzusagen sagt dir, **wo dein Modell der Sprache falsch ist**, und nur dort muss Lernen überhaupt stattfinden. Stimmt deine Vorhersage, hast du zwanzig Sekunden verloren. Stimmt sie nicht, hast du gerade ein Fehlkonzept gefunden, von dem du nichts wusstest - billig, in einer achtzeiligen Datei, statt teuer mitten in einem Projekt.

Für jede `predict`-Aufgabe dieses Kurses gilt deshalb dieselbe Regel: Vorhersage zuerst aufschreiben. Das Panel führt das Skript erst danach aus.

## Das Beispiel

Öffne [`examples/m0-console.js`](file:examples/m0-console.js) und lies es, ohne es auszuführen:

```js
const name = "JavaScript";
const year = 1995;
const tags = ["node", "test"];
console.log("Hello,", name);
console.log(year + 1);
console.log(tags.length);
console.log(typeof year);
console.log({ name, year });
```

Sechs Zeilen werden ausgegeben. Schreib alle sechs auf, genau wie du sie erwartest - samt Satzzeichen und Anführungszeichen. Bei vier davon lohnt sich Sorgfalt:

- `console.log("Hello,", name)` übergibt **zwei Argumente**, nicht eine Zeichenkette.
- `year + 1` addiert zwei Zahlen. In [M1](step:m1-03-coercion-nan) siehst du, was `+` tut, wenn eine Seite keine Zahl ist; hier sind es beide.
- `typeof year` liefert eine **Zeichenkette**, keinen Typ.
- `{ name, year }` nutzt Kurzschreibweise für Eigenschaften, das ausgegebene Objekt hat also zwei Eigenschaften. Wie gibt Node ein Objekt aus - mit Anführungszeichen um die Schlüssel, um die Werte, oder um keines von beiden?

Dann führe es aus:

```bash
node examples/m0-console.js
```

## Was du mit einer Abweichung anfängst

Halte nicht nur fest, dass du falsch lagst, sondern benenne **welche Regel** du falsch hattest. „Ich dachte, `console.log` hängt seine Argumente ohne Trennzeichen aneinander" ist ein brauchbarer Satz. „Die letzte Zeile sah anders aus" ist keiner. Die zweite Aufgabe verlangt genau das für die erste Zeile.

## So führst du diesen Step aus

Öffne ein Terminal mit **Terminal > New Terminal** (oder drücke **F1** und tippe `Terminal: Create New Terminal`). Es öffnet sich im Panel am unteren Fensterrand, und sein Prompt muss auf `javascript-foundations` enden. Führe dann aus:

```bash
node examples/m0-console.js
```

Der Befehl ist fertig, wenn der Prompt zurückkommt; die Zähler am Ende der Ausgabe sind das Urteil, und `fail 0` heißt Erfolg. `Cannot find module` heißt, dass das Terminal im falschen Ordner steht - führe `cd javascript-foundations` aus und versuch es erneut. Ändere nur Dateien unter `src/`; die Dateien unter `test/` sind das Prüfschema. Die vollständige Tour durch die Oberfläche steht in [Die Oberfläche bedienen](step:m0-01-using-the-ide).

## Woran du erkennst, dass es geklappt hat

Die Vorhersage ist erfasst, das Skript ist gelaufen, und du kannst in einem Satz sagen, wo Erwartung und Ausgabe auseinandergingen. Danach beginnt [M1](step:m1-01-let-const), wo die Werte selbst zum Thema werden.
