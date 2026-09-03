---
id: m0-01-first-run
title: Your first run
bloom: remember
objectives: [javascript-web-javascript-guide-introduction, js.tooling.node-test]
requires: []
estimatedMinutes: 10
scaffold: worked
links:
  - { step: m0-02-read-a-test }
  - { doc: "README.md" }
  - { file: "src/m0/hello.js", line: 6 }
  - { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction", title: "MDN: Introduction" }
sources: [README.md, package.json, src/m0/hello.js, test/m0-01-first-run.test.js]
tasks:
  - id: node-runs
    title: Node answers on the terminal
    check: { type: command, command: "node --version", expectExitCode: 0, expectStdout: "v(2[2-9]|[3-9][0-9])", timeoutMs: 20000 }
  - id: greet
    title: The first test is green
    check: { type: testSuite, runner: node-test, expectPass: ["m0-01 greet returns the greeting"], minPass: 1 }
  - id: what-i-see
    title: Say what you are looking at
    check: { type: question, prompt: { en: "Before you changed anything, the test for this step failed. In your own words: what did the failure message tell you, which single file did it point at, and how will you know the step is finished?", de: "Bevor du etwas geändert hast, ist der Test dieses Steps fehlgeschlagen. In deinen eigenen Worten: was hat dir die Fehlermeldung gesagt, auf welche einzelne Datei hat sie gezeigt, und woran wirst du merken, dass der Step fertig ist?" }, rubric: "Names the deliberate error thrown by greet ('TODO: return the greeting'), identifies src/m0/hello.js as the file to edit (the test file itself is not to be changed), and states the success criterion as the test turning green, i.e. node --test reporting pass for 'm0-01 greet returns the greeting'.", bloom: remember, minChars: 40 }
socratic:
  - { trigger: "task:node-runs:failed", question: { en: "The terminal did not answer with a version. Is a terminal open at all, and is it sitting in the workspace folder?", de: "Das Terminal hat nicht mit einer Version geantwortet. Ist überhaupt ein Terminal offen, und steht es im Workspace-Ordner?" }, hints: [ { en: "Open a terminal with Terminal > New Terminal, then type node --version and press Enter.", de: "Öffne ein Terminal mit Terminal > New Terminal, tippe node --version und drücke Enter." }, { en: "The prompt must show the javascript-foundations folder. If it does not, run cd into it first.", de: "Der Prompt muss den Ordner javascript-foundations zeigen. Falls nicht, wechsle zuerst mit cd dorthin." }, { en: "This course needs Node 22 or newer; anything older will not understand the test runner used here.", de: "Dieser Kurs braucht Node 22 oder neuer; alles Ältere versteht den hier benutzten Test-Runner nicht." } ] }
  - { trigger: "task:greet:failed", question: { en: "Read the failure once more. Is it still the TODO error thrown on purpose, or is it now a comparison between two strings?", de: "Lies den Fehlschlag noch einmal. Ist es noch der absichtlich geworfene TODO-Fehler, oder inzwischen ein Vergleich zweier Zeichenketten?" }, hints: [ { en: "The throw statement in src/m0/hello.js has to go; a return statement takes its place.", de: "Die throw-Anweisung in src/m0/hello.js muss weg; an ihre Stelle kommt eine return-Anweisung." }, { en: "The test compares the exact string 'Hello, JavaScript!' - comma, space, exclamation mark included.", de: "Der Test vergleicht die exakte Zeichenkette 'Hello, JavaScript!' - Komma, Leerzeichen und Ausrufezeichen inklusive." }, { en: "Working line: return \"Hello, JavaScript!\";", de: "Fertige Zeile: return \"Hello, JavaScript!\";" } ] }
misconceptions:
  - pattern: "TODO: return the greeting"
    question: { en: "That is the error the exercise ships with. Which file is it thrown from, and what should stand there instead of throw?", de: "Das ist der Fehler, mit dem die Übung ausgeliefert wird. Aus welcher Datei wird er geworfen, und was sollte statt throw dort stehen?" }
    hints: [ { en: "The stack trace names the file and the line: src/m0/hello.js, inside greet.", de: "Der Stacktrace nennt Datei und Zeile: src/m0/hello.js, innerhalb von greet." }, { en: "A function that should hand back a value uses return, not throw.", de: "Eine Funktion, die einen Wert zurückgeben soll, benutzt return, nicht throw." }, { en: "Replace the whole throw line with return \"Hello, JavaScript!\";", de: "Ersetze die gesamte throw-Zeile durch return \"Hello, JavaScript!\";" } ]
  - pattern: "command not found"
    question: { en: "The shell could not find the program you typed. Was it node, or was it something else?", de: "Die Shell konnte das getippte Programm nicht finden. War es node, oder etwas anderes?" }
    hints: [ { en: "Type the command again slowly: node --version, all lower case, two dashes.", de: "Tippe den Befehl noch einmal langsam: node --version, alles klein, zwei Bindestriche." }, { en: "This workspace needs no npm install and no other tool - only node.", de: "Dieser Workspace braucht kein npm install und kein weiteres Werkzeug - nur node." }, { en: "If node itself is missing, the lab image is not the one this course expects; say so in Ask the tutor.", de: "Fehlt node selbst, ist das Lab-Image nicht das von diesem Kurs erwartete; melde das über Frag den Tutor." } ]
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
node --test test/m0-01-first-run.test.js
```

It fails, on purpose:

```
✖ m0-01 greet returns the greeting
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

## How you know it worked

Run the same command again:

```bash
node --test test/m0-01-first-run.test.js
```

```
✔ m0-01 greet returns the greeting
ℹ pass 1
ℹ fail 0
```

A tick and `fail 0`. That is the finish line for every step in this course: the step's own test file is green. Tests belonging to later steps will keep failing until you get there - that is expected, not a problem you caused.

When both checks above are ticked, answer the third task in your own words and move on to [reading a test properly](step:m0-02-read-a-test).
