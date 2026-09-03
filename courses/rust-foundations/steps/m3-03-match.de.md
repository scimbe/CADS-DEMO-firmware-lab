---
id: m3-03-match
title: "match: jeder Fall, geprueft"
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
    title: "Sage die Ausgabe des Beispiels vorher"
    check: { type: "predict", prompt: { en: "examples/m3_match_option.rs matches four coins, calls plus_one twice and matches a dice roll of 9. Write down every line it prints, in order, including the total and the two Option values as {:?} renders them.", de: "examples/m3_match_option.rs matcht vier Muenzen, ruft plus_one zweimal auf und matcht einen Wuerfelwurf von 9. Schreibe jede ausgegebene Zeile in der richtigen Reihenfolge auf, samt der Summe und den beiden Option-Werten, wie {:?} sie darstellt." }, then: { type: "command", command: "cargo run --quiet --example m3_match_option", seedMustFail: false, expectExitCode: 0, expectStdout: "total = 41", timeoutMs: 120000 }, rubric: "The prediction has the two side-effect lines (Lucky penny!, State quarter from Alaska!) printed during the loop and before total = 41, the total 41 (1+10+25+5), Some(6) and None on separate lines, and move 9 from the catch-all arm. Missing the interleaving of the println! side effects with the loop is the interesting error to name.", bloom: "evaluate" }
  - id: match
    title: "describe, value_or, increment und dice_action bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-03-match", expectPass: [ "m3_03_match::describe_every_variant", "m3_03_match::value_or_uses_the_default_only_for_none", "m3_03_match::increment_keeps_the_shape", "m3_03_match::dice_action_has_a_catch_all" ], minPass: 4, timeoutMs: 180000 }
socratic:
  - { trigger: "task:match:failed", question: { en: "Does it fail to compile, or does an assertion mismatch? A non-exhaustive match is a compile error; a wrong string is not.", de: "Scheitert die Uebersetzung, oder weicht eine Zusicherung ab? Ein unvollstaendiges match ist ein Uebersetzungsfehler; eine falsche Zeichenkette nicht." }, hints: [ { en: "`describe` takes `&Command`, so the arms match on references; name the payload and Rust binds it as a reference for you.", de: "`describe` nimmt `&Command`, die Zweige matchen also auf Referenzen; benenne die Nutzlast, und Rust bindet sie als Referenz." }, { en: "Check the exact separators the test demands: `move to 3,-1` has a comma and no space, `colour 1/2/3` has slashes.", de: "Pruefe die genauen Trennzeichen des Tests: `move to 3,-1` hat ein Komma und kein Leerzeichen, `colour 1/2/3` hat Schraegstriche." }, { en: "In `dice_action` the last arm must bind the value - `other => format!(\"move {other}\")` - not discard it with `_`.", de: "In `dice_action` muss der letzte Zweig den Wert binden - `other => format!(\"move {other}\")` - und ihn nicht mit `_` verwerfen." } ] }
misconceptions:
  - { pattern: "error\\[E0004\\]: non-exhaustive patterns", question: { en: "Which variant did you leave out? Read the `patterns ... not covered` line - and decide whether the missing case deserves its own arm or belongs in a catch-all.", de: "Welche Variante fehlt? Lies die Zeile `patterns ... not covered` - und entscheide, ob der fehlende Fall einen eigenen Zweig verdient oder in einen Sammelzweig gehoert." }, hints: [ { en: "The diagnostic names the uncovered pattern explicitly, so you never have to hunt for it.", de: "Die Diagnose nennt das nicht abgedeckte Muster ausdruecklich, du musst also nicht suchen." }, { en: "`describe` should have no catch-all: covering every variant by name is what makes a later fifth variant a compile error rather than a silent bug.", de: "`describe` soll keinen Sammelzweig haben: jede Variante namentlich abzudecken macht eine spaetere fuenfte Variante zu einem Uebersetzungsfehler statt zu einem stillen Fehler." }, { en: "For a numeric match every remaining value needs a home, which is what the final `other` arm is for.", de: "Bei einem numerischen match braucht jeder verbleibende Wert ein Zuhause - dafuer ist der abschliessende `other`-Zweig da." } ] }
  - { pattern: "error\\[E0308\\]: `match` arms have incompatible types", question: { en: "Two arms produce different types. Which one, and is the difference a String against a &str?", de: "Zwei Zweige liefern verschiedene Typen. Welcher, und ist der Unterschied ein String gegen ein &str?" }, hints: [ { en: "Every arm of a match used as an expression must have the same type.", de: "Jeder Zweig eines als Ausdruck genutzten match muss denselben Typ haben." }, { en: "`format!(...)` gives a `String`; a bare literal gives a `&str`, so wrap it in `String::from(...)`.", de: "`format!(...)` liefert einen `String`; ein blankes Literal liefert ein `&str`, umschliesse es also mit `String::from(...)`." }, { en: "An arm ending in a semicolon evaluates to `()`, which will not match the others.", de: "Ein Zweig, der mit Semikolon endet, ergibt `()` und passt damit nicht zu den anderen." } ] }
