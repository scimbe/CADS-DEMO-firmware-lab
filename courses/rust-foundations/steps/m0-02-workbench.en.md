---
id: m0-02-workbench
title: "Operating the workbench"
bloom: apply
objectives: [ "rust-tooling-cargo" ]
requires: [ "m0-01-welcome" ]
estimatedMinutes: 20
scaffold: worked
links:
  - { step: "m0-03-first-test" }
  - { file: "README.md" }
  - { file: "Cargo.toml" }
  - { url: "https://code.visualstudio.com/docs/terminal/basics", title: "VS Code docs: Integrated Terminal" }
sources: [ "README.md", "Cargo.toml", "src/lib.rs" ]
tasks:
  - id: toolchain
    title: "All three tools answer"
    check: { type: "command", command: "cargo --version && cargo fmt --version && cargo clippy --version", expectExitCode: 0, expectStdout: "clippy", seedMustFail: false, timeoutMs: 120000 }
  - id: build
    title: "The workspace compiles from the terminal"
    check: { type: "command", command: "cargo build", expectExitCode: 0, seedMustFail: false, timeoutMs: 180000 }
  - id: panels
    title: "You can say where output appears"
    check: { type: "question", prompt: { en: "A classmate says a cargo command printed nothing. Give the three things you would have them check, in the order you would ask. One line each.", de: "Ein Kommilitone sagt, ein cargo-Befehl habe nichts ausgegeben. Nenne die drei Dinge, die du ihn prüfen ließest, in der Reihenfolge, in der du fragen würdest. Je eine Zeile." }, rubric: "Judged on the answer, not on the step text. All three criteria must be met: (1) three distinct checks, one line each, every one of them something the classmate can look at or type rather than something they are told to know; (2) the three come in a stated order and the answer gives the reason for that order, the observation that costs nothing before anything that costs a command; (3) the three name three different causes rather than three wordings of one. Accepted causes include the wrong pane, a command that has not finished, and a terminal in the wrong folder; another defensible cause counts as well. Does not pass: the names of the three tabs offered as the three checks; an unordered list; an order asserted without a reason; a passage of the step retold with nothing in it a classmate could carry out.", bloom: "understand", minChars: 60 }
