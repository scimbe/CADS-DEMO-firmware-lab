---
id: m3-03-match
title: "match: every case, checked"
bloom: apply
objectives: [ "rust-ch06-02-match" ]
requires: [ "m3-02-enums" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m3-02-enums" ]
links:
  - { step: "m3-04-if-let" }
  - { file: "src/m3/m3_03_match.rs" }
  - { file: "examples/m3_match_option.rs" }
  - { url: "https://doc.rust-lang.org/book/ch06-02-match.html", title: "The Book, 6.2: The match Control Flow Construct" }
sources: [ "src/m3/m3_03_match.rs", "tests/m3-03-match.rs", "examples/m3_match_option.rs" ]
tasks:
  - id: guess
    title: "Predict the example's output"
    check: { type: "predict", prompt: { en: "examples/m3_match_option.rs matches four coins, calls plus_one twice and matches a dice roll of 9. Write down every line it prints, in order, including the total and the two Option values as {:?} renders them.", de: "examples/m3_match_option.rs matcht vier Muenzen, ruft plus_one zweimal auf und matcht einen Wuerfelwurf von 9. Schreibe jede ausgegebene Zeile in der richtigen Reihenfolge auf, samt der Summe und den beiden Option-Werten, wie {:?} sie darstellt." }, then: { type: "command", command: "cargo run --quiet --example m3_match_option", expectExitCode: 0, expectStdout: "total = 41", timeoutMs: 120000 }, rubric: "The prediction has the two side-effect lines (Lucky penny!, State quarter from Alaska!) printed during the loop and before total = 41, the total 41 (1+10+25+5), Some(6) and None on separate lines, and move 9 from the catch-all arm. Missing the interleaving of the println! side effects with the loop is the interesting error to name.", bloom: "evaluate" }
  - id: match
    title: "describe, value_or, increment and dice_action pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-03-match", expectPass: [ "m3_03_match::describe_every_variant", "m3_03_match::value_or_uses_the_default_only_for_none", "m3_03_match::increment_keeps_the_shape", "m3_03_match::dice_action_has_a_catch_all" ], minPass: 4, timeoutMs: 180000 }
socratic:
  - { trigger: "task:match:failed", question: { en: "Does it fail to compile, or does an assertion mismatch? A non-exhaustive match is a compile error; a wrong string is not.", de: "Scheitert die Uebersetzung, oder weicht eine Zusicherung ab? Ein unvollstaendiges match ist ein Uebersetzungsfehler; eine falsche Zeichenkette nicht." }, hints: [ { en: "`describe` takes `&Command`, so the arms match on references; name the payload and Rust binds it as a reference for you.", de: "`describe` nimmt `&Command`, die Zweige matchen also auf Referenzen; benenne die Nutzlast, und Rust bindet sie als Referenz." }, { en: "Check the exact separators the test demands: `move to 3,-1` has a comma and no space, `colour 1/2/3` has slashes.", de: "Pruefe die genauen Trennzeichen des Tests: `move to 3,-1` hat ein Komma und kein Leerzeichen, `colour 1/2/3` hat Schraegstriche." }, { en: "In `dice_action` the last arm must bind the value - `other => format!(\"move {other}\")` - not discard it with `_`.", de: "In `dice_action` muss der letzte Zweig den Wert binden - `other => format!(\"move {other}\")` - und ihn nicht mit `_` verwerfen." } ] }
