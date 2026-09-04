---
id: m0-00-workbench
title: Working the window
bloom: apply
objectives: [cz.tooling.workbench]
requires: []
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m0-01-welcome }
  - { file: "scripts/check_ram_budget.py" }
  - { doc: "docs/reference/measurements.md" }
sources: [scripts/check_ram_budget.py, docs/reference/measurements.md]
tasks:
  - id: ran-a-task
    title: 'You have run the task "CaDS: RAM budget"'
    check: { type: task, label: "CaDS: RAM budget", expectExitCode: 0 }
  - id: read-the-output
    title: Read the number out of the output
    check: { type: command, cwd: ".", command: "python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf", expectExitCode: 0, expectStdout: "margin" }
  - id: where-was-it
    title: Say where the output appeared
    check: { type: question, prompt: { en: "In which of the four areas did the task's output appear, and what does its last line say?", de: "In welchem der vier Bereiche erschien die Ausgabe des Tasks, und was sagt ihre letzte Zeile?" }, rubric: "The output appeared at the bottom, in the terminal area, in a terminal of its own carrying the task's name - not in the tutor panel and not in the editor. The last line starts with PASS and gives the margin in bytes. One sentence on the place, one on the line.", bloom: apply }
socratic:
  - { trigger: "task:ran-a-task:failed", question: { en: "Did a new terminal open at the bottom, or did nothing happen at all?", de: "Hat sich unten ein neues Terminal geöffnet, oder ist gar nichts passiert?" }, hints: [ { en: "The most common cause is that the command palette never opened. Press F1 rather than the keyboard shortcut - a browser often keeps Ctrl+Shift+P for itself.", de: "Die häufigste Ursache ist, dass sich die Befehlspalette nie geöffnet hat. Drücke F1 statt des Tastenkürzels - Strg+Umschalt+P behält der Browser oft für sich." }, { en: "Second way, no keyboard at all: menu ☰ at the top left, then Terminal, then Run Task..., then pick CaDS: RAM budget from the list.", de: "Zweiter Weg, ganz ohne Tastatur: Menü ☰ oben links, dann Terminal, dann Run Task..., dann CaDS: RAM budget aus der Liste wählen." }, { en: "If a terminal did open and shows an error, the build has not run yet: run the task CaDS: Build first, it needs the ELF file.", de: "Wenn sich ein Terminal geöffnet hat und einen Fehler zeigt, ist der Build noch nicht gelaufen: führe zuerst den Task CaDS: Build aus, das Skript braucht die ELF-Datei." } ] }
  - { trigger: "task:read-the-output:failed", question: { en: "The script needs a built ELF file. Has the board build run in this workspace yet?", de: "Das Skript braucht eine gebaute ELF-Datei. Ist der Board-Build in diesem Arbeitsbereich schon gelaufen?" }, hints: [ { en: "Run the task CaDS: Build once - F1, then Tasks: Run Task, then CaDS: Build. It takes about a minute the first time.", de: "Führe den Task CaDS: Build einmal aus - F1, dann Tasks: Run Task, dann CaDS: Build. Beim ersten Mal dauert das etwa eine Minute." }, { en: "The file the script reads is build/itsboard/cads-zero.elf; if it is missing, the build has not finished.", de: "Die Datei, die das Skript liest, ist build/itsboard/cads-zero.elf; fehlt sie, ist der Build nicht durchgelaufen." }, { en: "Watch the build's own terminal to the end: the last line has to be the build tool's, not a compiler error.", de: "Sieh dem Build in seinem eigenen Terminal bis zum Ende zu: die letzte Zeile muss die des Build-Werkzeugs sein, keine Compilerfehlermeldung." } ] }
  - { trigger: "question:where-was-it:weak", question: { en: "Look at the bottom of the window. What is the tab of that panel called?", de: "Sieh unten im Fenster nach. Wie heißt der Reiter dieses Bereichs?" }, hints: [ { en: "The four areas are named in the section 'What you have in front of you' above, each with what belongs in it.", de: "Die vier Bereiche stehen im Abschnitt „Was du vor dir hast“ weiter oben, jeder mit dem, was hineingehört." }, { en: "A task always gets its own terminal, and the terminal is named after the task. There is a dropdown on the right listing all open terminals.", de: "Ein Task bekommt immer sein eigenes Terminal, und das Terminal trägt den Namen des Tasks. Rechts gibt es eine Auswahlliste mit allen offenen Terminals." }, { en: "The last line of this script always starts with PASS or FAIL, followed by a number in bytes.", de: "Die letzte Zeile dieses Skripts beginnt immer mit PASS oder FAIL, gefolgt von einer Zahl in Byte." } ] }
misconceptions:
  - pattern: "No such file or directory"
    question: { en: "The script cannot find the file it reads. Which step produces that file?", de: "Das Skript findet die Datei nicht, die es liest. Welcher Schritt erzeugt diese Datei?" }
    hints:
      - { en: "The build produces it. Nothing here works before the board build has run once.", de: "Der Build erzeugt sie. Vor dem ersten Board-Build funktioniert hier nichts." }
      - { en: "Run the task CaDS: Build - F1, then Tasks: Run Task, then CaDS: Build. About a minute the first time.", de: "Führe den Task CaDS: Build aus - F1, dann Tasks: Run Task, dann CaDS: Build. Beim ersten Mal etwa eine Minute." }
      - { en: "Afterwards build/itsboard/cads-zero.elf exists, and this task passes.", de: "Danach existiert build/itsboard/cads-zero.elf, und diese Aufgabe besteht." }
