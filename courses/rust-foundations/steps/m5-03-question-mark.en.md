---
id: m5-03-question-mark
title: "The ? operator"
bloom: apply
objectives: [ "rust-ch09-02-recoverable-errors-with-result" ]
requires: [ "m5-02-result" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m5-02-result" ]
links:
  - { step: "m5-04-custom-error" }
  - { file: "src/m5/m5_03_question_mark.rs" }
  - { file: "tests/m5-03-question-mark.rs" }
  - { url: "https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html", title: "The Book, 9.2: A Shortcut for Propagating Errors: the ? Operator" }
sources: [ "src/m5/m5_03_question_mark.rs", "tests/m5-03-question-mark.rs", "src/m5/m5_02_result.rs" ]
tasks:
  - id: qmark
    title: "The four ? exercises pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m5-03-question-mark", expectPass: [ "m5_03_question_mark::double_parsed_doubles", "m5_03_question_mark::parse_all_keeps_order", "m5_03_question_mark::sum_lines_ignores_blank_lines", "m5_03_question_mark::parse_size_separates_the_two_failures" ], minPass: 4, timeoutMs: 180000 }
  - id: limits
    title: "You can say where ? stops helping"
    check: { type: "question", prompt: { en: "parse_size cannot use ? for either failure the way the other three do. Two sentences: the rule that decides when ? is available, and what each of the two failures lacks.", de: "parse_size kann ? für keinen der beiden Fehlschläge so nutzen wie die anderen drei. Zwei Sätze: die Regel, die entscheidet, wann ? verfügbar ist, und was jedem der beiden Fehlschläge fehlt." }, rubric: "States that ? converts the error via From into the function's error type, so it works whenever such a conversion exists - here every parse yields ParseIntError, matching the declared error type. The missing 'x' produces no error value at all (split_once returns an Option), so it must first be turned into one with ok_or, and the error type Option<ParseIntError> has no From impl from ParseIntError, which is why map_err(Some) is needed on the parses. Does not pass: answering that the two error types are simply different, without naming the From conversion as the rule, or blaming the missing x on a type mismatch rather than on there being no error value at all.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:limits:failed", question: { en: "For each of the two failures in parse_size, ask first whether an error value exists at all.", de: "Frage bei jedem der beiden Fehlschläge in parse_size zuerst, ob überhaupt ein Fehlerwert existiert." }, hints: [ { en: "`split_once` returns an Option. An Option's None carries no error, so there is nothing for ? to convert yet.", de: "`split_once` liefert ein Option. Das None eines Option trägt keinen Fehler, es gibt also noch nichts, was ? wandeln könnte." }, { en: "The parses do produce an error, so ask instead whether a conversion exists from that error into the type this function declares.", de: "Die Parse-Aufrufe erzeugen einen Fehler; frage also, ob eine Umwandlung von diesem Fehler in den Typ existiert, den diese Funktion deklariert." }, { en: "`?` inserts one call for you, and its name appears in the trait bound the compiler complains about when it is missing.", de: "`?` fügt einen Aufruf ein, und sein Name steht in der Trait-Schranke, die der Compiler beanstandet, wenn sie fehlt." } ] }
  - { trigger: "task:qmark:failed", question: { en: "Which one fails? For `sum_lines`, are blank lines skipped before the parse, and is surrounding whitespace trimmed?", de: "Welche scheitert? Werden in `sum_lines` Leerzeilen vor dem Parsen übersprungen, und wird umgebender Leerraum entfernt?" }, hints: [ { en: "`line.trim()` first, then `if line.is_empty() { continue; }`, then parse with `?`.", de: "Zuerst `line.trim()`, dann `if line.is_empty() { continue; }`, dann mit `?` parsen." }, { en: "`double_parsed` is one line: `Ok(s.parse::<i32>()? * 2)`.", de: "`double_parsed` ist eine Zeile: `Ok(s.parse::<i32>()? * 2)`." }, { en: "`parse_size` needs `s.split_once('x')`, then `ok_or(None)?` for the missing separator and `map_err(Some)?` for each number.", de: "`parse_size` braucht `s.split_once('x')`, dann `ok_or(None)?` für das fehlende Trennzeichen und `map_err(Some)?` für jede Zahl." } ] }
