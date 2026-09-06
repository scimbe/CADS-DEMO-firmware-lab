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
    check: { type: "predict", prompt: { en: "examples/m3_match_option.rs matches four coins, calls plus_one twice and matches a dice roll of 9. Write down every line it prints, in order, including the total and the two Option values as {:?} renders them.", de: "examples/m3_match_option.rs matcht vier Münzen, ruft plus_one zweimal auf und matcht einen Würfelwurf von 9. Schreibe jede ausgegebene Zeile in der richtigen Reihenfolge auf, samt der Summe und den beiden Option-Werten, wie {:?} sie darstellt." }, then: { type: "command", command: "cargo run --quiet --example m3_match_option", seedMustFail: false, expectExitCode: 0, expectStdout: "total = 41", timeoutMs: 120000 }, rubric: "The prediction has the two side-effect lines (Lucky penny!, State quarter from Alaska!) printed during the loop and before total = 41, the total 41 (1+10+25+5), Some(6) and None on separate lines, and move 9 from the catch-all arm. Missing the interleaving of the println! side effects with the loop is the interesting error to name.", bloom: "evaluate" }
  - id: match
    title: "describe, value_or, increment and dice_action pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-03-match", expectPass: [ "m3_03_match::describe_every_variant", "m3_03_match::value_or_uses_the_default_only_for_none", "m3_03_match::increment_keeps_the_shape", "m3_03_match::dice_action_has_a_catch_all" ], minPass: 4, timeoutMs: 180000 }
  - id: catch-all
    title: "You can say why only one of the two may have a catch-all"
    check: { type: "question", prompt: { en: "dice_action may have a catch-all arm, describe may not. Two sentences: what makes the difference, and what a catch-all in describe would cost a year from now.", de: "dice_action darf einen Auffangzweig haben, describe nicht. Zwei Sätze: worin der Unterschied liegt, und was ein Auffangzweig in describe in einem Jahr kosten würde." }, rubric: "Judged on the answer. All three criteria must be met: (1) the difference is placed in the type, not in taste: one has a listable set of variants that the compiler can hold the arms against, the other has a range of numbers nobody would write out; (2) the cost is named as a check that stops happening rather than as an error that starts: a variant added later falls into the catch-all, the code goes on compiling, and nothing points at the places that now handle it wrongly; (3) the loss is placed in the future, at the moment someone extends the type, not in the present. Does not pass: readability, brevity or effort as the difference; an answer in which the catch-all produces a compile error; an answer that only restates that describe has no catch-all.", bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:catch-all:failed", question: { en: "Imagine a colleague adds a fifth variant to Command next spring. Which lines does the compiler show them, and which does it stay silent about?", de: "Stell dir vor, eine Kollegin fügt Command im nächsten Frühjahr eine fünfte Variante hinzu. Welche Zeilen zeigt ihr der Compiler, und über welche schweigt er?" }, hints: [ { en: "An exhaustiveness check needs something to be exhaustive against. Ask what the compiler would have to enumerate to check `dice_action` the way it checks `describe`, and how long that list would be.", de: "Eine Vollständigkeitsprüfung braucht etwas, wogegen sie vollständig sein kann. Frage, was der Compiler aufzählen müsste, um `dice_action` so zu prüfen wie `describe`, und wie lang diese Liste wäre." }, { en: "Open `src/m3/m3_03_match.rs` and read the two functions one after the other. Look at what stands to the left of the arrows, not at what the arms produce.", de: "Öffne `src/m3/m3_03_match.rs` und lies die beiden Funktionen nacheinander. Sieh auf das, was links der Pfeile steht, nicht auf das, was die Zweige liefern." }, { en: "The second half is not about an error appearing but about one no longer appearing. Write out both versions of the day the fifth variant lands: with no catch-all the build stops and names the file, with one it succeeds - and ask which of the two you would rather be told.", de: "Die zweite Hälfte handelt nicht davon, dass ein Fehler auftaucht, sondern davon, dass keiner mehr auftaucht. Schreibe beide Fassungen des Tages auf, an dem die fünfte Variante kommt: ohne Auffangzweig bricht der Bau ab und nennt die Datei, mit einem gelingt er - und frage, welches von beiden du lieber erfahren würdest." } ] }
  - { trigger: "task:guess:failed", question: { en: "Two of the four match arms print something. Where do those lines land relative to the total?", de: "Zwei der vier match-Zweige geben etwas aus. Wo landen diese Zeilen im Verhältnis zur Summe?" }, hints: [ { en: "The coins are matched inside a `for` loop, so printing inside an arm happens once per coin, while the loop runs.", de: "Die Münzen werden in einer `for`-Schleife gematcht; eine Ausgabe in einem Zweig passiert also einmal je Münze, während die Schleife läuft." }, { en: "The total is printed after the loop, so everything the arms printed comes first. Now put the four coins in the order the vector holds them.", de: "Die Summe wird nach der Schleife ausgegeben, alles aus den Zweigen kommt also davor. Bringe nun die vier Münzen in die Reihenfolge, in der der Vektor sie hält." }, { en: "`{:?}` on an `Option<i32>` prints `Some(6)` or `None`, with the wrapper visible - not the bare number.", de: "`{:?}` auf einem `Option<i32>` gibt `Some(6)` oder `None` aus, mit sichtbarer Hülle - nicht die blanke Zahl." } ] }
  - { trigger: "task:match:failed", question: { en: "Does it fail to compile, or does an assertion mismatch? A non-exhaustive match is a compile error; a wrong string is not.", de: "Scheitert die Übersetzung, oder weicht eine Zusicherung ab? Ein unvollständiges match ist ein Übersetzungsfehler; eine falsche Zeichenkette nicht." }, hints: [ { en: "`describe` takes `&Command`, so the arms match on references; name the payload and Rust binds it as a reference for you.", de: "`describe` nimmt `&Command`, die Zweige matchen also auf Referenzen; benenne die Nutzlast, und Rust bindet sie als Referenz." }, { en: "Check the exact separators the test demands: `move to 3,-1` has a comma and no space, `colour 1/2/3` has slashes.", de: "Prüfe die genauen Trennzeichen des Tests: `move to 3,-1` hat ein Komma und kein Leerzeichen, `colour 1/2/3` hat Schrägstriche." }, { en: "In `dice_action` the last arm must bind the value - `other => format!(\"move {other}\")` - not discard it with `_`.", de: "In `dice_action` muss der letzte Zweig den Wert binden - `other => format!(\"move {other}\")` - und ihn nicht mit `_` verwerfen." } ] }
misconceptions:
  - { pattern: "error\\[E0004\\]: non-exhaustive patterns", question: { en: "Which variant did you leave out? Read the `patterns ... not covered` line - and decide whether the missing case deserves its own arm or belongs in a catch-all.", de: "Welche Variante fehlt? Lies die Zeile `patterns ... not covered` - und entscheide, ob der fehlende Fall einen eigenen Zweig verdient oder in einen Sammelzweig gehört." }, hints: [ { en: "The diagnostic names the uncovered pattern explicitly, so you never have to hunt for it.", de: "Die Diagnose nennt das nicht abgedeckte Muster ausdrücklich, du musst also nicht suchen." }, { en: "`describe` should have no catch-all: covering every variant by name is what makes a later fifth variant a compile error rather than a silent bug.", de: "`describe` soll keinen Sammelzweig haben: jede Variante namentlich abzudecken macht eine spätere fünfte Variante zu einem Übersetzungsfehler statt zu einem stillen Fehler." }, { en: "For a numeric match every remaining value needs a home, which is what the final `other` arm is for.", de: "Bei einem numerischen match braucht jeder verbleibende Wert ein Zuhause - dafür ist der abschließende `other`-Zweig da." } ] }
  - { pattern: "error\\[E0308\\]: `match` arms have incompatible types", question: { en: "Two arms produce different types. Which one, and is the difference a String against a &str?", de: "Zwei Zweige liefern verschiedene Typen. Welcher, und ist der Unterschied ein String gegen ein &str?" }, hints: [ { en: "Every arm of a match used as an expression must have the same type.", de: "Jeder Zweig eines als Ausdruck genutzten match muss denselben Typ haben." }, { en: "`format!(...)` gives a `String`; a bare literal gives a `&str`, so wrap it in `String::from(...)`.", de: "`format!(...)` liefert einen `String`; ein blankes Literal liefert ein `&str`, umschließe es also mit `String::from(...)`." }, { en: "An arm ending in a semicolon evaluates to `()`, which will not match the others.", de: "Ein Zweig, der mit Semikolon endet, ergibt `()` und passt damit nicht zu den anderen." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Destructure an enum with `match`, and use the exhaustiveness check as a design tool rather than an obstacle.

It builds on `m3-02-enums`: the variants from there are exactly the cases `match` has to take apart here.

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

Predict the example, implement the four functions, and then give in two sentences the reason only one of the two may have a catch-all. The next step is about the times when a full `match` is more ceremony than the situation deserves.

## Running it

::: do palette="> Terminal: Create New Terminal"
Open a terminal: press **F1**, type the entry with its leading `>`, press Enter. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.
> expect: The panel opens at the bottom on its **Terminal** tab, and the prompt ends in `~/workspace`.
> recover: If the palette says *No matching results*, the `>` is missing and it is searching for a file of that name - type it in front and repeat. The menu does the same: **Terminal → New Terminal**.
:::

The terminal starts in `~/workspace`, the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate once per terminal:

```bash
cd ~/workspace/rust-foundations
```

::: do command="cargo test --test m3-03-match" cwd="."
Run this step's tests. The same command sits behind the **Check** button on the *describe, value_or, increment and dice_action pass* task.
> expect: One line per test, `test … ok` or `… FAILED`, then the summary `test result: ok. 4 passed; 0 failed` once all 4 pass. The first run takes a few seconds while the crate compiles once; every run after that stays well under a second.
> recover: If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - do it now. If it says `no test target named`, the name after `--test` is wrong; `ls tests/` lists the valid ones.
:::

![A terminal in the bottom panel: the prompt reads coder@…:~/workspace/rust-foundations, with the cargo command and its output below it.](terminal-run-a-step.png)

The **Check** button on the task runs the same command and shows the same output in the tutor panel; it always uses the right folder, so it never needs the `cd`. The terminal is there so you can see it yourself and repeat it. The output appears on the **Terminal** tab, not in **Problems** and not in **Output** - those two show other things and are the usual reason for "nothing happens".
