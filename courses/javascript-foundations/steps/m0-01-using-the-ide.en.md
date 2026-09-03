---
id: m0-01-using-the-ide
title: Operating the interface
bloom: apply
objectives: [js.tooling.node-test]
requires: []
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m0-02-first-run }
  - { file: "src/m0/ready.js", line: 13 }
  - { file: "test/m0-01-using-the-ide.test.js" }
  - { doc: "README.md" }
sources: [README.md, src/m0/ready.js, test/m0-01-using-the-ide.test.js, package.json]
tasks:
  - id: node-runs
    title: "Run a command: node answers with its version"
    check: { type: command, command: "node --version", expectExitCode: 0, expectStdout: "v(2[2-9]|[3-9][0-9])", timeoutMs: 20000, seedMustFail: false }
  - id: ready
    title: "Read the output, change a file in src/, run again"
    check: { type: testSuite, runner: node-test, expectPass: ["m0-01 the workspace is ready"], minPass: 1 }
  - id: where-things-are
    title: Say where the output appeared
    check: { type: question, prompt: { en: "Name the route you used, where the output appeared, and the file you edited. One sentence each.", de: "Nenne den benutzten Weg, wo die Ausgabe erschien, und die geänderte Datei. Je ein Satz." }, rubric: "Three sentences, one per part. Route: the integrated terminal, the command palette via F1, or Terminal > Run Task. Place: the panel at the bottom of the window. File: src/m0/ready.js. Does not pass: a file under test/ named as the one edited, an answer that names fewer than three parts, or 'the terminal' alone without saying it is the bottom panel.", bloom: understand, minChars: 60 }
socratic:
  - trigger: "task:node-runs:failed"
    question: { en: "Nothing came back. Is a terminal open, and does its prompt end in the exercise folder?", de: "Es kam nichts zurück. Ist ein Terminal offen, und endet sein Prompt auf den Übungsordner?" }
    hints: [ { en: "Terminal > New Terminal opens one at the bottom; F1 then 'Terminal: Create New Terminal' does the same.", de: "Terminal > New Terminal öffnet unten eines; F1 und dann 'Terminal: Create New Terminal' tut dasselbe." }, { en: "Type pwd and read the last part of the path against the folder name in the Explorer title.", de: "Tippe pwd und vergleich den letzten Teil des Pfads mit dem Ordnernamen im Explorer-Titel." }, { en: "A new terminal starts one folder above the exercises, so one cd is needed before any command here.", de: "Ein neues Terminal startet einen Ordner über den Übungen, vor jedem Befehl hier fehlt also ein cd." } ]
  - trigger: "task:ready:failed"
    question: { en: "The test still reads the old value. Which file did the change land in, and is it saved?", de: "Der Test liest weiter den alten Wert. In welcher Datei landete die Änderung, und ist sie gespeichert?" }
    hints: [ { en: "Compare the path in the editor tab with the path in the assertion message.", de: "Vergleich den Pfad im Editor-Tab mit dem Pfad in der Assertion-Meldung." }, { en: "The exercise is the file under src/; the file under test/ is the marking scheme and stays untouched.", de: "Die Übung ist die Datei unter src/; die Datei unter test/ ist das Prüfschema und bleibt unberührt." }, { en: "Node reads from disk, so a tab showing a dot instead of a cross is a change Node cannot see yet.", de: "Node liest von der Platte, ein Tab mit Punkt statt Kreuz ist also eine Änderung, die Node noch nicht sieht." } ]
  - trigger: "task:where-things-are:failed"
    question: { en: "Which of the three parts is missing - the route, the place, or the file?", de: "Welcher der drei Teile fehlt - der Weg, der Ort oder die Datei?" }
    hints: [ { en: "Scroll the terminal back to the command you ran; the route is how you opened that terminal.", de: "Scroll im Terminal zum ausgeführten Befehl zurück; der Weg ist, wie du dieses Terminal geöffnet hast." }, { en: "The place is a named region of the window, not the whole window.", de: "Der Ort ist ein benannter Bereich des Fensters, nicht das ganze Fenster." }, { en: "The assertion message named the file you had to change; it is not the file the message came from.", de: "Die Assertion-Meldung nannte die zu ändernde Datei; es ist nicht die Datei, aus der die Meldung kam." } ]