---
## Learning goal

Work this window: find a command, start a task, read its output and close a terminal again. Without that, no later step will get you anywhere.

## What you have in front of you

Four areas, and you need no more than these.

![The window with all four areas: icon strip on the left, course tree beside it, step text in the middle, terminal at the bottom](workbench-four-areas.png)

1. **Far left** a narrow strip of icons, the *activity bar*. The graduation-cap icon opens the **CaDS Tutor**. The topmost icon opens the file explorer.
2. **Next to it** the **side bar** with the course tree: under `KURSE / COURSES` sit the course, its modules and its steps, with `FORTSCHRITT / PROGRESS` at the bottom. A padlock in front of a step means it is still locked because the step before it is unfinished.
3. **In the middle**, clicking a step opens the **step text** as a tab of its own, named `CaDS Tutor: <title>`. At its top is the path `Course › Module › Step n of N`, next to it the **Run all checks** button and a button that switches the language. At the very bottom of the step text are the tasks with their buttons.
4. **At the bottom** the **terminal area**, with the tabs `PROBLEMS`, `OUTPUT`, `DEBUG CONSOLE`, `TERMINAL`, `PORTS`, `MEMORY`, `XRTOS`. This is where the output of everything you start appears. It is collapsed to begin with; `Ctrl`/`Cmd`+`J` opens and closes it.

![The step text as a tab in the middle, with its path line, Bloom level and the Run all checks button](tutor-panel-step.png)

> **The interface is in English.** Menus and commands are called `Terminal`, `Run Task...`, `New Terminal`. Wherever this course names a menu entry, it is written exactly as it appears on screen.

## Three ways to run something

All three reach the same result. Use the first; the other two are your way out when it does not work.

**Way 1 — the command palette.** Press **`F1`**. An input box opens at the top centre: that is the command palette. Type `>` first, then the command name: the leading angle bracket puts the palette in command
mode, and the list filters as you type. Enter runs the highlighted entry. Without the `>` the
palette searches file names instead and answers *No matching results*, which looks as though the
command did not exist. The palette also remembers the mode you used last.

![The command palette open, with Tasks: Run Task typed and the filtered list of matches](palette-open.png)

> **`F1` rather than `Ctrl`/`Cmd`+`Shift`+`P`.** Both shortcuts do the same thing, but this environment runs in a browser, and browsers often keep `Ctrl`+`Shift`+`P` for themselves — then nothing happens, or a browser window opens instead. `F1` is the reliable route.

**Way 2 — the menu.** The menu bar hides behind the three-line icon (**☰**) at the very top left. Clicking it opens `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal`, `Help`. Move onto **`Terminal`**, then onto **`Run Task...`** — the list of every task in this project opens. No keyboard at all.

![The menu behind the three-line icon, Terminal expanded, showing New Terminal and Run Task](menu-run-task.png)

**Way 3 — the terminal itself.** **☰ → `Terminal` → `New Terminal`** opens a terminal at the bottom where you type commands and run them with Enter. You need this when a step names a script that has no task.

## What a task is, and how you know it has finished

A **task** is a command someone has already written down and given a name. This project ships six, among them `CaDS: Build` (builds the firmware for the board) and `CaDS: RAM budget` (works out how much working memory is left). You do not need to know the command behind it, only the name.

![The list of every task in the project, from CaDS: Build to CaDS: RAM budget](task-picker.png)

When you start a task, **a terminal of its own opens at the bottom, carrying the task's name**. That is where it runs and where its output appears. On the right of the terminal area every open terminal is listed — that is how you switch between them.

**A task has finished** when no new lines appear and a prompt is back. `CaDS: RAM budget` needs under a second for that; `CaDS: Build` about a minute the first time.

![The terminal area with the RAM budget script's output: margin = 928 B and PASS](task-terminal-output.png)

## Three operating mistakes almost everyone makes once

- **The task ran, but you are looking for the output in the wrong window.** It is *not* in the step text and *not* in the editor, but at the bottom in the terminal area, in the terminal named after the task. If that area is collapsed, `Ctrl`/`Cmd`+`J` opens it; then pick the right terminal from the list on the right.
- **You closed the terminal and killed the running process with it.** The cross on a terminal ends the process inside it — halfway through a build that means the build is aborted. To only tuck the terminal away, use `Ctrl`/`Cmd`+`J`; that leaves the process running.
- **The shortcut for the palette does nothing.** The browser intercepted it. Use `F1`, or way 2 through **☰ → `Terminal`**.

## Your task

Run the task **`CaDS: RAM budget`** and read its output.

The easiest route: **`F1`**, then type `Tasks: Run Task`, Enter, then pick `CaDS: RAM budget` from the list. Without the keyboard: **☰ → `Terminal` → `Run Task...` → `CaDS: RAM budget`**. It takes under a second.

A terminal carrying the task's name opens at the bottom. It holds four lines; the last starts with `PASS` and gives a margin in bytes. That margin is the room left in working memory for the network stack and the graphics — in M4 you will calculate with it yourself.

Then you answer one question about where the output appeared. If a task stays red, the **Show hint** button on it helps, and its first tier asks about exactly what most often goes wrong.

**Where you work:** open a file `Ctrl`/`Cmd`+`P` · open and close the terminal `Ctrl`/`Cmd`+`J` · command palette `F1` · menu **☰** top left · start a task **☰ → `Terminal` → `Run Task...`** · check tasks with the **Check** button on a task or **Run all checks** at the top of the step text.
