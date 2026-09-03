---
id: m0-04-predict-output
title: "Predict the output, then run it"
bloom: understand
objectives: [ "rust-tooling-cargo" ]
requires: [ "m0-03-first-test" ]
estimatedMinutes: 20
scaffold: faded
links:
  - { step: "m0-05-compiler-errors" }
  - { file: "examples/m0_shadowing.rs" }
  - { file: "src/m0/m0_04_predict.rs" }
  - { url: "https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html", title: "The Book, 3.1: Variables and Mutability" }
sources: [ "examples/m0_shadowing.rs", "src/m0/m0_04_predict.rs", "tests/m0-04-predict-output.rs" ]
tasks:
  - id: guess
    title: "Predict what m0_shadowing prints"
    check: { type: "predict", prompt: { en: "examples/m0_shadowing.rs shadows `x` three times and shadows `spaces` with a value of a different type. Write down, line by line, what the program prints - all four lines, with the exact numbers.", de: "examples/m0_shadowing.rs überschattet `x` dreimal und überschattet `spaces` mit einem Wert anderen Typs. Schreibe Zeile für Zeile auf, was das Programm ausgibt - alle vier Zeilen mit den genauen Zahlen." }, then: { type: "command", command: "cargo run --quiet --example m0_shadowing", seedMustFail: false, expectExitCode: 0, expectStdout: "inner scope is: 12", timeoutMs: 120000 }, rubric: "The prediction gives 12 for the inner scope and 6 for the outer x, 3 for spaces, and 3 / 1 for the integer division and remainder. A prediction of 6 for the inner scope (missing the second shadowing) or an error for `spaces` (expecting a type conflict) is a wrong prediction, which is a useful result, not a failure.", bloom: "evaluate" }
  - id: convert
    title: "The temperature conversions pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m0-04-predict-output", expectPass: [ "m0_04_predict_output::boiling_point", "m0_04_predict_output::freezing_point", "m0_04_predict_output::minus_forty_is_the_same_in_both" ], minPass: 3, timeoutMs: 180000 }
socratic:
  - { trigger: "task:convert:failed", question: { en: "One of the three assertions fails. Which one, and what does `left` differ from `right` by - a rounding step, or a factor?", de: "Eine der drei Zusicherungen scheitert. Welche, und worin unterscheidet sich `left` von `right` - um eine Rundung oder um einen Faktor?" }, hints: [ { en: "`9 / 5` between two integers is 1, not 1.8: write the constants as `9.0 / 5.0` so the division happens in f64.", de: "`9 / 5` zwischen zwei Ganzzahlen ist 1, nicht 1,8: schreibe die Konstanten als `9.0 / 5.0`, damit in f64 geteilt wird." }, { en: "Check the order of operations: `c * 9.0 / 5.0 + 32.0` is not the same as `c * (9.0 / (5.0 + 32.0))`.", de: "Prüfe die Reihenfolge: `c * 9.0 / 5.0 + 32.0` ist nicht dasselbe wie `c * (9.0 / (5.0 + 32.0))`." }, { en: "The -40 test passes only when both directions are exact inverses; if it alone fails, one of the two formulas is transposed.", de: "Der -40-Test besteht nur, wenn beide Richtungen exakt invers sind; scheitert nur er, ist eine der beiden Formeln vertauscht." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Which of your two numbers is an integer where the signature promised an f64?", de: "Welche deiner beiden Zahlen ist eine Ganzzahl, wo die Signatur ein f64 versprochen hat?" }, hints: [ { en: "`32` is an integer literal, `32.0` is a float literal; Rust does not convert between them for you.", de: "`32` ist ein Ganzzahl-, `32.0` ein Gleitkommaliteral; Rust rechnet sie nicht ineinander um." }, { en: "The `expected`/`found` lines of the diagnostic name both types explicitly.", de: "Die Zeilen `expected`/`found` der Diagnose nennen beide Typen ausdrücklich." }, { en: "Write every constant in these two formulas with a decimal point and the mismatch disappears.", de: "Schreibe jede Konstante dieser beiden Formeln mit Dezimalpunkt, dann verschwindet der Konflikt." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`pwd` prints the current folder; it has to be the rust-foundations workspace, the one holding Cargo.toml.", de: "`pwd` gibt den aktuellen Ordner aus; er muss der rust-foundations-Workspace sein, in dem die Cargo.toml liegt." }, { en: "A terminal opened with Terminal → New Terminal starts in the workspace folder; one you navigated away from does not.", de: "Ein über Terminal → Neues Terminal geöffnetes Terminal startet im Workspace-Ordner; eines, aus dem du herausnavigiert bist, nicht." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Commit to a prediction before you run a program, so that when the output surprises you, you learn something instead of just reading it.

## Why predict first

Reading code and believing you understand it are the same experience from the inside. Writing the answer down first separates them: a prediction you got wrong is a precise map of what your model of the language gets wrong. This course asks for one prediction per module for that reason.

## The program

`examples/m0_shadowing.rs` is under `examples/`, a directory cargo compiles as standalone programs. Run one with `cargo run --example <name>` - here `cargo run --quiet --example m0_shadowing`. Do not run it yet.

```rust
let x = 5;
let x = x + 1;
{
    let x = x * 2;
    println!("The value of x in the inner scope is: {x}");
}
println!("The value of x is: {x}");
```

Three `let x` declarations, none of them `mut`. This is *shadowing*: `let` with a name that already exists creates a **new** variable that hides the old one for the rest of the scope. It is not assignment - the first `x` is still there, untouched, and reappears when the inner scope ends.

The second half is the part that catches people:

```rust
let spaces = "   ";
let spaces = spaces.len();
```

The first `spaces` is a `&str`, the second is a `usize`. Shadowing may change the type, because it really is a new variable. Writing `let mut spaces = "   ";` followed by `spaces = spaces.len();` would be error E0308 instead - mutation may not change a type.

The last two lines use `/` and `%` on two integers. Integer division truncates towards zero; there is no floating point anywhere in that expression.

## Write your prediction

Four printed lines. Give the exact numbers for all four before running anything. Then run the program and compare.

## The second half of this step

`src/m0/m0_04_predict.rs` has the book's temperature conversions as `todo!()` stubs, both on `f64`. The trap is the same integer/float split as above: `9 / 5` is `1`, so `c * 9 / 5 + 32` gives 132 for boiling water instead of 212. Write the constants with a decimal point.

```bash
cargo test --test m0-04-predict-output
```

Three tests, including `minus_forty_is_the_same_in_both` - the one temperature where both scales agree, and a cheap check that you did not transpose the two formulas.

## Your task

Predict the output of the example, then implement both conversions. The next step hands you a file that does not compile at all.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1** (more reliable in a browser than Ctrl+Shift+P), type `Terminal: Create New Terminal` and press Enter. The terminal opens in the panel at the bottom, already in the workspace folder. Then run:

```bash
cargo run --quiet --example m0_shadowing
cargo test --test m0-04-predict-output
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** the program's output, containing `inner scope is: 12`.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, the terminal is in the wrong folder - `cd` back to the workspace root.
