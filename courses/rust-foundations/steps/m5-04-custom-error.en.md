---
id: m5-04-custom-error
title: "Your own error type"
bloom: analyze
objectives: [ "rust-ch09-02-recoverable-errors-with-result" ]
requires: [ "m5-03-question-mark" ]
estimatedMinutes: 30
scaffold: independent
recallFrom: [ "m5-03-question-mark", "m3-02-enums" ]
links:
  - { step: "m6-01-generics" }
  - { file: "src/m5/m5_04_custom_error.rs" }
  - { file: "tests/m5-04-custom-error.rs" }
  - { url: "https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html", title: "The Book, 9.2: Recoverable Errors with Result" }
sources: [ "src/m5/m5_04_custom_error.rs", "tests/m5-04-custom-error.rs" ]
tasks:
  - id: custom
    title: "The custom error type behaves"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m5-04-custom-error", expectPass: [ "m5_04_custom_error::parse_config_reads_pairs", "m5_04_custom_error::a_line_without_equals_is_a_syntax_error", "m5_04_custom_error::the_question_mark_converts_the_parse_error", "m5_04_custom_error::display_is_readable", "m5_04_custom_error::config_error_is_a_std_error", "m5_04_custom_error::config_get_separates_absent_from_broken" ], minPass: 6, timeoutMs: 180000 }
  - id: absent
    title: "You can defend Ok(None) over Err"
    check: { type: "question", prompt: { en: "config_get returns Ok(None) for a key that is absent and Err only for a broken file. Argue why 'not there' is not an error here, and describe a caller for whom that decision would be wrong - and what you would change for them.", de: "config_get liefert Ok(None) für einen fehlenden Schlüssel und Err nur für eine kaputte Datei. Begründe, warum 'nicht vorhanden' hier kein Fehler ist, und beschreibe einen Aufrufer, für den diese Entscheidung falsch wäre - und was du für ihn ändern würdest." }, rubric: "Argues that an absent optional key is an expected state with an obvious response (use a default), while a malformed file means the caller cannot trust any of the data, so the two deserve different types; conflating them would force every caller to inspect an error to find out whether anything is actually wrong. The counter-case should be a caller for which the key is mandatory, and the change should be concrete - a separate require_key returning Err(Missing(key)), or a MissingKey variant used by that entry point.", bloom: "evaluate", minChars: 80 }
socratic:
  - { trigger: "task:custom:failed", question: { en: "Which test fails? If it is the_question_mark_converts_the_parse_error, is your From impl carrying the parser's own message, or one of your own?", de: "Welcher Test scheitert? Ist es the_question_mark_converts_the_parse_error: trägt dein From-Impl die Meldung des Parsers oder eine eigene?" }, hints: [ { en: "`ConfigError::NotANumber(e.to_string())` stores the parser's message, which for a non-numeric value is exactly \"invalid digit found in string\".", de: "`ConfigError::NotANumber(e.to_string())` speichert die Meldung des Parsers, die bei einem nicht-numerischen Wert genau \"invalid digit found in string\" lautet." }, { en: "`Display` must produce `syntax error in line: a b` and `not a number: <message>`; the test compares the strings exactly.", de: "`Display` muss `syntax error in line: a b` und `not a number: <Meldung>` erzeugen; der Test vergleicht die Zeichenketten genau." }, { en: "`split_once('=')` gives the two halves; trim both, and remember to trim the whole line before checking whether it is empty.", de: "`split_once('=')` liefert beide Hälften; entferne bei beiden den Leerraum, und trimme die ganze Zeile, bevor du sie auf Leere prüfst." } ] }
