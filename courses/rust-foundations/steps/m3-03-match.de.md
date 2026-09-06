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
    check: { type: "predict", prompt: { en: "examples/m3_match_option.rs matches four coins, calls plus_one twice and matches a dice roll of 9. Write down every line it prints, in order, including the total and the two Option values as {:?} renders them.", de: "examples/m3_match_option.rs matcht vier Münzen, ruft plus_one zweimal auf und matcht einen Würfelwurf von 9. Schreibe jede ausgegebene Zeile in der richtigen Reihenfolge auf, samt der Summe und den beiden Option-Werten, wie {:?} sie darstellt." }, then: { type: "command", command: "cargo run --quiet --example m3_match_option", seedMustFail: false, expectExitCode: 0, expectStdout: "total = 41", timeoutMs: 120000 }, rubric: "Die Vorhersage hat die beiden Nebenwirkungszeilen (Lucky penny!, State quarter from Alaska!) während der Schleife und vor total = 41, die Summe 41 (1+10+25+5), Some(6) und None in getrennten Zeilen sowie move 9 aus dem Auffangzweig. Die Verschränkung der println!-Nebenwirkungen mit der Schleife zu übersehen ist der Irrtum, den zu benennen sich lohnt.", bloom: "evaluate" }
  - id: match
    title: "describe, value_or, increment und dice_action bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-03-match", expectPass: [ "m3_03_match::describe_every_variant", "m3_03_match::value_or_uses_the_default_only_for_none", "m3_03_match::increment_keeps_the_shape", "m3_03_match::dice_action_has_a_catch_all" ], minPass: 4, timeoutMs: 180000 }
  - id: catch-all
    title: "Du kannst sagen, warum nur eine der beiden einen Auffangzweig haben darf"
    check: { type: "question", prompt: { en: "dice_action may have a catch-all arm, describe may not. Two sentences: what makes the difference, and what a catch-all in describe would cost a year from now.", de: "dice_action darf einen Auffangzweig haben, describe nicht. Zwei Sätze: worin der Unterschied liegt, und was ein Auffangzweig in describe in einem Jahr kosten würde." }, rubric: "Bewertet wird die Antwort. Alle drei Kriterien müssen erfüllt sein: (1) der Unterschied wird im Typ verortet, nicht im Geschmack: der eine hat eine aufzählbare Menge von Varianten, gegen die der Compiler die Zweige halten kann, der andere einen Zahlenbereich, den niemand ausschriebe; (2) die Kosten werden als eine Prüfung benannt, die aufhört stattzufinden, nicht als ein Fehler, der beginnt: eine später hinzugefügte Variante fällt in den Auffangzweig, der Code kompiliert weiter, und nichts zeigt auf die Stellen, die sie nun falsch behandeln; (3) der Verlust wird in der Zukunft verortet, im Moment der Typerweiterung, nicht in der Gegenwart. Besteht nicht: Lesbarkeit, Kürze oder Aufwand als der Unterschied; eine Antwort, in der der Auffangzweig einen Übersetzungsfehler erzeugt; eine Antwort, die nur wiederholt, dass describe keinen Auffangzweig hat.", bloom: "analyze", minChars: 60 }
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
## Lernziel

Zerlege ein Enum mit `match` und nutze die Vollständigkeitsprüfung als Entwurfswerkzeug statt als Hindernis.

Gebaut wird auf `m3-02-enums`: die Varianten von dort sind genau die Fälle, die `match` hier auseinandernehmen muss.

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

Das ist keine Pedanterie, sondern die Funktion - und es ist eine Funktion, die man abschalten kann, denn ein Zweig `_ => ()` passt auf alles Übrige. `describe` hat bewusst keinen, `dice_action` bewusst einen. Die Frage unten verlangt, was die beiden Fälle unterscheidet und was die Wahl in einem Jahr kostet.

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

Sage das Beispiel vorher, implementiere die vier Funktionen und begründe dann in zwei Sätzen, warum nur eine der beiden einen Auffangzweig haben darf. Der nächste Step behandelt die Fälle, in denen ein vollständiges `match` mehr Zeremonie ist, als die Lage verdient.

## So führst du das aus

::: do palette="> Terminal: Create New Terminal"
Öffne ein Terminal: **F1** drücken, den Eintrag samt dem vorangestellten `>` tippen, Eingabetaste. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.
> expect: Unten öffnet sich der Bereich mit dem Reiter **Terminal**, und die Eingabeaufforderung endet auf `~/workspace`.
> recover: Steht in der Palette *No matching results*, fehlt das `>` und sie sucht nach einer Datei dieses Namens - tippe es voran und wiederhole die Eingabe. Über das Menü geht es ebenso: **Terminal → Neues Terminal**.
:::

Das Terminal startet in `~/workspace`, dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle einmal je Terminal in die Crate:

```bash
cd ~/workspace/rust-foundations
```

::: do command="cargo test --test m3-03-match" cwd="."
Führe die Tests dieses Steps aus. Derselbe Befehl steckt hinter dem Knopf **Prüfen** an der Aufgabe *describe, value_or, increment und dice_action bestehen*.
> expect: Je Test eine Zeile `test … ok` oder `… FAILED`, darunter die Zusammenfassung `test result: ok. 4 passed; 0 failed`, sobald alle 4 bestehen. Der erste Lauf braucht ein paar Sekunden, weil die Crate einmal übersetzt wird; jeder weitere bleibt deutlich unter einer Sekunde.
> recover: Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - hole es nach. Meldet es `no test target named`, stimmt der Name hinter `--test` nicht; `ls tests/` listet die gültigen Namen auf.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