---
## Lernziel

Zerlege ein Enum mit `match` und nutze die Vollstaendigkeitspruefung als Entwurfswerkzeug statt als Hindernis.

## match ist ein Ausdruck

```rust
let action = match roll {
    3 => String::from("fancy hat"),
    7 => String::from("lose hat"),
    other => format!("move {other}"),
};
```

Jeder Zweig liefert einen Wert, und alle Zweige muessen *denselben* Typ liefern - einen `String`-Zweig mit einem `&str`-Zweig zu mischen ergibt `error[E0308]: match arms have incompatible types`. Ein Zweig, der mit Semikolon endet, ergibt `()` und passt ebenfalls nicht zu den anderen.

## Die Nutzlast binden

Muster zerlegen die Daten:

```rust
match c {
    Command::Quit => String::from("quit"),
    Command::Move { x, y } => format!("move to {x},{y}"),
    Command::Write(text) => format!("write {text}"),
    Command::ChangeColor(r, g, b) => format!("colour {r}/{g}/{b}"),
}
```

`describe` nimmt `&Command`, `text` wird also als `&String` gebunden und nicht herausbewegt - das Werk des Borrow-Checkers und der Grund, warum das ohne Klon uebersetzt. Naehme die Funktion `Command` per Wert, wuerde `text` verschoben und das Kommando verbraucht.

## Vollstaendigkeit ist der Zweck

Laesst du eine Variante aus, verweigert der Compiler:

```text
error[E0004]: non-exhaustive patterns: `&Command::ChangeColor(_, _, _)` not covered
```

Das ist keine Pedanterie, sondern die Funktion. Ergaenze in einem Jahr eine fuenfte Variante, und jedes `match`, das sich aendern muss, meldet sich. Ein Sammelzweig `_ => ()` schaltet das dauerhaft ab, deshalb hat `describe` bewusst keinen.

`dice_action` zeigt die andere Seite: ein `u8` zu matchen bedeutet 254 unabgedeckte Werte, und sie aufzuzaehlen waere absurd. Dort ist der Sammelzweig richtig - und er sollte *binden*, `other => format!("move {other}")`, statt mit `_` zu verwerfen, denn du brauchst die Zahl.

## Option, noch einmal

```rust
match o {
    Some(n) => Some(n + 1),
    None => None,
}
```

Das ist Listing 6-5 und lohnt einmal ausgeschrieben, auch wenn `o.map(|n| n + 1)` dasselbe in einer Zeile sagt. Clippy weist darauf hin; der Workspace traegt ein `#[allow(clippy::manual_map)]` mit einem Kommentar, dass die lange Form hier die Lektion ist.

## Die Vorhersage

`examples/m3_match_option.rs` gibt aus zwei seiner match-Zweige heraus aus, waehrend eine Schleife laeuft. Sage die gesamte Ausgabe vorher, einschliesslich der Stelle, an der diese Zeilen relativ zur Summe erscheinen.

## Deine Aufgabe

Sage das Beispiel vorher und implementiere dann die vier Funktionen. Der naechste Step behandelt die Faelle, in denen ein vollstaendiges `match` mehr Zeremonie ist, als die Lage verdient.
