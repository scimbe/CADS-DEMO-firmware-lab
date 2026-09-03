---
id: m5-01-panic-vs-result
title: "panic! is for bugs"
bloom: understand
objectives: [ "rust-ch09-01-unrecoverable-errors-with-panic" ]
requires: [ "m4-04-collections-report" ]
estimatedMinutes: 20
scaffold: worked
recallFrom: [ "m4-01-vectors" ]
links:
  - { step: "m5-02-result" }
  - { file: "src/m5/m5_01_panic.rs" }
  - { file: "examples/m5_unwrap_panic.rs" }
  - { url: "https://doc.rust-lang.org/book/ch09-01-unrecoverable-errors-with-panic.html", title: "The Book, 9.1: Unrecoverable Errors with panic!" }
sources: [ "src/m5/m5_01_panic.rs", "tests/m5-01-panic-vs-result.rs", "examples/m5_unwrap_panic.rs" ]
tasks:
  - id: guess
    title: "Predict which line ends the program"
    check: { type: "predict", prompt: { en: "examples/m5_unwrap_panic.rs indexes a slice, calls get with an out-of-range index, and parses two strings with expect. Which line ends the program, what does the panic message say, and what is the process exit code?", de: "examples/m5_unwrap_panic.rs indiziert einen Slice, ruft get mit einem Index außerhalb des Bereichs auf und parst zwei Zeichenketten mit expect. Welche Zeile beendet das Programm, was sagt die Panic-Meldung, und wie lautet der Exit-Code des Prozesses?" }, then: { type: "command", command: "cargo run --quiet --example m5_unwrap_panic", seedMustFail: false, expectExitCode: 101, expectStderr: "not a valid port: ParseIntError \\{ kind: InvalidDigit \\}", timeoutMs: 120000 }, rubric: "Predicts that v.get(99) prints None without panicking, that the \"8080\" parse succeeds, and that the \"http\" parse is the line that panics, with the expect message followed by the Debug form of the error. Exit code 101 is the detail most predictions miss and is worth stating explicitly. Predicting a panic at v[1] or at get(99) is the wrong model to name.", bloom: "evaluate" }
  - id: panics
    title: "The four functions panic where they should"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m5-01-panic-vs-result", expectPass: [ "m5_01_panic_vs_result::element_at_returns_the_element", "m5_01_panic_vs_result::element_at_opt_never_panics", "m5_01_panic_vs_result::parse_port_accepts_a_number", "m5_01_panic_vs_result::average_of_a_non_empty_slice" ], minPass: 4, timeoutMs: 180000 }
  - id: all-eight
    title: "All eight tests pass, panics included"
    check: { type: "command", command: "cargo test --test m5-01-panic-vs-result", expectExitCode: 0, expectStdout: "test result: ok\\. 8 passed; 0 failed", timeoutMs: 180000 }
socratic:
  - { trigger: "task:panics:failed", question: { en: "Is a should_panic test failing because nothing panicked, or because the message did not contain the expected text?", de: "Scheitert ein should_panic-Test, weil nichts abgestürzt ist, oder weil die Meldung den erwarteten Text nicht enthielt?" }, hints: [ { en: "`#[should_panic(expected = \"...\")]` checks that the panic message *contains* that substring; the wording has to match.", de: "`#[should_panic(expected = \"...\")]` prüft, dass die Panic-Meldung diesen Teilstring *enthält*; der Wortlaut muss passen." }, { en: "`element_at` must build its message with the index and the length: `panic!(\"index {i} out of range (len {})\", v.len())`.", de: "`element_at` muss seine Meldung aus Index und Länge bauen: `panic!(\"index {i} out of range (len {})\", v.len())`." }, { en: "`parse_port_or_panic(\"70000\")` must panic too: 70000 does not fit in a u16, so the parse fails just as \"http\" does.", de: "`parse_port_or_panic(\"70000\")` muss ebenfalls abstürzen: 70000 passt nicht in ein u16, das Parsen scheitert also wie bei \"http\"." } ] }
