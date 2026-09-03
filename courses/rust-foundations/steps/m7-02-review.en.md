---
id: m7-02-review
title: "Review your own tool"
bloom: evaluate
objectives: [ "rust-project-cli", "rust-ch10-03-lifetime-syntax" ]
requires: [ "m7-01-wordstat" ]
estimatedMinutes: 40
scaffold: independent
recallFrom: [ "m1-02-move-vs-clone", "m5-04-custom-error", "m4-04-collections-report" ]
links:
  - { step: "m0-01-welcome" }
  - { file: "src/project/wordstat.rs" }
  - { file: "README.md" }
  - { url: "https://doc.rust-lang.org/book/ch10-02-traits.html", title: "The Book, 10.2: Traits: Defining Shared Behavior" }
sources: [ "src/project/wordstat.rs", "tests/m7-01-wordstat.rs", "README.md" ]
tasks:
  - id: fmt
    title: "The workspace is formatted"
    check: { type: "command", command: "cargo fmt --check", seedMustFail: false, expectExitCode: 0, timeoutMs: 120000 }
  - id: clippy
    title: "clippy is clean with warnings denied"
    check: { type: "command", command: "cargo clippy --all-targets -- -D warnings", expectExitCode: 0, timeoutMs: 300000 }
  - id: critique
    title: "You can review your own design"
    check: { type: "question", prompt: { en: "Review your wordstat as if it were someone else's. Name one place where you allocate or clone more than the job needs and say what you would change; name one decision you made about errors (which failures panic, which return Err, what the messages say) and defend it; and name one thing the current design would make hard if the tool had to stream a file too large to hold in memory.", de: "Begutachte dein wordstat, als wäre es fremder Code. Nenne eine Stelle, an der du mehr allozierst oder klonst, als die Aufgabe verlangt, und sage, was du ändern würdest; nenne eine Entscheidung zur Fehlerbehandlung (was abstürzt, was Err liefert, was die Meldungen sagen) und verteidige sie; und nenne eine Sache, die der jetzige Entwurf erschweren würde, müsste das Werkzeug eine zu große Datei strömend verarbeiten." }, rubric: "All three parts answered concretely about the student's own code. The allocation point should name a real site - a clone per word in the ranking, the String built by normalize for every token, or read_to_string holding the whole file - with a plausible alternative. The error defence should state a contract, not a preference: which failures are the caller's business (missing file, empty file) and which would be bugs. The streaming answer should identify read_to_string as the blocker and note what changes with a line-by-line reader, ideally observing that count_words and report already work per-chunk while run does not. Does not pass: three answers about Rust in general rather than about this file, an allocation site with no alternative offered, or an error defence that states a preference instead of a contract.", bloom: "evaluate", minChars: 200 }
