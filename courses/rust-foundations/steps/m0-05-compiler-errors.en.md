---
id: m0-05-compiler-errors
title: "Read a compiler error and repair the file"
bloom: analyze
objectives: [ "rust-tooling-diagnostics" ]
requires: [ "m0-04-predict-output" ]
estimatedMinutes: 20
scaffold: independent
links:
  - { step: "m1-01-scope-and-move" }
  - { file: "repair/m0_05_type_mismatch.rs" }
  - { file: "README.md" }
  - { url: "https://doc.rust-lang.org/error_codes/E0308.html", title: "rustc error index: E0308" }
sources: [ "repair/m0_05_type_mismatch.rs", "README.md" ]
tasks:
  - id: repair
    title: "The repaired file compiles and prints the sentence"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 -o target/check/m0_05 repair/m0_05_type_mismatch.rs && target/check/m0_05", expectExitCode: 0, expectStdout: "Ada is 36 years old and 1 metre 62 tall\\.", timeoutMs: 120000 }
  - id: method
    title: "You can describe how you read the diagnostic"
    check: { type: "question", prompt: { en: "rustc reported three E0308 errors, but you did not need three separate fixes. Explain which parts of one diagnostic - the code, the underlined span, the expected/found pair, the help line - told you what to change, and why fixing one line removed more than one error.", de: "rustc meldete drei E0308-Fehler, du brauchtest aber nicht drei getrennte Korrekturen. Erkläre, welche Teile einer Diagnose - Fehlercode, unterstrichene Stelle, expected/found-Paar, help-Zeile - dir sagten, was zu ändern ist, und warum eine korrigierte Zeile mehr als einen Fehler beseitigt hat." }, rubric: "Explains that the caret marks the expression whose type is wrong and expected/found names both sides, and that declaring name as &str (rather than String) fixed both the literal-assignment error and the argument-type error at the call site, because the second error was a consequence of the first declaration. Mentioning that the help line proposes a concrete edit is a plus; blindly following help without reading expected/found should not earn full credit.", bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:repair:failed", question: { en: "How many errors does rustc report now, and is it fewer than before? Which line does the first caret point at?", de: "Wie viele Fehler meldet rustc jetzt, und sind es weniger als zuvor? Auf welche Zeile zeigt das erste Caret?" }, hints: [ { en: "Work top down and rebuild after every single change: later errors are often consequences of the first one.", de: "Arbeite von oben nach unten und baue nach jeder einzelnen Änderung neu: spätere Fehler sind oft Folgen des ersten." }, { en: "A literal in double quotes has type `&str`. Either the annotation or the value has to give way - and the function's parameter says which.", de: "Ein Literal in Anführungszeichen hat den Typ `&str`. Entweder die Annotation oder der Wert muss weichen - und der Parameter der Funktion sagt, welcher." }, { en: "Do not change `describe`; it is correct. The three errors are all in `main`, and two of them are the same mistake.", de: "Ändere `describe` nicht; sie ist korrekt. Die drei Fehler stehen alle in `main`, und zwei davon sind derselbe Fehler." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Read the `expected ... found ...` line aloud. Which of the two is the annotation you wrote, and which is what the value actually is?", de: "Lies die Zeile `expected ... found ...` laut. Welches von beidem ist die Annotation, die du geschrieben hast, und welches der tatsächliche Wert?" }, hints: [ { en: "`expected` is what the surrounding context demands; `found` is what your expression produced.", de: "`expected` ist, was der Kontext verlangt; `found` ist, was dein Ausdruck geliefert hat." }, { en: "The dashes under a second span mark where the expectation came from - usually the type annotation or the parameter list.", de: "Die Striche unter einer zweiten Stelle markieren, woher die Erwartung stammt - meist die Typannotation oder die Parameterliste." }, { en: "rustc's `help:` line proposes a concrete edit; check it against the signature before you accept it.", de: "Die `help:`-Zeile von rustc schlägt eine konkrete Änderung vor; prüfe sie an der Signatur, bevor du sie übernimmst." } ] }
  - { pattern: "error\\[E0425\\]", question: { en: "A name in scope disappeared. Did you rename or delete a variable the rest of the function still uses?", de: "Ein Name im Gültigkeitsbereich ist verschwunden. Hast du eine Variable umbenannt oder gelöscht, die der Rest der Funktion noch nutzt?" }, hints: [ { en: "The task says to keep every variable; deleting one trades an E0308 for an E0425.", de: "Die Aufgabe verlangt, jede Variable zu behalten; eine zu löschen tauscht ein E0308 gegen ein E0425." }, { en: "`git diff repair/m0_05_type_mismatch.rs` shows exactly what you changed.", de: "`git diff repair/m0_05_type_mismatch.rs` zeigt genau, was du geändert hast." }, { en: "Restore the original with `git checkout -- repair/m0_05_type_mismatch.rs` and start again, changing only the types.", de: "Stelle das Original mit `git checkout -- repair/m0_05_type_mismatch.rs` wieder her und beginne neu, indem du nur die Typen änderst." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
---
## Learning goal

Treat a rustc diagnostic as a structured report you can act on, not a wall of text - and repair a file that does not compile without changing anything the compiler did not complain about.

## What a rust diagnostic contains

Every error has four parts, and each answers a different question:

```text
error[E0308]: mismatched types
 --> repair/m0_05_type_mismatch.rs:24:24
   |
24 |     let name: String = "Ada";
   |               ------   ^^^^^ expected `String`, found `&str`
   |               |
   |               expected due to this
   |
help: try using a conversion method
   |
24 |     let name: String = "Ada".to_string();
```

- **`error[E0308]`** is a stable code. `rustc --explain E0308` prints a page about it, and the online error index has the same text.
- **The location** `file:line:column` is where the compiler gave up, which is not always where you made the mistake.
- **The spans.** The carets `^^^^^` mark the offending expression; a second span with dashes, labelled `expected due to this`, marks *why* the compiler expected what it expected. Those two together are the whole diagnosis: something over here forces a type, something over there produces a different one.
- **`help:`** proposes an edit. It is often right and occasionally solves the wrong problem - it can only see the local expression, not your intent.

## The file

`repair/m0_05_type_mismatch.rs` is not part of the cargo package; it is a standalone program that you compile directly. In its current state it produces three E0308 errors. Its `describe` function is correct and must not be touched; all three errors are in `main`.

Compile and run it in one go - exactly what the check does:

```bash
mkdir -p target/check
rustc --edition 2024 -o target/check/m0_05 repair/m0_05_type_mismatch.rs
target/check/m0_05
```

It must print, exactly:

```text
Ada is 36 years old and 1 metre 62 tall.
```

## How to work

Fix **one** error, then recompile. Errors cascade: a wrong declaration on line 24 produces a second complaint at the call site on line 28, and repairing the declaration removes both. Chasing all three at once usually produces a file with three unrelated changes, two of which were unnecessary.

Two constraints keep this honest. Keep every variable - deleting one trades a type error for `E0425: cannot find value`. And keep the printed sentence exactly as above; the check compares it.

## Your task

Repair the file so it compiles and prints the sentence, then explain which parts of the diagnostic you actually used. From here on the errors get more interesting: the next module is about ownership, and its errors are about *when* a value stops being yours.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
mkdir -p target/check && rustc --edition 2024 -o target/check/m0_05 repair/m0_05_type_mismatch.rs && target/check/m0_05
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** the program's output, containing `Ada is 36 years old and 1 metre 62 tall\.`.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