misconceptions:
  - { pattern: "the `\\?` operator can only be used in a function that returns `Result`", question: { en: "You used ? in a function that does not return a Result. Should the function's signature change, or should this call site handle the error itself?", de: "Du hast ? in einer Funktion benutzt, die kein Result liefert. Soll sich die Signatur ändern, oder soll diese Aufrufstelle den Fehler selbst behandeln?" }, hints: [ { en: "`?` returns early from the enclosing function, so that function has to be able to carry an error.", de: "`?` kehrt vorzeitig aus der umgebenden Funktion zurück, diese muss also einen Fehler tragen können." }, { en: "In a test or in main, handle the Result explicitly with `match`, `expect` or `unwrap_or`.", de: "In einem Test oder in main behandle das Result ausdrücklich mit `match`, `expect` oder `unwrap_or`." }, { en: "`?` also works in a function returning `Option`, where it propagates `None`.", de: "`?` funktioniert auch in einer Funktion mit Rückgabetyp `Option`, wo es `None` weiterreicht." } ] }
  - { pattern: "the trait bound `.*: From<.*>` is not satisfied|`\\?` couldn't convert the error", question: { en: "? tried to convert one error type into another and found no conversion. Which two types are they, and do you want a From impl or a map_err at this one call site?", de: "? wollte einen Fehlertyp in einen anderen wandeln und fand keine Umwandlung. Welche zwei Typen sind das, und willst du ein From-Impl oder ein map_err an dieser einen Aufrufstelle?" }, hints: [ { en: "The diagnostic names both types in the `From<...>` bound it could not satisfy.", de: "Die Diagnose nennt beide Typen in der `From<...>`-Schranke, die sie nicht erfüllen konnte." }, { en: "`map_err(...)` before the `?` converts locally and needs no trait implementation.", de: "`map_err(...)` vor dem `?` wandelt lokal und braucht keine Trait-Implementierung." }, { en: "A `From` impl is the better answer when the same conversion is needed in many places - that is the next step.", de: "Ein `From`-Impl ist die bessere Antwort, wenn dieselbe Umwandlung an vielen Stellen gebraucht wird - das ist der nächste Step." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Replace error-propagation boilerplate with `?`, and recognise the two situations in which it does not apply.

## What `?` expands to

```rust
let n = s.parse::<i32>()?;
```

is, near enough:

```rust
let n = match s.parse::<i32>() {
    Ok(v) => v,
    Err(e) => return Err(From::from(e)),
};
```

On `Ok` it unwraps and carries on. On `Err` it returns from the **enclosing function** immediately, converting the error with `From` on the way. That is the whole operator, and the two halves of the description are exactly the two ways it can fail to apply.

## Where it is available

`?` returns from the function it stands in, so that function must return `Result` (or `Option`, where it propagates `None`). Using it in a `main` or a test that returns `()` is:

```text
error[E0277]: the `?` operator can only be used in a function that returns `Result` or `Option`
```

The fix is either to change the signature - it is fine, and common, for `main` to return `Result<(), Box<dyn Error>>` - or to handle the error here with `match` or `expect`.

## The conversion is the interesting half

`From::from(e)` means `?` works whenever the error can convert into the function's error type. In `double_parsed`, `parse_all` and `sum_lines` the types are already identical - every failure is a `ParseIntError` and that is what the signature declares - so the conversion is the trivial one and `?` is free.

`parse_size` is the counter-example, and it is in this step on purpose:

```rust
pub fn parse_size(s: &str) -> Result<(u32, u32), Option<ParseIntError>>
```

Two failures of different kinds. A missing `x` produces **no error value at all** - `split_once` returns an `Option` - so there is nothing for `?` to convert until you make one with `ok_or(None)`. And the numbers do produce a `ParseIntError`, but the function's error type is `Option<ParseIntError>`, and no `From` implementation relates the two, so each parse needs `map_err(Some)` before its `?`.

The next step chooses the third option: define an error type and give it the `From` implementation, so `?` becomes free again everywhere inside your module.

## Style note

`?` makes the happy path the only path you read. `sum_lines` is a `for` loop, a `trim`, a skip and one `?`; the error handling is a single character and yet nothing is ignored.

## Your task

Implement the four functions, then explain the rule that decides when `?` is available.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo test --test m5-03-question-mark
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 4 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
