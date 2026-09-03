---
id: m3-03-match
title: "match: jeder Fall, geprüft"
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
    check: { type: "predict", prompt: { en: "examples/m3_match_option.rs matches four coins, calls plus_one twice and matches a dice roll of 9. Write down every line it prints, in order, including the total and the two Option values as {:?} renders them.", de: "examples/m3_match_option.rs matcht vier Münzen, ruft plus_one zweimal auf und matcht einen Würfelwurf von 9. Schreibe jede ausgegebene Zeile in der richtigen Reihenfolge auf, samt der Summe und den beiden Option-Werten, wie {:?} sie darstellt." }, then: { type: "command", command: "cargo run --quiet --example m3_match_option", seedMustFail: false, expectExitCode: 0, expectStdout: "total = 41", timeoutMs: 120000 }, rubric: "The prediction has the two side-effect lines (Lucky penny!, State quarter from Alaska!) printed during the loop and before total = 41, the total 41 (1+10+25+5), Some(6) and None on separate lines, and move 9 from the catch-all arm. Missing the interleaving of the println! side effects with the loop is the interesting error to name.", bloom: "evaluate" }
  - id: match
    title: "describe, value_or, increment und dice_action bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-03-match", expectPass: [ "m3_03_match::describe_every_variant", "m3_03_match::value_or_uses_the_default_only_for_none", "m3_03_match::increment_keeps_the_shape", "m3_03_match::dice_action_has_a_catch_all" ], minPass: 4, timeoutMs: 180000 }
socratic:
  - { trigger: "task:match:failed", question: { en: "Does it fail to compile, or does an assertion mismatch? A non-exhaustive match is a compile error; a wrong string is not.", de: "Scheitert die Übersetzung, oder weicht eine Zusicherung ab? Ein unvollständiges match ist ein Übersetzungsfehler; eine falsche Zeichenkette nicht." }, hints: [ { en: "`describe` takes `&Command`, so the arms match on references; name the payload and Rust binds it as a reference for you.", de: "`describe` nimmt `&Command`, die Zweige matchen also auf Referenzen; benenne die Nutzlast, und Rust bindet sie als Referenz." }, { en: "Check the exact separators the test demands: `move to 3,-1` has a comma and no space, `colour 1/2/3` has slashes.", de: "Prüfe die genauen Trennzeichen des Tests: `move to 3,-1` hat ein Komma und kein Leerzeichen, `colour 1/2/3` hat Schrägstriche." }, { en: "In `dice_action` the last arm must bind the value - `other => format!(\"move {other}\")` - not discard it with `_`.", de: "In `dice_action` muss der letzte Zweig den Wert binden - `other => format!(\"move {other}\")` - und ihn nicht mit `_` verwerfen." } ] }