misconceptions:
  - pattern: "Cannot find module|no such file or directory|MODULE_NOT_FOUND"
    question: { en: "Node looked for the file where you started it. Which folder is the terminal sitting in?", de: "Node hat die Datei dort gesucht, wo du es gestartet hast. In welchem Ordner steht das Terminal?" }
    hints: [ { en: "Type pwd and press Enter; the path must end in javascript-foundations.", de: "Tippe pwd und drücke Enter; der Pfad muss auf javascript-foundations enden." }, { en: "cd javascript-foundations puts you there; ls then shows src, test and examples.", de: "cd javascript-foundations bringt dich dorthin; ls zeigt danach src, test und examples." }, { en: "Every command in this course is written relative to that folder, never to your home directory.", de: "Jeder Befehl dieses Kurses ist relativ zu diesem Ordner geschrieben, nie zum Home-Verzeichnis." } ]
  - pattern: ": not found|command not found"
    question: { en: "The shell could not find the program you typed. Was the whole line typed as written?", de: "Die Shell konnte das getippte Programm nicht finden. Wurde die ganze Zeile so getippt, wie sie dasteht?" }
    hints: [ { en: "node --version: all lower case, one space, two dashes.", de: "node --version: alles klein, ein Leerzeichen, zwei Bindestriche." }, { en: "Use the copy button at the top right of a code block in this panel instead of retyping.", de: "Nutze die Kopier-Schaltfläche rechts oben an einem Codeblock in diesem Panel, statt abzutippen." }, { en: "This workspace needs no npm install and no other tool - only node.", de: "Dieser Workspace braucht kein npm install und kein weiteres Werkzeug - nur node." } ]
  - pattern: "Set READY to true"
    question: { en: "The test is still reading false. Was the file saved, and was it the file under src/?", de: "Der Test liest weiterhin false. Wurde die Datei gespeichert, und war es die Datei unter src/?" }
    hints: [ { en: "An unsaved file shows a dot instead of a cross on its editor tab. Ctrl+S (Cmd+S) saves it.", de: "Eine ungespeicherte Datei zeigt auf ihrem Editor-Tab einen Punkt statt eines Kreuzes. Strg+S (Cmd+S) speichert sie." }, { en: "Check the path in the tab: it must be src/m0/ready.js, not test/m0-01-using-the-ide.test.js.", de: "Prüfe den Pfad im Tab: er muss src/m0/ready.js sein, nicht test/m0-01-using-the-ide.test.js." }, { en: "Node reads the file from disk at every run, so an unsaved change cannot be seen.", de: "Node liest die Datei bei jedem Lauf von der Platte, eine ungespeicherte Änderung ist also unsichtbar." } ]
  - pattern: "is an exercise, not a program"
    question: { en: "You ran the exercise file itself. Which folder holds the files that actually check your work?", de: "Du hast die Übungsdatei selbst ausgeführt. In welchem Ordner liegen die Dateien, die deine Arbeit wirklich prüfen?" }
    hints: [ { en: "Files under src/ only export functions; on their own they compute nothing and print nothing.", de: "Dateien unter src/ exportieren nur Funktionen; für sich allein berechnen sie nichts und geben nichts aus." }, { en: "The reminder you just saw names the exact command - it ends in test/<step-id>.test.js.", de: "Der eben gezeigte Hinweis nennt den genauen Befehl - er endet auf test/<step-id>.test.js." }, { en: "In this course you run files under test/ and edit files under src/, never the other way round.", de: "In diesem Kurs führst du Dateien unter test/ aus und änderst Dateien unter src/, nie umgekehrt." } ]
---
## Learning goal

Operate this editor well enough to finish any step: open a terminal, run a command, read its output, and change the right file.

## Do this first