misconceptions:
  - { pattern: "index out of bounds: the len is \\d+ but the index is \\d+", question: { en: "The default index panic fired instead of yours. Did you check the range before indexing, or index first and check afterwards?", de: "Die Standard-Panic der Indizierung hat ausgelöst statt deiner. Hast du den Bereich vor dem Indizieren geprüft oder erst indiziert und dann geprüft?" }, hints: [ { en: "The guard has to come first: compare `i` with `v.len()` before `v[i]` is evaluated.", de: "Die Absicherung muss zuerst kommen: vergleiche `i` mit `v.len()`, bevor `v[i]` ausgewertet wird." }, { en: "The test's expected substring is your message, not the standard library's.", de: "Der erwartete Teilstring des Tests ist deine Meldung, nicht die der Standardbibliothek." }, { en: "Your message must name the index and the length; the wording is fixed by the test.", de: "Deine Meldung muss Index und Länge nennen; den Wortlaut gibt der Test vor." } ] }
  - { pattern: "called `Option::unwrap\\(\\)` on a `None` value|called `Result::unwrap\\(\\)` on an `Err` value", question: { en: "An unwrap met the case it does not handle. Was that case genuinely impossible here, or did you assume it away?", de: "Ein unwrap ist auf den Fall getroffen, den es nicht behandelt. War dieser Fall hier wirklich unmöglich, oder hast du ihn wegangenommen?" }, hints: [ { en: "`expect(\"...\")` replaces the message with one that says what you assumed, which turns a mystery into a report.", de: "`expect(\"...\")` ersetzt die Meldung durch eine, die deine Annahme benennt, und macht aus einem Rätsel einen Bericht." }, { en: "If the case can actually occur at runtime, the answer is a `Result` and not an unwrap - that is the next step.", de: "Kann der Fall zur Laufzeit tatsächlich auftreten, lautet die Antwort `Result` und nicht unwrap - das ist der nächste Step." }, { en: "In this step only `parse_port_or_panic` is meant to panic; the other lookups return an Option.", de: "In diesem Step soll nur `parse_port_or_panic` abstürzen; die anderen Zugriffe liefern ein Option." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Decide whether a failure is a bug in your program or a condition your caller should handle, and write the panic that says so clearly.

## What a panic does

`panic!` prints a message with the source location, unwinds the stack running every `drop`, and exits the process with code **101**. It is not an exception: nothing catches it in ordinary code, and there is no `try`.

Panics come from three places, and it is worth being able to tell them apart:

```rust
panic!("index {i} out of range (len {})", v.len());   // yours, explicit
v[99]                                                  // the standard library's
"http".parse::<u16>().expect("not a valid port")       // yours, via expect
```

## unwrap and expect

`unwrap()` on a `None` or an `Err` panics with a generic message. `expect("…")` panics with yours, followed by the `Debug` form of the error:

```text
thread 'main' panicked at examples/m5_unwrap_panic.rs:12:35:
not a valid port: ParseIntError { kind: InvalidDigit }
```

Always prefer `expect`. The difference between "called `Result::unwrap()` on an `Err` value" and "not a valid port" is the difference between a mystery at 3 a.m. and a report. Chapter 9's advice is that the message should say *why you believed the failure was impossible*, not merely what failed.

## When a panic is right

Panic when continuing would mean the program is already wrong:

- a broken invariant - `average` of an empty slice has no answer, and returning `0` would hide the caller's mistake;
- an index that is out of range because a calculation elsewhere is wrong;
- a hard-coded configuration that does not parse, as in `parse_port_or_panic`, where a bad value is a typo in the source and not a user's input.

Return a `Result` when failure is expected: a missing file, malformed input, a network that is down. Those are conditions, not bugs, and the caller usually has something sensible to do about them.

Notice how this step pairs the functions. `element_at` panics; `element_at_opt` does the same lookup and returns `Option`. Both are correct - they are different contracts, and a library normally offers both.

## Testing a panic

```rust
#[test]
#[should_panic(expected = "index 5 out of range (len 3)")]
fn element_at_panics_with_a_useful_message() {
    element_at(&[1, 2, 3], 5);
}
```

The test passes only if the function panics **and** the message contains that substring. That makes the message part of the contract, which is the right place for it.

One detail worth knowing: cargo lists such a test as `test … - should panic ... ok`, with the marker between the name and the result. This step therefore carries a second check that simply requires `test result: ok. 8 passed; 0 failed`, so all four panic tests are covered whatever a test-list parser makes of that marker.

## Your task

Predict the example, then implement the four functions so each panics exactly where and how the tests demand. The next step returns errors instead of ending the program.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo run --quiet --example m5_unwrap_panic
cargo test --test m5-01-panic-vs-result
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** a compiler diagnostic and nothing else - this file is *meant* not to compile, so the error is the expected result, not your mistake.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
