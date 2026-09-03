---
id: m0-01-welcome
title: "Where you are and what to press first"
bloom: remember
objectives: [ "rust-tooling-cargo" ]
requires: [  ]
estimatedMinutes: 10
scaffold: worked
links:
  - { step: "m0-02-workbench" }
  - { file: "README.md" }
  - { file: "Cargo.toml" }
  - { url: "https://doc.rust-lang.org/book/ch01-03-hello-cargo.html", title: "The Book, 1.3: Hello, Cargo!" }
sources: [ "README.md", "Cargo.toml", "src/lib.rs", "tests/m0-03-first-test.rs" ]
tasks:
  - id: version
    title: "cargo answers"
    check: { type: "command", command: "cargo --version", seedMustFail: false, expectExitCode: 0, expectStdout: "cargo \\d+\\.\\d+\\.\\d+", timeoutMs: 60000 }
  - id: orient
    title: "You can find the next step's test"
    check: { type: "question", prompt: { en: "Name the file that holds the tests for the next step, m0-03-first-test, and the exact command that runs only those tests.", de: "Nenne die Datei, die die Tests des nächsten Steps m0-03-first-test enthält, und den genauen Befehl, der nur diese Tests ausführt." }, rubric: "Names tests/m0-03-first-test.rs as the file and `cargo test --test m0-03-first-test` as the command. This is a remember-level check on the step just read, so the wording may come straight from it. Does not pass: naming src/m0/m0_03_first_test.rs (the exercise, not the test), naming plain `cargo test`, or giving only one of the two.", bloom: "remember", minChars: 20 }
socratic:
  - { trigger: "task:orient:failed", question: { en: "Two answers are wanted, a file and a command. Which of the two are you unsure about?", de: "Verlangt sind zwei Antworten, eine Datei und ein Befehl. Bei welchem der beiden bist du unsicher?" }, hints: [ { en: "Both are in this step's text: the paragraph about the tests/ directory, and the block that runs a single step.", de: "Beide stehen im Text dieses Steps: im Abschnitt über das Verzeichnis tests/ und im Block, der einen einzelnen Step ausführt." }, { en: "The file lives in tests/ and its name is the step id plus .rs. The command names that same id after --test.", de: "Die Datei liegt in tests/ und heißt wie die Step-ID plus .rs. Der Befehl nennt dieselbe ID hinter --test." }, { en: "`ls tests/` prints every valid name, and the step you are asked about is the one directly after this one.", de: "`ls tests/` gibt jeden gültigen Namen aus, und gefragt ist der Step direkt nach diesem." } ] }
  - { trigger: "task:version:failed", question: { en: "cargo did not answer. Is cargo on this container's PATH?", de: "cargo hat nicht geantwortet. Liegt cargo im PATH dieses Containers?" }, hints: [ { en: "cargo works on the package in the current directory: run `pwd`, and if it is not the rust-foundations folder, change into it.", de: "cargo arbeitet am Paket im aktuellen Verzeichnis: führe `pwd` aus, und wechsle in den Ordner rust-foundations, falls du woanders stehst." }, { en: "`cargo --version` failing as well means cargo is not on your PATH at all, which is a setup problem, not a code problem.", de: "Schlägt auch `cargo --version` fehl, liegt cargo gar nicht im PATH - das ist ein Einrichtungs-, kein Codeproblem." }, { en: "If the build fails with a real compiler error, someone edited a file: `git status` shows what changed, `git checkout -- <file>` restores it.", de: "Scheitert der Build an einem echten Compilerfehler, wurde eine Datei geändert: `git status` zeigt was, `git checkout -- <Datei>` stellt sie wieder her." } ] }
misconceptions:
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
---
## Learning goal

Know what you are looking at, which command starts the work, and where a step's tests live - so that every later step is only about Rust, never about the tooling.

## What you see

You are in a Rust *package* called `rust_foundations`. Everything the course asks you to do happens in this one folder. Four places matter:

- **`Cargo.toml`** is the manifest: the package name, the Rust edition, and the list of dependencies (here: none, on purpose - everything in this course uses the standard library).
- **`src/`** holds the exercises, one file per step, grouped into `m0/` … `m6/` and `project/`. **You edit these files, and only these.**
- **`tests/`** holds one file per step, named exactly like the step: `tests/m0-03-first-test.rs`. These are finished and you do not change them. Read them - they say precisely what your code must do.
- **`README.md`** is the map of the folder, including the directories you will meet later (`examples/`, `snippets/`, `repair/`, `samples/`).

## The first step, concretely

Open a terminal in this folder and run:

```bash
cargo --version
cargo build
```

`cargo --version` prints something like `cargo 1.94.0`. If it does not, nothing else in this course will work, and the problem is your environment, not your code. The next step, [Operating the workbench](step:m0-02-workbench), goes through the window region by region and through the three ways to run a command; this step only establishes that the toolchain answers at all.

Note that the package compiles **even though nothing is implemented yet**: unfinished exercises are `todo!()`, a macro that type-checks as any type and panics if it is ever reached. The package always builds; the tests are what fail.

## Reading cargo's output

The first build downloads nothing and takes a second or two. What you see is:

```text
   Compiling rust_foundations v0.1.0 (/home/coder/workspace/rust-foundations)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.42s
```

`dev` profile means: no optimisation, full debug information - the right trade for a course. Everything cargo produces lands in `target/`, which is git-ignored and can always be deleted.

## Running one step's tests

`cargo test` runs everything, including the twenty-odd steps you have not started, so it will report a wall of failures. That is expected and useless to you right now. Run **one** step instead:

```bash
cargo test --test m0-03-first-test
```

The name after `--test` is the file name in `tests/`, without `.rs`, and it is identical to the step id. The tutor prints this command for whichever step you are on, so you never have to guess it.

## Your task

Run `cargo --version`; the first check confirms it. Then answer where the next step's tests live and how to run only them. The next step takes you through the window itself.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo --version
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** the program's output, containing `cargo \d+\.\d+\.\d+`.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
