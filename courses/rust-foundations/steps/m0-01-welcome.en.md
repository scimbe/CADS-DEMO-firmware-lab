---
id: m0-01-welcome
title: "Where you are and what to press first"
bloom: remember
objectives: [ "rust-tooling-cargo" ]
requires: [  ]
estimatedMinutes: 10
scaffold: worked
links:
  - { step: "m0-02-first-test" }
  - { file: "README.md" }
  - { file: "Cargo.toml" }
  - { url: "https://doc.rust-lang.org/book/ch01-03-hello-cargo.html", title: "The Book, 1.3: Hello, Cargo!" }
sources: [ "README.md", "Cargo.toml", "src/lib.rs", "tests/m0-02-first-test.rs" ]
tasks:
  - id: version
    title: "cargo answers"
    check: { type: "command", command: "cargo --version", expectExitCode: 0, expectStdout: "cargo \\d+\\.\\d+\\.\\d+", timeoutMs: 60000 }
  - id: build
    title: "The workspace compiles"
    check: { type: "command", command: "cargo build", expectExitCode: 0, timeoutMs: 180000 }
  - id: orient
    title: "You can find the next step's test"
    check: { type: "question", prompt: { en: "Name the file that holds the tests for the next step, m0-02-first-test, and the exact command that runs only those tests.", de: "Nenne die Datei, die die Tests des nächsten Steps m0-02-first-test enthält, und den genauen Befehl, der nur diese Tests ausführt." }, rubric: "Names tests/m0-02-first-test.rs as the file and `cargo test --test m0-02-first-test` as the command. Naming src/m0/m0_02_first_test.rs instead of the tests file, or plain `cargo test`, is incomplete.", bloom: "remember", minChars: 20 }
socratic:
  - { trigger: "task:build:failed", question: { en: "cargo could not build the workspace. Which directory is your terminal in, and does it contain a Cargo.toml?", de: "cargo konnte den Workspace nicht bauen. In welchem Verzeichnis steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "cargo works on the package in the current directory: run `pwd`, and if it is not the rust-foundations folder, change into it.", de: "cargo arbeitet am Paket im aktuellen Verzeichnis: fuehre `pwd` aus, und wechsle in den Ordner rust-foundations, falls du woanders stehst." }, { en: "`cargo --version` failing as well means cargo is not on your PATH at all, which is a setup problem, not a code problem.", de: "Schlaegt auch `cargo --version` fehl, liegt cargo gar nicht im PATH - das ist ein Einrichtungs-, kein Codeproblem." }, { en: "If the build fails with a real compiler error, someone edited a file: `git status` shows what changed, `git checkout -- <file>` restores it.", de: "Scheitert der Build an einem echten Compilerfehler, wurde eine Datei geaendert: `git status` zeigt was, `git checkout -- <Datei>` stellt sie wieder her." } ] }
---
## Learning goal

Know what you are looking at, which command starts the work, and where a step's tests live - so that every later step is only about Rust, never about the tooling.

## What you see

You are in a Rust *package* called `rust_foundations`. Everything the course asks you to do happens in this one folder. Four places matter:

- **`Cargo.toml`** is the manifest: the package name, the Rust edition, and the list of dependencies (here: none, on purpose - everything in this course uses the standard library).
- **`src/`** holds the exercises, one file per step, grouped into `m0/` … `m6/` and `project/`. **You edit these files, and only these.**
- **`tests/`** holds one file per step, named exactly like the step: `tests/m0-02-first-test.rs`. These are finished and you do not change them. Read them - they say precisely what your code must do.
- **`README.md`** is the map of the folder, including the directories you will meet later (`examples/`, `snippets/`, `repair/`, `samples/`).

## The first step, concretely

Open a terminal in this folder and run:

```bash
cargo --version
cargo build
```

`cargo --version` prints something like `cargo 1.94.0`. If it does not, nothing else in this course will work, and the problem is your environment, not your code.

`cargo build` compiles the package. It will print a line per crate and finish with `Finished`. It succeeds **even though nothing is implemented yet**: unfinished exercises are `todo!()`, a macro that type-checks as any type and panics if it is ever reached. So the package always compiles; the tests are what fail.

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
cargo test --test m0-02-first-test
```

The name after `--test` is the file name in `tests/`, without `.rs`, and it is identical to the step id. The tutor prints this command for whichever step you are on, so you never have to guess it.

## Your task

Run the two commands above; the first two checks confirm them. Then answer where the next step's tests live and how to run only them. The next step makes those tests pass.
