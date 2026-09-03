---
id: m0-02-first-run
title: Your first run
bloom: remember
objectives: [javascript-web-javascript-guide-introduction, js.tooling.node-test]
requires: [m0-01-using-the-ide]
estimatedMinutes: 10
scaffold: worked
recallFrom: [m0-01-using-the-ide]
links:
  - { step: m0-01-using-the-ide }
  - { step: m0-03-read-a-test }
  - { doc: "README.md" }
  - { file: "src/m0/hello.js", line: 6 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction", title: "MDN: Introduction" }
sources: [README.md, package.json, src/m0/hello.js, test/m0-02-first-run.test.js]
tasks:
  - id: greet
    title: The first test is green
    check: { type: testSuite, runner: node-test, expectPass: ["m0-02 greet returns the greeting"], minPass: 1 }
  - id: what-i-see
    title: Say what you are looking at
    check: { type: question, prompt: { en: "What did the first failure tell you, and how will you know the step is done? Two sentences.", de: "Was sagte dir der erste Fehlschlag, und woran erkennst du, dass der Step fertig ist? Zwei Sätze." }, rubric: "Sentence one names the thrown TODO error and the file and function the stack trace pointed at. Sentence two gives a checkable finish condition: the step's own test reporting fail 0. Does not pass: 'it was red, now it is green' with no file named, or a finish condition that is a feeling rather than an output.", bloom: remember, minChars: 50 }
socratic:
  - trigger: "task:greet:failed"
    question: { en: "Is it still the error the exercise shipped with, or is it now two strings being compared?", de: "Ist es noch der ausgelieferte Fehler, oder werden jetzt zwei Zeichenketten verglichen?" }
    hints: [ { en: "Read the first line of the failure: an Error with a message is not an AssertionError with a diff.", de: "Lies die erste Zeile des Fehlschlags: ein Error mit Meldung ist kein AssertionError mit Diff." }, { en: "Open the file the stack trace names and look at what the function does instead of returning.", de: "Öffne die im Stacktrace genannte Datei und sieh, was die Funktion tut, statt zurückzugeben." }, { en: "The test compares character by character, so the comma, the space and the exclamation mark all count.", de: "Der Test vergleicht Zeichen für Zeichen, Komma, Leerzeichen und Ausrufezeichen zählen also mit." } ]
  - trigger: "task:what-i-see:failed"
    question: { en: "Does your answer name a file, and does the finish condition name something you can read off the screen?", de: "Nennt deine Antwort eine Datei, und nennt die Abschlussbedingung etwas vom Bildschirm Ablesbares?" }
    hints: [ { en: "The failure had three parts: the test name, the error, and a location. Your first sentence needs the last two.", de: "Der Fehlschlag hatte drei Teile: Testname, Fehler und Ort. Dein erster Satz braucht die letzten zwei." }, { en: "Look at the summary block the runner prints after the test names.", de: "Sieh dir den Zusammenfassungsblock an, den der Runner nach den Testnamen ausgibt." }, { en: "Two counters in that block move in opposite directions; one of them reaching zero is what you are after.", de: "Zwei Zähler in diesem Block laufen gegenläufig; dass einer von ihnen null erreicht, ist das Gesuchte." } ]
misconceptions:
  - pattern: "TODO: return the greeting"
    question: { en: "That is the error the exercise ships with. Which file is it thrown from, and what should stand there instead of throw?", de: "Das ist der Fehler, mit dem die Übung ausgeliefert wird. Aus welcher Datei wird er geworfen, und was sollte statt throw dort stehen?" }
    hints: [ { en: "The stack trace names the file and the line: src/m0/hello.js, inside greet.", de: "Der Stacktrace nennt Datei und Zeile: src/m0/hello.js, innerhalb von greet." }, { en: "A function that should hand back a value uses return, not throw.", de: "Eine Funktion, die einen Wert zurückgeben soll, benutzt return, nicht throw." }, { en: "One statement has to go and one has to take its place; the string the test wants is quoted in the failure.", de: "Eine Anweisung muss weg und eine an ihre Stelle; die vom Test verlangte Zeichenkette steht im Fehlschlag." } ]
  - pattern: ": not found|command not found"
    question: { en: "The shell could not find the program you typed. Was it node, or was it something else?", de: "Die Shell konnte das getippte Programm nicht finden. War es node, oder etwas anderes?" }
    hints: [ { en: "Type the command again slowly: node --version, all lower case, two dashes.", de: "Tippe den Befehl noch einmal langsam: node --version, alles klein, zwei Bindestriche." }, { en: "This workspace needs no npm install and no other tool - only node.", de: "Dieser Workspace braucht kein npm install und kein weiteres Werkzeug - nur node." }, { en: "If node itself is missing, the lab image is not the one this course expects; say so in Ask the tutor.", de: "Fehlt node selbst, ist das Lab-Image nicht das von diesem Kurs erwartete; melde das über Frag den Tutor." } ]
  - pattern: "Cannot find module|MODULE_NOT_FOUND|Could not find '|no such file or directory"
    question: { en: "Node could not find a file. Is the terminal in the right folder, and is the path in the command spelled as the step wrote it?", de: "Node hat eine Datei nicht gefunden. Steht das Terminal im richtigen Ordner, und ist der Pfad im Befehl so geschrieben wie im Step?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations. If not, run cd javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden. Wenn nicht, führe cd javascript-foundations aus." }, { en: "Copy the command from the code block in this panel rather than retyping it; the file name carries the step id exactly.", de: "Kopiere den Befehl aus dem Codeblock in diesem Panel, statt ihn abzutippen; der Dateiname trägt die Step-Kennung exakt." }, { en: "ES module imports need the .js extension, so a path without it fails the same way.", de: "Importe in ES-Modulen brauchen die Endung .js, ein Pfad ohne sie scheitert genauso." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Run JavaScript with `node`, make one failing test pass, and know exactly how you can tell that a step is finished.

## What you are looking at

The editor shows one folder, `javascript-foundations`. Four things live in it, and you will use all four in every step of this course:

- `src/` - the **exercises**. This is the only place you change code.
- `test/` - the **checks**. One file per step. You read them; you do not edit them.
- `examples/` - short scripts to run and think about.
- `README.md` - how to run everything.

There is no build step, no `npm install`, no framework. JavaScript in this course is run by one program, `node`, which is already installed. MDN puts it plainly in its [Introduction](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction): JavaScript is a language with a small standard library, and the rest comes from whatever hosts it - a browser, or here, Node.

## What you do first

Open a terminal (**Terminal > New Terminal**) and ask Node who it is:

```bash
node --version
```

You should see `v22.` or higher. That is the first check of this step.

Now run the tests for this step and read what comes back:

```bash
node --test test/m0-02-first-run.test.js
```

It fails, on purpose:

```
✖ m0-02 greet returns the greeting
  Error: TODO: return the greeting
      at greet (file:///.../src/m0/hello.js:7:9)
```

That message is doing three useful things at once. It names the test that failed, it names the error, and the stack trace names **the file and line the error came from**: `src/m0/hello.js`, inside `greet`. Every failure in this course tells you those three things.

## The exercise

Open [`src/m0/hello.js`](file:src/m0/hello.js). It contains one function:

```js
export function greet() {
  throw new Error("TODO: return the greeting");
}
```

`throw` is how JavaScript signals "I cannot do this". The exercise ships with that line so the very first thing you see is a real error rather than a blank file. Replace it so the function hands a value back instead:

```js
export function greet() {
  return "Hello, JavaScript!";
}
```

The string has to match exactly - the test compares character by character.

## Running this step

Open a terminal with **Terminal > New Terminal** (or press **F1** and type `Terminal: Create New Terminal`). It opens in the panel at the bottom of the window, and its prompt has to end in `javascript-foundations`. Then run:

```bash
node --test test/m0-02-first-run.test.js
```

The command has finished when the prompt comes back; the counts at the end of the output are the verdict, and `fail 0` is success. `Cannot find module` means the terminal is in the wrong folder - run `cd javascript-foundations` and try again. Change only files under `src/`; the files under `test/` are the marking scheme. The whole tour of the interface is in [operating the interface](step:m0-01-using-the-ide).

## How you know it worked

Run the same command again:

```bash
node --test test/m0-02-first-run.test.js
```

```
✔ m0-02 greet returns the greeting
ℹ pass 1
ℹ fail 0
```

A tick and `fail 0`. That is the finish line for every step in this course: the step's own test file is green. Tests belonging to later steps will keep failing until you get there - that is expected, not a problem you caused.

When both checks above are ticked, answer the third task in your own words and move on to [reading a test properly](step:m0-03-read-a-test).
