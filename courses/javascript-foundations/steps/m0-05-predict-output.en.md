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
    check: { type: predict, prompt: { en: "examples/m0-console.js prints six lines. Write down, line by line, what you expect - including the exact shape of the last one, which prints an object.", de: "examples/m0-console.js gibt sechs Zeilen aus. Schreib Zeile für Zeile auf, was du erwartest - einschließlich der genauen Form der letzten Zeile, die ein Objekt ausgibt." }, then: { type: command, command: "node examples/m0-console.js", expectExitCode: 0, expectStdout: "Hello, JavaScript" }, rubric: "Holds the written guess beside what appeared and names one place they parted, together with the belief that turned out false. Does not pass: a verdict on oneself with nothing identified, or a transcript of what appeared with no belief revised.", bloom: evaluate }
  - id: two-arguments
    title: Why the first line has a space in it
    check: { type: question, prompt: { en: "Where does the space in the first printed line come from? One sentence, plus one line of code without it.", de: "Woher kommt das Leerzeichen in der ersten ausgegebenen Zeile? Ein Satz, plus eine Codezeile ohne es." }, rubric: "Attributes the separator to the call itself rather than to either piece handed over, and supplies one working replacement that hands over a single piece. Does not pass: claiming the separator was written into the text, or a replacement that still hands over two.", bloom: understand, minChars: 40 }
socratic:
  - trigger: "task:guess-console:failed"
    question: { en: "Did the script run, and was the prediction written down before it did?", de: "Lief das Skript, und stand die Vorhersage vorher schon geschrieben?" }
    hints: [ { en: "The path in the command is relative to the exercise folder, so check the prompt first.", de: "Der Pfad im Befehl ist relativ zum Übungsordner, prüf also zuerst den Prompt." }, { en: "Open the example in the editor and count its console.log calls before running anything.", de: "Öffne das Beispiel im Editor und zähl seine console.log-Aufrufe, bevor du etwas ausführst." }, { en: "A prediction written after the run teaches nothing; the gap between the two is the whole point.", de: "Eine nach dem Lauf geschriebene Vorhersage lehrt nichts; der Unterschied zwischen beiden ist der Zweck." } ]
  - trigger: "task:two-arguments:failed"
    question: { en: "Count the arguments in that call. Is the space inside one of them?", de: "Zähl die Argumente in diesem Aufruf. Steckt das Leerzeichen in einem davon?" }
    hints: [ { en: "Look at the comma in the call and ask whether it separates arguments or sits inside a string.", de: "Sieh dir das Komma im Aufruf an und frag, ob es Argumente trennt oder in einer Zeichenkette steht." }, { en: "Try the same call with three arguments and watch how many separators appear.", de: "Probier denselben Aufruf mit drei Argumenten und beobachte, wie viele Trennzeichen erscheinen." }, { en: "Whatever puts the separator there is doing it for you, so the fix is to stop giving it two pieces.", de: "Was das Trennzeichen setzt, tut es für dich, die Lösung ist also, ihm nicht zwei Teile zu geben." } ]
misconceptions:
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
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

![The predict task showing the written prediction beside what the script actually printed, with a reflection question underneath](tutor-predict-card.png)
*What the panel does with a prediction: your text on the left, the real output on the right, and one question underneath asking where the two parted company.*

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