**1. Open a terminal.** Menu **Terminal > New Terminal**, or press **F1** and type `Terminal: Create New Terminal`. It opens in the panel at the bottom. Check where it is:

```bash
pwd
```

The path must end in `javascript-foundations`. If it does not, run `cd javascript-foundations`.

**2. Run a command.**

```bash
node --version
```

It answers `v22.` or higher. That is the first check of this step.

**3. Run this step's test** and read the failure.

```bash
node --test test/m0-01-using-the-ide.test.js
```

**4. Change the file the failure names** - [`src/m0/ready.js`](file:src/m0/ready.js) - from `false` to `true`, save with **Ctrl+S** (**Cmd+S** on a Mac), and run the command again. The **Up arrow** brings it back without retyping.

Files under `test/` are the marking scheme. Editing one to make it pass is the single move that helps nowhere in this course.

## What is on your screen

| Where | What it is | What you do there |
|---|---|---|
| Left edge, vertical bar | Activity bar. The mortarboard icon is **CaDS Tutor**. | Open the tutor, pick a step. |
| Left, wide column | Explorer: the files of `javascript-foundations`. | Open `src/…` files by clicking. |
| Middle | Editor. One tab per open file. | Write code. |
| Bottom | Panel: **Terminal**, **Problems**, **Output**. Hidden by **View > Terminal**. | Run commands, read output. |

This step itself is the **tutor panel**. Each task there has a check button; pressing one runs the check and prints the verdict beside it.

![The tutor panel beside the editor, with the course tree on the left and the step's badges and text on the right](tutor-panel-step.png)
*Where you are: course tree left, this step right. The badges give the Bloom level, the kind of scaffolding and the estimated time.*

![The panel's task list with the first two checks passed and a green tick beside each](tutor-panel-checks.png)
*The task list. **Check** runs one task, **Show hint** opens the hints one tier at a time, and a `question` task is answered in the box.*

## Three ways to run something

All three do the same thing; different steps mention different ones.

![The application menu open on Terminal, showing New Terminal at the top and Run Task lower down](ide-terminal-menu.png)
*Routes 1 and 3: the menu button top left, then **Terminal**. **New Terminal** opens a shell; **Run Task…** offers commands someone prepared for you, and their output appears under **Terminal** in a tab named after the task.*

![The command palette open with the text Terminal: Create New Terminal typed into it](ide-command-palette.png)
*Route 2: **F1**. In a browser this beats Ctrl+Shift+P, which the browser may swallow. The box arrives with a `>` in it - leave it there and type the first letters.*

## Telling a finished command from a running one

The prompt disappears while a command runs and comes back when it ends. `node --test` then prints a block of counts, and one of those counts is the verdict.

![The integrated terminal showing a failing test: the assertion message, the file it came from, and the prompt back at the bottom](ide-test-failing.png)
*A failing run: the cross, the assertion message, the file it came from, and the prompt back - finished, just not passed.*

![The editor with READY changed to true and a dot instead of a cross on the ready.js tab](ide-edit-unsaved.png)
*A dot on the tab means the change is still only in the editor. Node reads from disk, so save before running again.*

![The terminal showing the same test passing, with pass 1 and fail 0](ide-test-passing.png)
*Success: a green tick, and both counts settled.*

Output stays in the terminal after a command ends, so scroll up to reread it. Closing a terminal with the bin icon throws it away - if you cannot find what a command printed, check whether you are looking at a *new*, empty terminal.

![The terminal reporting Could not find the test file because it is one folder too high](ide-wrong-folder.png)
*`Could not find 'test/…'` means the wrong folder: a new terminal starts in `~/workspace`, one level above the exercises.*

## How you know it worked

`node --version` answered, and this step's test reports both counts settled. Then answer the third task. One thing is worth trying once, because the answer is not obvious:

```bash
node src/m0/ready.js
```

Running an exercise file directly checks nothing - exercise files only export functions for a test to call. Each one prints a reminder naming the command that does check your work.

Next: [your first real exercise](step:m0-02-first-run).
