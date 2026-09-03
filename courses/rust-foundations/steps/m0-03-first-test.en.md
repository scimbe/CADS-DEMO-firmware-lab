---
id: m0-03-first-test
title: "Read a test, then make it pass"
bloom: apply
objectives: [ "rust-tooling-cargo" ]
requires: [ "m0-02-workbench" ]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: "m0-04-predict-output" }
  - { file: "src/m0/m0_03_first_test.rs" }
  - { file: "tests/m0-03-first-test.rs" }
  - { url: "https://doc.rust-lang.org/book/ch11-01-writing-tests.html", title: "The Book, 11.1: How to Write Tests" }
sources: [ "src/m0/m0_03_first_test.rs", "tests/m0-03-first-test.rs", "README.md" ]
tasks:
  - id: greet
    title: "greet() returns the greeting"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m0-03-first-test", expectPass: [ "m0_03_first_test::adds_two_numbers", "m0_03_first_test::greets_by_name", "m0_03_first_test::greets_any_name" ], minPass: 3, timeoutMs: 180000 }
  - id: read-the-test
    title: "You can say what the test demands"
    check: { type: "question", prompt: { en: "The test greets_any_name asserts greet(\"\") == \"Hello, !\". What does that single assertion tell you about how greet must be written, and what would break if you had special-cased the empty name?", de: "Der Test greets_any_name verlangt greet(\"\") == \"Hello, !\". Was sagt dir diese eine Zusicherung darüber, wie greet geschrieben sein muss, und was ginge kaputt, wenn du den leeren Namen gesondert behandelt hättest?" }, rubric: "States that greet must interpolate the name unconditionally - format!(\"Hello, {name}!\") - with no branch on emptiness, and that a special case for \"\" would return something other than \"Hello, !\" and fail that assertion. Credit for noticing the test pins the exact punctuation and spacing.", bloom: "understand", minChars: 40 }
socratic:
  - { trigger: "task:greet:failed", question: { en: "The test says `not yet implemented`. Which file and line does the panic message point at, and is that the file you edited?", de: "Der Test meldet `not yet implemented`. Auf welche Datei und Zeile zeigt die Panic-Meldung, und ist das die Datei, die du bearbeitet hast?" }, hints: [ { en: "A `todo!()` panic prints the exact source location; open that file at that line and replace the macro with real code.", de: "Eine `todo!()`-Panic gibt die genaue Quellposition aus; öffne diese Datei an dieser Zeile und ersetze das Makro durch echten Code." }, { en: "The last expression of a function body, written without a semicolon, is its return value - `format!(\"…\")` on its own line, no `return` needed.", de: "Der letzte Ausdruck eines Funktionsrumpfs ohne Semikolon ist der Rückgabewert - `format!(\"…\")` allein in der Zeile, ohne `return`." }, { en: "`format!` builds a String from a template; a name in braces is substituted: compare the pattern with the `println!` in the module documentation.", de: "`format!` baut einen String aus einer Vorlage; ein Name in geschweiften Klammern wird eingesetzt: vergleiche das Muster mit dem `println!` in der Moduldokumentation." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "The compiler says the types do not match. Which type does the signature promise, and which type does your expression actually produce?", de: "Der Compiler sagt, die Typen passen nicht. Welchen Typ verspricht die Signatur, und welchen Typ liefert dein Ausdruck tatsächlich?" }, hints: [ { en: "Read the two lines after `expected`/`found`: they name both types.", de: "Lies die beiden Zeilen nach `expected`/`found`: sie nennen beide Typen." }, { en: "A literal in quotes is a `&str`; the signature promises an owned `String`.", de: "Ein Literal in Anführungszeichen ist ein `&str`; die Signatur verspricht ein besitzendes `String`." }, { en: "`format!` already returns a `String`; `\"Hello, \" + name` does not.", de: "`format!` liefert bereits ein `String`; `\"Hello, \" + name` nicht." } ] }
  - { pattern: "not yet implemented", question: { en: "A `todo!()` is still in the path the test takes. Which function did the test reach that you have not written yet?", de: "Ein `todo!()` liegt noch auf dem Weg, den der Test nimmt. Welche Funktion hat der Test erreicht, die du noch nicht geschrieben hast?" }, hints: [ { en: "The panic line names the file and line of the remaining `todo!()`.", de: "Die Panic-Zeile nennt Datei und Zeile des verbliebenen `todo!()`." }, { en: "Only `greet` is yours in this step; `add` is already complete and shows the shape.", de: "In diesem Step gehört nur `greet` dir; `add` ist fertig und zeigt die Form." }, { en: "Delete the whole `todo!(...)` call, including its message, and put the expression in its place.", de: "Lösche den gesamten `todo!(...)`-Aufruf samt Meldung und setze den Ausdruck an seine Stelle." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Read a Rust test as a specification, then write the one function that satisfies it - and see the failure message change from `not yet implemented` to `ok`.

## The test is the specification

Open `tests/m0-03-first-test.rs`. It is short, and every line is a demand:

```rust
#[test]
fn greets_by_name() {
    assert_eq!(greet("Ada"), "Hello, Ada!");
}

#[test]
fn greets_any_name() {
    assert_eq!(greet("Rust"), "Hello, Rust!");
    assert_eq!(greet(""), "Hello, !");
}
```

`#[test]` marks a function the test runner should call. `assert_eq!` compares two values and, on a mismatch, prints both - `left` is what your code returned, `right` is what was expected. Nothing here is negotiable: the comma, the space and the exclamation mark are all part of the contract, and so is the empty-name case.

## The worked example next to yours

`src/m0/m0_03_first_test.rs` holds two functions. The first is complete and is there to be copied from:

```rust
/// Returns the sum of `a` and `b`.
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

Four things to take from it. `pub` makes the function visible outside its module, which the test needs. Every parameter carries a type; Rust never infers those in a signature. The return type comes after `->`. And the body's last expression, written **without a semicolon**, is the return value - `a + b`, not `return a + b;`. Adding that semicolon turns the expression into a statement, the function then returns `()`, and you get error E0308.

The second function is yours:

```rust
/// Returns `"Hello, <name>!"` - for `greet("Ada")` that is `"Hello, Ada!"`.
pub fn greet(name: &str) -> String {
    todo!("build the greeting with format!")
}
```

`&str` is a borrowed string slice - the type of a literal like `"Ada"`. `String` is an owned, growable string. Building one from a template is what `format!` does: it takes the same template syntax as `println!` but returns the `String` instead of printing it.

## Run it, watch it fail, fix it

![The editor shows src/m0/m0_03_first_test.rs with Rust syntax highlighting;
the terminal below shows the failing test run, and the panic message names
that same file at line 14. The status bar reads rust-analyzer and
Rust.](editor-and-test-run.png)

```bash
cargo test --test m0-03-first-test
```

Before you change anything, two of the three tests fail like this:

```text
thread 'm0_03_first_test::greets_by_name' panicked at src/m0/m0_03_first_test.rs:14:5:
not yet implemented: build the greeting with format!
```

That message is worth reading twice: it names the **file and line of the `todo!()`**, not the test. That is where you work. Replace the macro call with an expression of type `String` and run the command again; the summary line becomes `test result: ok. 3 passed`.

## Your task

Implement `greet` so all three tests pass, then answer what the empty-name assertion tells you about the implementation. The next step turns the tables: you predict the output before running the program.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo test --test m0-03-first-test
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 3 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
