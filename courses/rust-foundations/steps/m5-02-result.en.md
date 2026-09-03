---
id: m5-02-result
title: "Result: failure in the return type"
bloom: apply
objectives: [ "rust-ch09-02-recoverable-errors-with-result" ]
requires: [ "m5-01-panic-vs-result" ]
estimatedMinutes: 20
scaffold: worked
recallFrom: [ "m3-04-if-let", "m3-02-enums" ]
links:
  - { step: "m5-03-question-mark" }
  - { file: "src/m5/m5_02_result.rs" }
  - { file: "tests/m5-02-result.rs" }
  - { url: "https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html", title: "The Book, 9.2: Recoverable Errors with Result" }
sources: [ "src/m5/m5_02_result.rs", "tests/m5-02-result.rs" ]
tasks:
  - id: result
    title: "The four Result functions pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m5-02-result", expectPass: [ "m5_02_result::parse_port_reports_the_input", "m5_02_result::checked_div_guards_zero", "m5_02_result::first_line_without_newline", "m5_02_result::sum_ports_stops_at_the_first_error" ], minPass: 4, timeoutMs: 180000 }
  - id: message
    title: "You can judge the error message"
    check: { type: "question", prompt: { en: "parse_port is specified to report \"'http' is not a valid port\" rather than passing on the parser's own \"invalid digit found in string\". Argue for that choice from the point of view of whoever reads the message, and name the cost of discarding the original error.", de: "parse_port soll \"'http' is not a valid port\" melden statt die eigene Meldung des Parsers \"invalid digit found in string\" durchzureichen. Begründe diese Entscheidung aus Sicht dessen, der die Meldung liest, und nenne den Preis dafür, den ursprünglichen Fehler zu verwerfen." }, rubric: "Argues that the message should name the offending input and the domain concept (a port), which the parser's generic message cannot, and that this is what lets a user fix their configuration. Names the cost honestly: the original error is thrown away, so the caller can no longer distinguish 'not a number' from 'out of range for u16', and cannot match on the error programmatically - which is what a custom error type in m5-04 restores.", bloom: "evaluate", minChars: 70 }