socratic:
  - { trigger: "task:clippy:failed", question: { en: "What does clippy name, and in which file? A lint on your own project code is worth fixing; one on an exercise file may be deliberate.", de: "Was benennt clippy, und in welcher Datei? Ein Lint im eigenen Projektcode lohnt die Korrektur; einer in einer Übungsdatei kann Absicht sein." }, hints: [ { en: "Every lint clippy reports names the rule; look it up with the link in its output before you silence it.", de: "Jeder von clippy gemeldete Lint nennt die Regel; schlage sie über den Link in der Ausgabe nach, bevor du sie stummschaltest." }, { en: "The workspace's existing `#[allow]` attributes all carry a comment saying why; a new one without a reason is a smell.", de: "Die vorhandenen `#[allow]`-Attribute des Workspace tragen alle einen Kommentar mit Begründung; ein neues ohne Grund ist ein schlechtes Zeichen." }, { en: "`cargo clippy --fix` applies the mechanical suggestions, but read the diff before you keep it.", de: "`cargo clippy --fix` übernimmt die mechanischen Vorschläge, aber lies den Diff, bevor du ihn behältst." } ] }
  - { trigger: "task:critique:failed", question: { en: "Open your wordstat.rs and find every place a String is created. How many of them survive the call?", de: "Öffne deine wordstat.rs und finde jede Stelle, an der ein String entsteht. Wie viele davon überleben den Aufruf?" }, hints: [ { en: "`normalize` builds a String for every token, including tokens that turn out to be words already counted.", de: "`normalize` baut für jedes Token einen String, auch für Token, die sich als bereits gezählte Wörter erweisen." }, { en: "For the error part, state the contract rather than the preference: which failures are the caller's business, and which would mean your own code is wrong?", de: "Formuliere beim Fehlerteil den Vertrag statt der Vorliebe: welche Fehlschläge gehen den Aufrufer an, und welche hiessen, dass dein eigener Code falsch ist?" }, { en: "For the streaming part, find the one line that needs the whole file present before anything else can happen.", de: "Suche für den Ström-Teil die eine Zeile, die die ganze Datei benötigt, bevor überhaupt etwas anderes passieren kann." } ] }
  - { trigger: "task:fmt:failed", question: { en: "Which file does cargo fmt want to change? Running it is the fix; reading the diff first is the lesson.", de: "Welche Datei will cargo fmt ändern? Es auszuführen ist die Lösung; den Diff zuerst zu lesen ist die Lektion." }, hints: [ { en: "`cargo fmt` rewrites the files; `cargo fmt --check` only reports.", de: "`cargo fmt` schreibt die Dateien um; `cargo fmt --check` meldet nur." }, { en: "The output lists each file and the line where the difference starts.", de: "Die Ausgabe nennt jede Datei und die Zeile, an der der Unterschied beginnt." }, { en: "Formatting is not a matter of taste in a shared codebase; it is what keeps diffs about behaviour.", de: "Formatierung ist in einer geteilten Codebasis keine Geschmacksfrage; sie hält Diffs bei der Sache." } ] }
misconceptions:
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
---
## Learning goal

Judge code you wrote yourself against criteria you can state - allocation, error contract, and what the design would make hard next.

## Two tools that review for you first

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
```

`cargo fmt` settles formatting so that diffs are about behaviour and nothing else. `--check` reports without rewriting; `cargo fmt` rewrites.

`cargo clippy` is a second compiler pass with several hundred lints for things that compile but are worse than the alternative: a manual loop where a method exists, a `&String` parameter where `&str` would do, a clone that achieves nothing. `-D warnings` turns every lint into an error, which is what a serious project does in CI.

Both must be clean, including the exercise files you wrote earlier in the course. Where the workspace disagrees with clippy on purpose it says so: a handful of functions carry `#[allow(clippy::…)]` with a comment naming the reason - m2-01 keeps the book's `&String` parameter, m3-03 keeps Listing 6-5's spelled-out `match`. That is the honest way to disagree with a lint. An `#[allow]` with no comment is how a codebase stops meaning anything.

## Reviewing your own code

Three qüstions, and the task asks you to answer all three about *your* implementation.

**Where does it allocate more than it needs?** Read your own file and find the places where something is built and then thrown away, or held whole when only a part is needed. Not all of them are worth fixing - name one, say what you would do, and say whether you would actually do it.

**What is the error contract?** State it as a contract, not a preference. A missing file is the caller's business, so it is an `Err`. A file with no words is a condition the caller may reasonably want to know about, so it is a second variant rather than an empty report. Nothing in the library panics, because nothing in it is a bug the program can detect. The binary turns errors into exit code 1 and a message on stderr, which is what a shell expects.

**What would the design make hard?** The interesting one. Go through your four functions and ask of each whether it could work on one chunk of the file at a time. Seeing which parts of your own design are the obstacle - and which were incidentally fine - is the skill this step is for.

## Where to go next

The pack indexes chapters 4, 5, 6, 8, 9 and 10 of *The Rust Programming Language*, and asking the tutor stays grounded in those. The obvious next chapters are 13 (closures and iterators), which would rewrite half of `report` into three lines, and 15 (smart pointers). The tutor will tell you when a question falls outside what it can ground, rather than güssing - and that is worth trusting.

## Your task

Make both tools clean, then write the review. It is graded against a rubric, so be specific about your own code rather than general about Rust.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** cargo's progress lines and a final `Finished` line.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
