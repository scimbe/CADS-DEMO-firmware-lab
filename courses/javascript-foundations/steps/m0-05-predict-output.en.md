---
id: m0-05-predict-output
title: Predict before you run
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
    title: Predict the output of the example, then run it
    check: { type: predict, prompt: { en: "examples/m0-console.js prints six lines. Write down, line by line, what you expect - including the exact shape of the last one, which prints an object.", de: "examples/m0-console.js gibt sechs Zeilen aus. Schreib Zeile für Zeile auf, was du erwartest - einschließlich der genauen Form der letzten Zeile, die ein Objekt ausgibt." }, then: { type: command, command: "node examples/m0-console.js", expectExitCode: 0, expectStdout: "Hello, JavaScript" }, rubric: "Compares the prediction with the six printed lines and names at least one place where they differed or where the student was unsure: console.log with two arguments joins them with a space; year + 1 is 1996 because both operands are numbers; typeof year is the string 'number'; an object logs as { name: 'JavaScript', year: 1995 } with single quotes and no quotes on the keys.", bloom: evaluate }
  - id: two-arguments
    title: Why the first line has a space in it
    check: { type: question, prompt: { en: "The first line prints 'Hello, JavaScript' although the string ends in a comma and the name is a separate argument. Where does the space between them come from, and what would you write to get 'Hello,JavaScript' instead?", de: "Die erste Zeile gibt 'Hello, JavaScript' aus, obwohl die Zeichenkette mit einem Komma endet und der Name ein eigenes Argument ist. Woher kommt das Leerzeichen dazwischen, und was würdest du schreiben, um stattdessen 'Hello,JavaScript' zu bekommen?" }, rubric: "States that console.log joins its arguments with a single space, and that concatenation or a template literal produces the version without the space, e.g. console.log(\"Hello,\" + name) or console.log(`Hello,${name}`).", bloom: understand, minChars: 40 }
socratic:
  - { trigger: "task:guess-console:failed", question: { en: "Did the script run at all? The command has to start in the workspace folder, the one holding package.json.", de: "Lief das Skript überhaupt? Der Befehl muss im Workspace-Ordner starten, dem mit der package.json." }, hints: [ { en: "Run it exactly as written: node examples/m0-console.js", de: "Führe ihn genau so aus: node examples/m0-console.js" }, { en: "A prediction has to be written down before the run - that is the point of the exercise, not a formality.", de: "Eine Vorhersage muss vor dem Lauf notiert werden - das ist der Zweck der Übung, keine Formalie." }, { en: "If the file is not found, check the folder with pwd and change into javascript-foundations.", de: "Wird die Datei nicht gefunden, prüfe den Ordner mit pwd und wechsle nach javascript-foundations." } ] }
misconceptions:
  - pattern: "Cannot find module"
    question: { en: "Node looked for the file where you started it. Which folder is that, and where does the example actually live?", de: "Node hat die Datei dort gesucht, wo du es gestartet hast. Welcher Ordner ist das, und wo liegt das Beispiel wirklich?" }
    hints: [ { en: "pwd prints the current folder; it must end in javascript-foundations.", de: "pwd gibt den aktuellen Ordner aus; er muss auf javascript-foundations enden." }, { en: "The path in the command is relative to that folder: examples/m0-console.js", de: "Der Pfad im Befehl ist relativ zu diesem Ordner: examples/m0-console.js" }, { en: "ls examples/ shows every script you can run in this course.", de: "ls examples/ zeigt jedes Skript, das du in diesem Kurs ausführen kannst." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Commit to an answer before the machine gives you one, and use the gap between the two as information.

## Why predicting is a task in this course

Reading code and running code teach different things. Running it tells you what happens; predicting first tells you **where your model of the language is wrong**, and that is the only place learning has to happen. If your prediction matches, you lost twenty seconds. If it does not, you just found a misconception you did not know you had - cheaply, in an eight-line file, instead of expensively, in the middle of a project.

So the rule for every `predict` task in this course is the same: write the prediction down first. The panel will not run the script until you have.

## The example

Open [`examples/m0-console.js`](file:examples/m0-console.js) and read it without running it:

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

Six lines will be printed. Write down all six, exactly as you expect them - including punctuation and quoting. Four of them are worth being careful about:

- `console.log("Hello,", name)` passes **two arguments**, not one string.
- `year + 1` adds two numbers. In [M1](step:m1-03-coercion-nan) you will see what `+` does when one side is not a number; here both are.
- `typeof year` produces a **string**, not a type.
- `{ name, year }` uses shorthand property names, so the printed object has two properties. How does Node print an object - with quotes on the keys, on the values, or on neither?

Then run it:

```bash
node examples/m0-console.js
```

## What to do with a mismatch

Do not just note that you were wrong; name **which rule** you had wrong. "I thought `console.log` concatenated its arguments without a separator" is a usable sentence. "The last line looked different" is not. The second task asks you to do exactly that for the first line.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node examples/m0-console.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

The prediction is recorded, the script ran, and you can say in one sentence where your expectation and the output parted company. Then start [M1](step:m1-01-let-const), where the values themselves become the subject.