misconceptions:
  - { pattern: "error\\[E0004\\]: non-exhaustive patterns", question: { en: "Which variant did you leave out? Read the `patterns ... not covered` line - and decide whether the missing case deserves its own arm or belongs in a catch-all.", de: "Welche Variante fehlt? Lies die Zeile `patterns ... not covered` - und entscheide, ob der fehlende Fall einen eigenen Zweig verdient oder in einen Sammelzweig gehört." }, hints: [ { en: "The diagnostic names the uncovered pattern explicitly, so you never have to hunt for it.", de: "Die Diagnose nennt das nicht abgedeckte Muster ausdrücklich, du musst also nicht suchen." }, { en: "`describe` should have no catch-all: covering every variant by name is what makes a later fifth variant a compile error rather than a silent bug.", de: "`describe` soll keinen Sammelzweig haben: jede Variante namentlich abzudecken macht eine spätere fünfte Variante zu einem Übersetzungsfehler statt zu einem stillen Fehler." }, { en: "For a numeric match every remaining value needs a home, which is what the final `other` arm is for.", de: "Bei einem numerischen match braucht jeder verbleibende Wert ein Zuhause - dafür ist der abschließende `other`-Zweig da." } ] }
  - { pattern: "error\\[E0308\\]: `match` arms have incompatible types", question: { en: "Two arms produce different types. Which one, and is the difference a String against a &str?", de: "Zwei Zweige liefern verschiedene Typen. Welcher, und ist der Unterschied ein String gegen ein &str?" }, hints: [ { en: "Every arm of a match used as an expression must have the same type.", de: "Jeder Zweig eines als Ausdruck genutzten match muss denselben Typ haben." }, { en: "`format!(...)` gives a `String`; a bare literal gives a `&str`, so wrap it in `String::from(...)`.", de: "`format!(...)` liefert einen `String`; ein blankes Literal liefert ein `&str`, umschließe es also mit `String::from(...)`." }, { en: "An arm ending in a semicolon evaluates to `()`, which will not match the others.", de: "Ein Zweig, der mit Semikolon endet, ergibt `()` und passt damit nicht zu den anderen." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`pwd` prints the current folder; it has to be the rust-foundations workspace, the one holding Cargo.toml.", de: "`pwd` gibt den aktuellen Ordner aus; er muss der rust-foundations-Workspace sein, in dem die Cargo.toml liegt." }, { en: "A terminal opened with Terminal → New Terminal starts in the workspace folder; one you navigated away from does not.", de: "Ein über Terminal → Neues Terminal geöffnetes Terminal startet im Workspace-Ordner; eines, aus dem du herausnavigiert bist, nicht." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Zerlege ein Enum mit `match` und nutze die Vollständigkeitsprüfung als Entwurfswerkzeug statt als Hindernis.

## match ist ein Ausdruck

```rust
let action = match roll {
    3 => String::from("fancy hat"),
    7 => String::from("lose hat"),
    other => format!("move {other}"),
};
```

Jeder Zweig liefert einen Wert, und alle Zweige müssen *denselben* Typ liefern - einen `String`-Zweig mit einem `&str`-Zweig zu mischen ergibt `error[E0308]: match arms have incompatible types`. Ein Zweig, der mit Semikolon endet, ergibt `()` und passt ebenfalls nicht zu den anderen.

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

`describe` nimmt `&Command`, `text` wird also als `&String` gebunden und nicht herausbewegt - das Werk des Borrow-Checkers und der Grund, warum das ohne Klon übersetzt. Nähme die Funktion `Command` per Wert, würde `text` verschoben und das Kommando verbraucht.

## Vollständigkeit ist der Zweck

Lässt du eine Variante aus, verweigert der Compiler:

```text
error[E0004]: non-exhaustive patterns: `&Command::ChangeColor(_, _, _)` not covered
```

Das ist keine Pedanterie, sondern die Funktion. Ergänze in einem Jahr eine fünfte Variante, und jedes `match`, das sich ändern muss, meldet sich. Ein Sammelzweig `_ => ()` schaltet das dauerhaft ab, deshalb hat `describe` bewusst keinen.

`dice_action` zeigt die andere Seite: ein `u8` zu matchen bedeutet 254 unabgedeckte Werte, und sie aufzuzählen wäre absurd. Dort ist der Sammelzweig richtig - und er sollte *binden*, `other => format!("move {other}")`, statt mit `_` zu verwerfen, denn du brauchst die Zahl.

## Option, noch einmal

```rust
match o {
    Some(n) => Some(n + 1),
    None => None,
}
```

Das ist Listing 6-5 und lohnt einmal ausgeschrieben, auch wenn `o.map(|n| n + 1)` dasselbe in einer Zeile sagt. Clippy weist darauf hin; der Workspace trägt ein `#[allow(clippy::manual_map)]` mit einem Kommentar, dass die lange Form hier die Lektion ist.

## Die Vorhersage

`examples/m3_match_option.rs` gibt aus zwei seiner match-Zweige heraus aus, während eine Schleife läuft. Sage die gesamte Ausgabe vorher, einschließlich der Stelle, an der diese Zeilen relativ zur Summe erscheinen.

## Deine Aufgabe

Sage das Beispiel vorher und implementiere dann die vier Funktionen. Der nächste Step behandelt die Fälle, in denen ein vollständiges `match` mehr Zeremonie ist, als die Lage verdient.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1** (im Browser zuverlässiger als Strg+Umschalt+P), tippe `Terminal: Create New Terminal` und drücke die Eingabetaste. Das Terminal öffnet sich im Bereich unten, bereits im Workspace-Ordner. Führe dann aus:

```bash
cargo run --quiet --example m3_match_option
cargo test --test m3-03-match
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** die Ausgabe des Programms, darin `total = 41`.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, steht das Terminal im falschen Ordner - wechsle mit `cd` zurück in den Workspace-Ordner.
