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
    check: { type: "question", prompt: { en: "You ran cargo build and saw nothing. Name the three places at the bottom of the window where output can appear, say which one a terminal command writes to, and say how you can tell from the terminal alone that a command has finished rather than hung.", de: "Du hast cargo build ausgeführt und nichts gesehen. Nenne die drei Stellen unten im Fenster, an denen Ausgabe erscheinen kann, sage, in welche davon ein Terminalbefehl schreibt, und sage, woran du allein am Terminal erkennst, dass ein Befehl fertig ist und nicht hängt." }, rubric: "Names Terminal, Problems and Output as the three panel tabs, states that a command typed in the terminal writes to the Terminal tab only (Problems shows diagnostics collected by extensions, Output shows extension logs), and states that the shell prompt reappearing under the output is the finished signal - a cursor with no prompt means it is still running. Credit for noting that the Check button shows the same output inside the tutor panel.", bloom: "understand", minChars: 60 }
socratic:
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

- **Terminal** shows what a command you typed prints. Everything in this course goes here.
- **Problems** shows diagnostics that an extension collected, in a list. It stays empty in this course; do not wait for it.
- **Output** shows the logs of the extensions themselves. Nothing you run appears here.

If a command "printed nothing", check that you are looking at **Terminal**.

## Three ways to run the same thing

1. **Integrated terminal.** Menu **Terminal → New Terminal**. It opens in the panel at the bottom - in `~/workspace`, one level **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. So the first thing you type in any new terminal is:

```bash
cd ~/workspace/rust-foundations
```

Without it, cargo answers `could not find Cargo.toml in /home/coder/workspace or any parent directory`, which is the single most common way to get stuck on step one. Then type the command and press Enter. This is the way the course uses everywhere, because you see exactly what the checks see.

2. **Command palette.** Press **F1**. In a browser this is more reliable than Ctrl+Shift+P, which the browser itself may keep. The palette opens in one of two modes and **remembers the one you used last**: without a leading `>` it searches files, with `>` it searches commands. So type `>Terminal: Create New Terminal`. If you forget the `>`, you get *No matching results* and nothing happens - that is the palette telling you it is looking for a file of that name.

3. **The Check button** in the tutor panel, next to a task. It runs that task's command for you and shows the output in the panel. It always uses the right folder, so it never needs the `cd`.

To close a terminal, press the bin icon on its right-hand edge, or type `exit`. Nothing is lost - a terminal holds no state you need. Open a new one the same way and you are back where you were.

## Pictures of these steps

*Screenshots of the window, the palette in command mode and a terminal after
the `cd` belong here and are not in yet.* They were captured from a real lab
container but cannot be shipped while the tutor panel opens the wrong course;
`courses/rust-foundations/assets/README.md` names the four files and the
defect. Everything they would show is written out above.

## How you know a command has finished

The shell prompt reappears underneath the output. Until it does, the command is still running: a blinking cursor with no prompt is work in progress, not a hang. The first `cargo build` takes a few seconds because the crate is compiled once; afterwards it answers immediately.

## Your task

Open a terminal and run the two commands below. Then answer where output appears and how you recognise a finished command. The next step makes a failing test pass.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo --version && cargo fmt --version && cargo clippy --version
cargo build
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** the program's output, containing `clippy`.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
