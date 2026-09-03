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
    check: { type: question, prompt: { en: "You ran a command and then changed a file. Say which of the three ways you used to run it, where in the window the output appeared, how you could tell the command had finished, and which file you edited to make the test pass.", de: "Du hast einen Befehl ausgeführt und dann eine Datei geändert. Sag, welchen der drei Wege du zum Ausführen benutzt hast, wo im Fenster die Ausgabe erschien, woran du erkennen konntest, dass der Befehl fertig war, und welche Datei du geändert hast, damit der Test besteht." }, rubric: "Names one of the three routes (the integrated terminal, the command palette via F1, or Terminal > Run Task); locates the output in the panel at the bottom of the window; gives a usable finished-signal such as the prompt reappearing or the summary line with pass and fail counts; and names src/m0/ready.js as the edited file, explicitly not the file under test/.", bloom: understand, minChars: 80 }
socratic:
  - { trigger: "task:node-runs:failed", question: { en: "Is a terminal open at all, and does its prompt end in the folder javascript-foundations?", de: "Ist überhaupt ein Terminal offen, und endet sein Prompt auf den Ordner javascript-foundations?" }, hints: [ { en: "Menu Terminal > New Terminal opens one at the bottom of the window; the keyboard route is F1, then type 'Terminal: Create New Terminal'.", de: "Menü Terminal > New Terminal öffnet eines am unteren Rand; der Tastaturweg ist F1, dann 'Terminal: Create New Terminal' tippen." }, { en: "Type pwd and press Enter. The last part of the path must be javascript-foundations.", de: "Tippe pwd und drücke Enter. Der letzte Teil des Pfads muss javascript-foundations sein." }, { en: "If it is not, run: cd javascript-foundations", de: "Wenn nicht, führe aus: cd javascript-foundations" } ] }
  - { trigger: "task:ready:failed", question: { en: "Which file did you change - the one under src/, or the one under test/?", de: "Welche Datei hast du geändert - die unter src/ oder die unter test/?" }, hints: [ { en: "The exercise lives in src/m0/ready.js. Files under test/ are the marking scheme and are never edited.", de: "Die Übung liegt in src/m0/ready.js. Dateien unter test/ sind das Prüfschema und werden nie bearbeitet." }, { en: "Change false to true on the last line, then save with Ctrl+S (Cmd+S on a Mac).", de: "Ändere in der letzten Zeile false zu true und speichere mit Strg+S (Cmd+S auf dem Mac)." }, { en: "Run the command again in the same terminal - press the Up arrow to bring it back.", de: "Führe den Befehl im selben Terminal erneut aus - mit der Pfeil-nach-oben-Taste holst du ihn zurück." } ] }
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

Operate this editor well enough to finish any step of this course: open a terminal, run a command three different ways, find the output, tell when a command has finished, and change the right file.

## What is on your screen

The window has four regions, and you will use all four.

| Where | What it is | What you do there |
|---|---|---|
| Left edge, vertical bar | Activity bar. The mortarboard icon is **CaDS Tutor**. | Open the tutor, pick a course, pick a step. |
| Left, wide column | Explorer: the files of `javascript-foundations`. | Open `src/…` files by clicking them. |
| Middle | Editor. One tab per open file. | Write code. |
| Bottom | Panel: **Terminal**, **Problems**, **Output**. | Run commands and read what they print. |

The step you are reading is the **tutor panel**. Its task list carries a check button per task; pressing one runs the check and shows the result next to the task.