socratic:
  - { trigger: "task:result:failed", question: { en: "Which one fails? For `parse_port`, is the failing case the text input or the number that is too large - and does your message quote the input exactly?", de: "Welche scheitert? Ist bei `parse_port` der scheiternde Fall die Texteingabe oder die zu große Zahl - und zitiert deine Meldung die Eingabe genau?" }, hints: [ { en: "`s.parse::<u16>()` fails for both \"http\" and \"70000\", so one `map_err` covers both.", de: "`s.parse::<u16>()` scheitert sowohl bei \"http\" als auch bei \"70000\", ein `map_err` deckt also beides ab." }, { en: "The message has single quotes around the input: `format!(\"'{s}' is not a valid port\")`.", de: "Die Meldung setzt die Eingabe in einfache Anführungszeichen: `format!(\"'{s}' is not a valid port\")`." }, { en: "`text.lines().next()` gives the first line without its newline and `None` for the empty string.", de: "`text.lines().next()` liefert die erste Zeile ohne Zeilenumbruch und `None` für die leere Zeichenkette." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Is the mismatch a bare value where a Result was promised, or a Result where a bare value was expected?", de: "Ist der Konflikt ein blanker Wert, wo ein Result versprochen war, oder ein Result, wo ein blanker Wert erwartet wurde?" }, hints: [ { en: "A function returning `Result<u16, String>` must return `Ok(port)`, never a bare `port`.", de: "Eine Funktion mit Rückgabetyp `Result<u16, String>` muss `Ok(port)` liefern, nie ein blankes `port`." }, { en: "`Err` takes a `String` here, so `Err(\"…\")` with a literal is a `&str` and does not fit; use `String::from` or `format!`.", de: "`Err` nimmt hier einen `String`; `Err(\"…\")` mit einem Literal ist ein `&str` und passt nicht - nutze `String::from` oder `format!`." }, { en: "`sum_ports` returns `u32` while `parse_port` gives `u16`: convert with `u32::from(port)`.", de: "`sum_ports` liefert `u32`, `parse_port` aber `u16`: wandle mit `u32::from(port)` um." } ] }
  - { pattern: "error\\[E0599\\]: no method named `unwrap`|unused `Result` that must be used", question: { en: "A Result is being ignored or unwrapped where the function should pass it on. What is this function's contract on failure?", de: "Ein Result wird ignoriert oder ausgepackt, wo die Funktion es weiterreichen sollte. Wie lautet der Vertrag dieser Funktion im Fehlerfall?" }, hints: [ { en: "`sum_ports` must return the first error, not unwrap it - unwrapping would panic and break the contract.", de: "`sum_ports` muss den ersten Fehler zurückgeben, nicht auspacken - Auspacken stürzte ab und bräche den Vertrag." }, { en: "A `match` with an `Err(e) => return Err(e)` arm is the explicit form; the next step shortens it.", de: "Ein `match` mit einem Zweig `Err(e) => return Err(e)` ist die ausdrückliche Form; der nächste Step kürzt sie." }, { en: "`Result` is marked must_use, so ignoring one is a warning by design.", de: "`Result` ist als must_use markiert, es zu ignorieren ist also absichtlich eine Warnung." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`pwd` prints the current folder; it has to be the rust-foundations workspace, the one holding Cargo.toml.", de: "`pwd` gibt den aktuellen Ordner aus; er muss der rust-foundations-Workspace sein, in dem die Cargo.toml liegt." }, { en: "A terminal opened with Terminal → New Terminal starts in the workspace folder; one you navigated away from does not.", de: "Ein über Terminal → Neues Terminal geöffnetes Terminal startet im Workspace-Ordner; eines, aus dem du herausnavigiert bist, nicht." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Put failure into a function's return type so the caller cannot ignore it, and write an error message worth reading.

## The type

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

An ordinary enum, in scope everywhere. `T` is the success value, `E` the error. It is marked `#[must_use]`, so ignoring one is a warning: the compiler will not let a failure pass silently.

## Reading it

`match` is the explicit form and the one to start from:

```rust
match parse_port(entry) {
    Ok(port) => total += u32::from(port),
    Err(e) => return Err(e),
}
```

That `Err(e) => return Err(e)` arm is `sum_ports`'s whole error handling, and it appears in almost every function that calls a fallible one. The next step replaces it with a single character - but writing it out once is what makes that character readable afterwards.

## Turning one error into another

`s.parse::<u16>()` returns `Result<u16, ParseIntError>`. `parse_port` promises `Result<u16, String>`, so the error has to be converted:

```rust
s.parse::<u16>().map_err(|_| format!("'{s}' is not a valid port"))
```

`map_err` transforms the error and leaves `Ok` untouched. The closure ignores the original error here, which is a deliberate trade and the subject of the question task. The gain is a message that names the input and the domain concept, which "invalid digit found in string" cannot. The loss is real too: the caller can no longer tell "not a number" from "out of range", and cannot match on the error to decide what to do. Module m5-04 gets that back with an error type of its own.

Note that both `"http"` and `"70000"` fail the same parse - one is not a number, the other does not fit in a `u16` - and one `map_err` covers both.

## Signatures that carry a borrow

```rust
pub fn first_line(text: &str) -> Result<&str, String>
```

The success value borrows from the input; the error owns its message. That is a normal and useful shape, and lifetime elision handles it without annotation - M6 explains why.

## Your task

Implement the four functions, then argü for the error message the specification demands. The next step removes the `match` boilerplate.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1** (more reliable in a browser than Ctrl+Shift+P), type `Terminal: Create New Terminal` and press Enter. The terminal opens in the panel at the bottom, already in the workspace folder. Then run:

```bash
cargo test --test m5-02-result
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 4 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, the terminal is in the wrong folder - `cd` back to the workspace root.