misconceptions:
  - { pattern: "error\\[E0277\\].*`.*` doesn't implement `std::fmt::Display`|the trait bound `.*: std::error::Error` is not satisfied", question: { en: "Something needs your type to be printable or to be a standard error. Which trait is missing, and what does the standard Error trait require before you may implement it?", de: "Etwas verlangt, dass dein Typ druckbar oder ein Standardfehler ist. Welches Trait fehlt, und was verlangt das Standard-Error-Trait, bevor du es implementieren darfst?" }, hints: [ { en: "`std::error::Error` requires both `Debug` and `Display`; `Debug` comes from the derive, `Display` you write.", de: "`std::error::Error` verlangt sowohl `Debug` als auch `Display`; `Debug` liefert das derive, `Display` schreibst du." }, { en: "`impl std::error::Error for ConfigError {}` needs no body once those two are in place.", de: "`impl std::error::Error for ConfigError {}` braucht keinen Rumpf, sobald die beiden vorhanden sind." }, { en: "`Display::fmt` writes into the formatter: `write!(f, \"…\")`, and returns its result.", de: "`Display::fmt` schreibt in den Formatter: `write!(f, \"…\")`, und liefert dessen Ergebnis." } ] }
  - { pattern: "the trait bound `.*: From<.*>` is not satisfied|`\\?` couldn't convert the error", question: { en: "? has no route from the parser's error to yours. Is the From impl missing, or does it convert into a different type than the function returns?", de: "? findet keinen Weg vom Fehler des Parsers zu deinem. Fehlt das From-Impl, oder wandelt es in einen anderen Typ, als die Funktion liefert?" }, hints: [ { en: "`impl From<ParseIntError> for ConfigError` is what makes `value.trim().parse()?` compile inside this function.", de: "`impl From<ParseIntError> for ConfigError` ist es, was `value.trim().parse()?` in dieser Funktion übersetzbar macht." }, { en: "The annotation on the binding (`let number: i64 = …`) tells `parse` which type to produce, and thus which error to make.", de: "Die Annotation an der Bindung (`let number: i64 = …`) sagt `parse`, welchen Typ es erzeugen soll, und damit welchen Fehler." }, { en: "The test requires the conversion to happen through `?`, so a hand-written `map_err` here would miss the point even if it passed.", de: "Der Test verlangt die Umwandlung über `?`; ein selbst geschriebenes `map_err` verfehlte hier also den Punkt, selbst wenn es bestünde." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`pwd` prints the current folder; it has to be the rust-foundations workspace, the one holding Cargo.toml.", de: "`pwd` gibt den aktuellen Ordner aus; er muss der rust-foundations-Workspace sein, in dem die Cargo.toml liegt." }, { en: "A terminal opened with Terminal → New Terminal starts in the workspace folder; one you navigated away from does not.", de: "Ein über Terminal → Neues Terminal geöffnetes Terminal startet im Workspace-Ordner; eines, aus dem du herausnavigiert bist, nicht." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Define an error type for your module, make `?` convert into it automatically, and decide what deserves to be an error at all.

## Why not just `String`

`Result<T, String>` is what m5-02 used, and it is fine for a small function. It stops being fine as soon as a caller wants to *do* something different per failure: a `String` can be printed and nothing else. An enum can be matched.

```rust
pub enum ConfigError {
    Syntax(String),
    NotANumber(String),
}
```

Two variants, each carrying the context a reader needs. A caller can now say "a syntax error means show the line number; a bad number means fall back to the default", which no string allows.

## The three impls that make it a real error

**`Debug`** comes from `#[derive(Debug)]`. It is what `unwrap` prints and what `{:?}` shows.

**`Display`** is what a user sees, and you write it:

```rust
impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConfigError::Syntax(line) => write!(f, "syntax error in line: {line}"),
            ConfigError::NotANumber(msg) => write!(f, "not a number: {msg}"),
        }
    }
}
```

`write!` writes into the formatter and returns the result the trait wants. Implementing `Display` also gives you `.to_string()` for free.

**`std::error::Error`** requires exactly `Debug` and `Display`, so with both in place the implementation is empty:

```rust
impl std::error::Error for ConfigError {}
```

That one line is what lets a `ConfigError` go into a `Box<dyn Error>` and travel up through code that does not know your module - the test `config_error_is_a_std_error` checks precisely this.

## The From impl is what buys back `?`

```rust
impl From<ParseIntError> for ConfigError {
    fn from(e: ParseIntError) -> Self {
        ConfigError::NotANumber(e.to_string())
    }
}
```

Written once, this makes every `?` inside a function returning `Result<_, ConfigError>` convert a parse failure automatically. Inside `parse_config` the line is just:

```rust
let number: i64 = value.trim().parse()?;
```

No `map_err` at any call site. This is the pattern the chapter's `?` section describes, and it is why `?` scales: the conversion lives with the type, not with every use.

Note that `e.to_string()` stores the parser's own wording, `invalid digit found in string`. The test asserts that exact text, which keeps the course honest - it is what rustc's standard library actually produces on this machine, not something invented for the exercise.

## Not everything is an error

`config_get` returns `Ok(None)` for a key that is absent and `Err` only when the file itself is broken. Those are genuinely different situations: a missing optional key has an obvious response, a malformed file means none of the data can be trusted. Folding them together would force every caller to inspect an error just to find out whether anything is wrong.

## Your task

Implement `Display`, the `From` impl, `parse_config` and `config_get`, then defend the `Ok(None)` decision and name a caller for whom it would be wrong. Module M6 is the last one before the project.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1** (more reliable in a browser than Ctrl+Shift+P), type `Terminal: Create New Terminal` and press Enter. The terminal opens in the panel at the bottom, already in the workspace folder. Then run:

```bash
cargo test --test m5-04-custom-error
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 6 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, the terminal is in the wrong folder - `cd` back to the workspace root.