![The tutor panel beside the editor, with the course tree on the left and the step's badges and text on the right](tutor-panel-step.png)
*Where you are: the course tree on the left, this step on the right. The badges under the title give the Bloom level, the kind of scaffolding and the estimated time.*

![The panel's task list with the first two checks passed and a green tick beside each](tutor-panel-checks.png)
*The same panel scrolled to its task list. **Check** runs one task and prints the verdict under it - here `exited with 0` and `10 test(s) passed`. **Show hint** opens the hints one tier at a time, and a `question` task is answered in the box.*

If the bottom panel is not visible, the menu **View > Terminal** brings it back. Nothing is lost when it is hidden.

## Three ways to run something

![The application menu open on Terminal, showing New Terminal at the top and Run Task lower down](ide-terminal-menu.png)
*Route 1 and route 3 in one picture: the menu button at the top left, then **Terminal**. **New Terminal** opens a shell at the bottom; **Run Task…** offers the prepared commands.*

![The command palette open with the text Terminal: Create New Terminal typed into it](ide-command-palette.png)
*Route 2: **F1** opens the command palette. It arrives with a `>` already in the box - leave it there, type the first letters of the command, and press Enter.*


All three do the same thing. Learn all three; different steps mention different ones.

1. **The integrated terminal.** Menu **Terminal > New Terminal**. A shell opens at the bottom. Type the command and press Enter. This is the route this course uses by default, because you can see the exact command and its exact output together.
2. **The command palette.** Press **F1**. In a browser this is more reliable than Ctrl+Shift+P, which the browser itself may intercept. Type the first letters of what you want, for example `Terminal: Create New Terminal`, and press Enter.
3. **A task.** Menu **Terminal > Run Task…**, then pick one from the list. A task is a command someone has already written down for you; its output appears in the panel under **Terminal**, in a tab named after the task.

## How you know a command has finished

![The integrated terminal showing a failing test: the assertion message, the file it came from, and the prompt back at the bottom](ide-test-failing.png)
*What a failing run looks like: the terminal panel at the bottom, the cross and the assertion message, and the prompt back at the end - the command has finished, it simply did not pass.*


Two signals, and they are worth learning now:

- **The prompt comes back.** While a command runs, no new prompt is printed. When the line ending in `$` (or `%`) reappears, the command is done.
- **The summary line.** `node --test` ends with a block of counts:

```
ℹ tests 1
ℹ pass 1
ℹ fail 0
```

`fail 0` is success. Anything else is not.

The output stays in the terminal after the command ends; scroll up to read it again. Closing a terminal with the bin icon throws that output away - if you cannot find what a command printed, check whether you are looking at a *new*, empty terminal rather than the one you ran it in.

## Your task

Do the four moves once, deliberately.

**1. Open a terminal** - menu **Terminal > New Terminal**, or **F1** then `Terminal: Create New Terminal`. Check where you are:

```bash
pwd
```

The path has to end in `javascript-foundations`. If it does not, run `cd javascript-foundations`.

**2. Run a command** and read its answer:

```bash
node --version
```

It prints something like `v22.11.0`. That is the first check of this step.

**3. Run the test for this step** and read the failure:

```bash
node --test test/m0-01-using-the-ide.test.js
```

```
✖ m0-01 the workspace is ready
  AssertionError: Set READY to true in src/m0/ready.js - do not change this test file.
```

**4. Change the right file.** Open [`src/m0/ready.js`](file:src/m0/ready.js) in the Explorer, change `false` to `true` on the last line, and save with **Ctrl+S** (**Cmd+S** on a Mac). An unsaved tab shows a dot instead of a cross - Node reads the file from disk, so an unsaved change is invisible to it.

![The editor with READY changed to true and a dot instead of a cross on the ready.js tab](ide-edit-unsaved.png)
*The dot on the tab means the change is only in the editor. Node reads the file from disk, so save with **Ctrl+S** before running the command again.*

Then run the same command again. Press the **Up arrow** in the terminal to bring it back rather than retyping it.

![The terminal showing the same test passing, with pass 1 and fail 0](ide-test-passing.png)
*What success looks like: a green tick, `pass 1` and `fail 0`, and the tab back to a cross because the file is saved.*

If instead you see `Could not find 'test/…'`, the terminal is in the wrong folder - a new terminal starts in `~/workspace`, one level above the exercises:

![The terminal reporting Could not find the test file because it is one folder too high](ide-wrong-folder.png)
*The prompt says `~/workspace`, not `~/workspace/javascript-foundations`. `cd javascript-foundations` fixes it, and the Up arrow brings the command back.*


Files under `test/` are the marking scheme. Editing one to make it pass is the one move that will not help you anywhere in this course.

One more thing worth trying once, because the answer is not obvious:

```bash
node src/m0/ready.js
```

Running an exercise file directly does **not** check anything. Exercise files only export functions for a test to call, so on their own they compute nothing and print nothing. Rather than leave you staring at an empty terminal, each one prints a reminder naming the command that does check your work. The rule behind it: in this course you run files under `test/`, never files under `src/`.

## How you know it worked

`node --version` answers, and the test for this step reports `pass 1` and `fail 0`. Then answer the third task in your own words. Every following step gives you the menu path, the shortcut and the command right where the action is, so you never have to come back here to look one up - but this is where they are all explained.

Next: [your first real exercise](step:m0-02-first-run).
