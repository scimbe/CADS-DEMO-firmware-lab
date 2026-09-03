---
id: m0-02-first-test
title: "Read a test, then make it pass"
bloom: apply
objectives: [ "rust-tooling-cargo" ]
requires: [ "m0-01-welcome" ]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: "m0-03-predict-output" }
  - { file: "src/m0/m0_02_first_test.rs" }
  - { file: "tests/m0-02-first-test.rs" }
  - { url: "https://doc.rust-lang.org/book/ch11-01-writing-tests.html", title: "The Book, 11.1: How to Write Tests" }
sources: [ "src/m0/m0_02_first_test.rs", "tests/m0-02-first-test.rs", "README.md" ]
tasks:
  - id: greet
    title: "greet() returns the greeting"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m0-02-first-test", expectPass: [ "m0_02_first_test::adds_two_numbers", "m0_02_first_test::greets_by_name", "m0_02_first_test::greets_any_name" ], minPass: 3, timeoutMs: 180000 }
  - id: read-the-test
    title: "You can say what the test demands"
    check: { type: "question", prompt: { en: "The test greets_any_name asserts greet(\"\") == \"Hello, !\". What does that single assertion tell you about how greet must be written, and what would break if you had special-cased the empty name?", de: "Der Test greets_any_name verlangt greet(\"\") == \"Hello, !\". Was sagt dir diese eine Zusicherung darüber, wie greet geschrieben sein muss, und was ginge kaputt, wenn du den leeren Namen gesondert behandelt hättest?" }, rubric: "States that greet must interpolate the name unconditionally - format!(\"Hello, {name}!\") - with no branch on emptiness, and that a special case for \"\" would return something other than \"Hello, !\" and fail that assertion. Credit for noticing the test pins the exact punctuation and spacing.", bloom: "understand", minChars: 40 }
socratic:
  - { trigger: "task:greet:failed", question: { en: "The test says `not yet implemented`. Which file and line does the panic message point at, and is that the file you edited?", de: "Der Test meldet `not yet implemented`. Auf welche Datei und Zeile zeigt die Panic-Meldung, und ist das die Datei, die du bearbeitet hast?" }, hints: [ { en: "A `todo!()` panic prints the exact source location; open that file at that line and replace the macro with real code.", de: "Eine `todo!()`-Panic gibt die genaue Quellposition aus; öffne diese Datei an dieser Zeile und ersetze das Makro durch echten Code." }, { en: "The last expression of a function body, written without a semicolon, is its return value - `format!(\"…\")` on its own line, no `return` needed.", de: "Der letzte Ausdruck eines Funktionsrumpfs ohne Semikolon ist der Rückgabewert - `format!(\"…\")` allein in der Zeile, ohne `return`." }, { en: "`format!` builds a String from a template; a name in braces is substituted: compare the pattern with the `println!` in the module documentation.", de: "`format!` baut einen String aus einer Vorlage; ein Name in geschweiften Klammern wird eingesetzt: vergleiche das Muster mit dem `println!` in der Moduldokumentation." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "The compiler says the types do not match. Which type does the signature promise, and which type does your expression actually produce?", de: "Der Compiler sagt, die Typen passen nicht. Welchen Typ verspricht die Signatur, und welchen Typ liefert dein Ausdruck tatsächlich?" }, hints: [ { en: "Read the two lines after `expected`/`found`: they name both types.", de: "Lies die beiden Zeilen nach `expected`/`found`: sie nennen beide Typen." }, { en: "A literal in quotes is a `&str`; the signature promises an owned `String`.", de: "Ein Literal in Anführungszeichen ist ein `&str`; die Signatur verspricht ein besitzendes `String`." }, { en: "`format!` already returns a `String`; `\"Hello, \" + name` does not.", de: "`format!` liefert bereits ein `String`; `\"Hello, \" + name` nicht." } ] }
  - { pattern: "not yet implemented", question: { en: "A `todo!()` is still in the path the test takes. Which function did the test reach that you have not written yet?", de: "Ein `todo!()` liegt noch auf dem Weg, den der Test nimmt. Welche Funktion hat der Test erreicht, die du noch nicht geschrieben hast?" }, hints: [ { en: "The panic line names the file and line of the remaining `todo!()`.", de: "Die Panic-Zeile nennt Datei und Zeile des verbliebenen `todo!()`." }, { en: "Only `greet` is yours in this step; `add` is already complete and shows the shape.", de: "In diesem Step gehört nur `greet` dir; `add` ist fertig und zeigt die Form." }, { en: "Delete the whole `todo!(...)` call, including its message, and put the expression in its place.", de: "Lösche den gesamten `todo!(...)`-Aufruf samt Meldung und setze den Ausdruck an seine Stelle." } ] }
---
## Learning goal

Read a Rust test as a specification, then write the one function that satisfies it - and see the failure message change from `not yet implemented` to `ok`.

## The test is the specification

Open `tests/m0-02-first-test.rs`. It is short, and every line is a demand:

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

`src/m0/m0_02_first_test.rs` holds two functions. The first is complete and is there to be copied from:

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

```bash
cargo test --test m0-02-first-test
```

Before you change anything, two of the three tests fail like this:

```text
thread 'm0_02_first_test::greets_by_name' panicked at src/m0/m0_02_first_test.rs:14:5:
not yet implemented: build the greeting with format!
```

That message is worth reading twice: it names the **file and line of the `todo!()`**, not the test. That is where you work. Replace the macro call with an expression of type `String` and run the command again; the summary line becomes `test result: ok. 3 passed`.

## Your task

Implement `greet` so all three tests pass, then answer what the empty-name assertion tells you about the implementation. The next step turns the tables: you predict the output before running the program.