misconceptions:
  - { pattern: "error\\[E0004\\]: non-exhaustive patterns", question: { en: "Which variant did you leave out? Read the `patterns ... not covered` line - and decide whether the missing case deserves its own arm or belongs in a catch-all.", de: "Welche Variante fehlt? Lies die Zeile `patterns ... not covered` - und entscheide, ob der fehlende Fall einen eigenen Zweig verdient oder in einen Sammelzweig gehoert." }, hints: [ { en: "The diagnostic names the uncovered pattern explicitly, so you never have to hunt for it.", de: "Die Diagnose nennt das nicht abgedeckte Muster ausdruecklich, du musst also nicht suchen." }, { en: "`describe` should have no catch-all: covering every variant by name is what makes a later fifth variant a compile error rather than a silent bug.", de: "`describe` soll keinen Sammelzweig haben: jede Variante namentlich abzudecken macht eine spaetere fuenfte Variante zu einem Uebersetzungsfehler statt zu einem stillen Fehler." }, { en: "For a numeric match every remaining value needs a home, which is what the final `other` arm is for.", de: "Bei einem numerischen match braucht jeder verbleibende Wert ein Zuhause - dafuer ist der abschliessende `other`-Zweig da." } ] }
  - { pattern: "error\\[E0308\\]: `match` arms have incompatible types", question: { en: "Two arms produce different types. Which one, and is the difference a String against a &str?", de: "Zwei Zweige liefern verschiedene Typen. Welcher, und ist der Unterschied ein String gegen ein &str?" }, hints: [ { en: "Every arm of a match used as an expression must have the same type.", de: "Jeder Zweig eines als Ausdruck genutzten match muss denselben Typ haben." }, { en: "`format!(...)` gives a `String`; a bare literal gives a `&str`, so wrap it in `String::from(...)`.", de: "`format!(...)` liefert einen `String`; ein blankes Literal liefert ein `&str`, umschliesse es also mit `String::from(...)`." }, { en: "An arm ending in a semicolon evaluates to `()`, which will not match the others.", de: "Ein Zweig, der mit Semikolon endet, ergibt `()` und passt damit nicht zu den anderen." } ] }
---
## Learning goal

Destructure an enum with `match`, and use the exhaustiveness check as a design tool rather than an obstacle.

## match is an expression

```rust
let action = match roll {
    3 => String::from("fancy hat"),
    7 => String::from("lose hat"),
    other => format!("move {other}"),
};
```

Every arm produces a value, and all arms must produce the *same* type - mixing a `String` arm with a `&str` arm is `error[E0308]: match arms have incompatible types`. An arm ending in a semicolon evaluates to `()` and will not match the others either.

## Binding the payload

Patterns take the data apart:

```rust
match c {
    Command::Quit => String::from("quit"),
    Command::Move { x, y } => format!("move to {x},{y}"),
    Command::Write(text) => format!("write {text}"),
    Command::ChangeColor(r, g, b) => format!("colour {r}/{g}/{b}"),
}
```

`describe` takes `&Command`, so `text` is bound as a `&String` rather than moved out - the borrow checker's doing, and the reason this compiles without a clone. If the function took `Command` by value, `text` would be moved and the command consumed.

## Exhaustiveness is the point

Leave a variant out and the compiler refuses:

```text
error[E0004]: non-exhaustive patterns: `&Command::ChangeColor(_, _, _)` not covered
```

That is not pedantry, it is the feature. Add a fifth variant to `Command` a year from now and every `match` that has to change tells you where it is. A `_ => ()` catch-all switches this off permanently, so `describe` deliberately has none.

`dice_action` shows the other side: matching a `u8` means 254 uncovered values, and listing them is absurd. There the catch-all is correct - and it should *bind*, `other => format!("move {other}")`, not discard with `_`, because you need the number.

## Option again

```rust
match o {
    Some(n) => Some(n + 1),
    None => None,
}
```

This is Listing 6-5 and worth writing out once even though `o.map(|n| n + 1)` says the same thing in one line. Clippy will point that out; the workspace carries an `#[allow(clippy::manual_map)]` with a comment saying the long form is the lesson here.

## The prediction

`examples/m3_match_option.rs` prints from inside two of its match arms while a loop is running. Predict the whole output before you run it, including where those side-effect lines fall relative to the total.

## Your task

Predict the example, then implement the four functions. The next step is about the times when a full `match` is more ceremony than the situation deserves.