socratic:
  - { trigger: "task:panels:failed", question: { en: "You are asked for an order, not a list. Which of your three checks costs the least to try?", de: "Gefragt ist eine Reihenfolge, keine Liste. Welche deiner drei Prüfungen kostet am wenigsten?" }, hints: [ { en: "A good order starts with what you can see without typing anything and ends with what needs a command.", de: "Eine gute Reihenfolge beginnt mit dem, was ohne Tippen zu sehen ist, und endet mit dem, was einen Befehl braucht." }, { en: "Three different situations all produce \"nothing happened\": you are looking somewhere else, it has not finished, or it never started in the right place.", de: "Drei verschiedene Lagen erzeugen alle \"es passiert nichts\": du schaust woanders hin, es ist nicht fertig, oder es hat nie an der richtigen Stelle begonnen." }, { en: "The third of those is what the instructions at the foot of every step warn about, and `pwd` settles it in one word.", de: "Das dritte davon ist das, wovor die Anweisungen am Fuß jedes Steps warnen, und `pwd` klärt es mit einem Wort." } ] }
  - { trigger: "task:build:failed", question: { en: "Which folder does the terminal say it is in, and is a Cargo.toml there?", de: "Welchen Ordner nennt das Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "Type `pwd` and press Enter; the answer must end in the rust-foundations folder.", de: "Tippe `pwd` und drücke die Eingabetaste; die Antwort muss auf den Ordner rust-foundations enden." }, { en: "Close the terminal with the bin icon on its right-hand side and open a fresh one with Terminal → New Terminal; a new terminal always starts in the workspace folder.", de: "Schließe das Terminal über das Papierkorbsymbol an seiner rechten Seite und öffne mit Terminal → Neues Terminal ein frisches; ein neues Terminal startet immer im Workspace-Ordner." }, { en: "If `cargo` itself is not found, the toolchain is missing from this container - that is an environment fault, not something you can fix in the editor.", de: "Wird `cargo` selbst nicht gefunden, fehlt die Toolchain in diesem Container - das ist ein Umgebungsfehler und nichts, was du im Editor beheben kannst." } ] }
  - { trigger: "task:toolchain:failed", question: { en: "Which of the three commands failed? Run them one at a time to find out.", de: "Welcher der drei Befehle ist gescheitert? Führe sie einzeln aus, um es herauszufinden." }, hints: [ { en: "`&&` stops at the first failure, so the last line you see is the one that broke.", de: "`&&` bricht beim ersten Fehlschlag ab, die letzte sichtbare Zeile ist also die gescheiterte." }, { en: "`cargo fmt --version` and `cargo clippy --version` need the rustfmt and clippy components; both belong in this image.", de: "`cargo fmt --version` und `cargo clippy --version` brauchen die Komponenten rustfmt und clippy; beide gehören in dieses Image." }, { en: "If one is genuinely absent, report it - the last step of the course checks formatting and lints with exactly these two.", de: "Fehlt eines wirklich, melde es - der letzte Step des Kurses prüft Formatierung und Lints mit genau diesen beiden." } ] }
misconceptions:
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
---
## Learning goal

Operate this window on purpose: know what each region is for, know the three ways to run a command, and know how to tell that a command has finished.

## What is on the screen

Five regions, from the outside in:

- **Activity bar**, the icon strip on the far left. The mortarboard icon opens **CaDS Tutor**; the top icon opens the file explorer. Clicking an icon that is already active hides its side bar, which is the usual explanation for "my files disappeared".
- **Side bar**, next to it. With the explorer selected it lists the workspace folder: `src/`, `tests/`, `Cargo.toml`. One click previews a file, a double click keeps it open.
- **Editor**, the large area in the middle. This is where you change files. A dot instead of the close cross on a tab means unsaved changes.
- **Panel**, along the bottom, with the tabs **Terminal**, **Problems** and **Output**. It is closed until you need it.
- **Status bar**, the thin strip at the very bottom.

The **CaDS Tutor** panel shows the step you are reading, the tasks with a **Check** button each, and the field for asking the tutor a question. The Check button runs the step's real command and shows its real output; it is not a simulation.

## The three tabs at the bottom are not interchangeable

This is the single most common way to lose ten minutes:

Click each of **Terminal**, **Problems** and **Output** once now, with nothing running, and note what is in them. One of the three is where a command you typed prints; the other two hold things no command of yours will ever write. Which is which is worth finding out here rather than in the middle of a failing step.

## Three ways to run the same thing

1. **Integrated terminal.** Menu **Terminal → New Terminal**. It opens in the panel at the bottom - in `~/workspace`, one level **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. So the first thing you type in any new terminal is:

```bash
cd ~/workspace/rust-foundations
```

Without it, cargo answers `could not find Cargo.toml`, which is the single most common way to get stuck on step one. This is the way the course uses everywhere, because you see exactly what the checks see.

2. **Command palette.** Press **F1**. In a browser this is more reliable than Ctrl+Shift+P, which the browser itself may keep. The palette opens in one of two modes and **remembers the one you used last**: without a leading `>` it searches files, with `>` it searches commands. So a palette entry is typed with its `>` in front, the way the block at the end of this step shows. Forget the `>` and you get *No matching results* and nothing happens - that is the palette telling you it is looking for a file of that name.

![The tutor panel's task list. The first task is ticked green and reads
"exited with 0" under its Check button; the second is a question with a text
box, a Submit answer button and a Show hint button.](task-check-result.png)

3. **The Check button** in the tutor panel, next to a task. It runs that task's command for you and shows the output in the panel. It always uses the right folder, so it never needs the `cd`.

To close a terminal, press the bin icon on its right-hand edge, or type `exit`. Nothing is lost, a terminal holds no state you need.

## The palette, in command mode

![The command palette open over the editor. The input reads
'>Terminal: Create New Terminal' and the first result of the same name is
selected; the explorer on the left lists the rust-foundations
folder.](palette-new-terminal.png)

Note the `>` at the very start of the input, and that the top result is the
command you want. Without the `>` this same list reads *No matching results*.

## How you know a command has finished

The shell prompt reappears underneath the output. Until it does, the command is still running: a blinking cursor with no prompt is work in progress, not a hang.

## Your task

Open a terminal and run the two commands below. Then answer where output appears and how you recognise a finished command. The next step makes a failing test pass.

## Running it

::: do palette="> Terminal: Create New Terminal"
Open a terminal: press **F1**, type the entry with its leading `>`, press Enter. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.
> expect: The panel opens at the bottom on its **Terminal** tab, and the prompt ends in `~/workspace`.
> recover: If the palette says *No matching results*, the `>` is missing and it is searching for a file of that name - type it in front and repeat. The menu does the same: **Terminal → New Terminal**.
:::

The terminal starts in `~/workspace`, the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate once per terminal:

```bash
cd ~/workspace/rust-foundations
```

::: do command="cargo --version && cargo fmt --version && cargo clippy --version" cwd="."
Run the command of the *All three tools answer* task.
> expect: The command ends without an error and its output contains `clippy`.
> recover: If the cursor sits there and the prompt does not come back, it is still running - that is not a hang. If the terminal answers `command not found`, this terminal is not inside the container - open a new one from the same workspace.
:::

::: do command="cargo build" cwd="."
Run the command of the *The workspace compiles from the terminal* task.
> expect: The command ends without an error and without a message; the prompt reappears below it.
> recover: If the cursor sits there and the prompt does not come back, it is still running - that is not a hang. If cargo answers `error: could not find \`Cargo.toml\` in \`/home/coder/workspace\` or any parent directory`, this terminal never got the `cd` above - do it now.
:::

![A terminal in the bottom panel: the prompt reads coder@…:~/workspace/rust-foundations, with the cargo command and its output below it.](terminal-run-a-step.png)

The **Check** button on the task runs the same command and shows the same output in the tutor panel; it always uses the right folder, so it never needs the `cd`. The terminal is there so you can see it yourself and repeat it. The output appears on the **Terminal** tab, not in **Problems** and not in **Output** - those two show other things and are the usual reason for "nothing happens".
