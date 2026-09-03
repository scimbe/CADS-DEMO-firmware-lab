---
id: m5-02-result
title: "Result: Fehlschlag im Rückgabetyp"
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
    title: "Die vier Result-Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m5-02-result", expectPass: [ "m5_02_result::parse_port_reports_the_input", "m5_02_result::checked_div_guards_zero", "m5_02_result::first_line_without_newline", "m5_02_result::sum_ports_stops_at_the_first_error" ], minPass: 4, timeoutMs: 180000 }
  - id: message
    title: "Du kannst die Fehlermeldung beurteilen"
    check: { type: "question", prompt: { en: "parse_port is specified to report \"'http' is not a valid port\" rather than passing on the parser's own \"invalid digit found in string\". Argue for that choice from the point of view of whoever reads the message, and name the cost of discarding the original error.", de: "parse_port soll \"'http' is not a valid port\" melden statt die eigene Meldung des Parsers \"invalid digit found in string\" durchzureichen. Begründe diese Entscheidung aus Sicht dessen, der die Meldung liest, und nenne den Preis dafür, den ursprünglichen Fehler zu verwerfen." }, rubric: "Argues that the message should name the offending input and the domain concept (a port), which the parser's generic message cannot, and that this is what lets a user fix their configuration. Names the cost honestly: the original error is thrown away, so the caller can no longer distinguish 'not a number' from 'out of range for u16', and cannot match on the error programmatically - which is what a custom error type in m5-04 restores. Does not pass: praising the message without naming what the discarded error made impossible for the caller.", bloom: "evaluate", minChars: 70 }
socratic:
  - { trigger: "task:message:failed", question: { en: "Your caller receives Err with that string. What can they do with it besides print it?", de: "Dein Aufrufer erhält Err mit dieser Zeichenkette. Was kann er damit tun, ausser sie auszugeben?" }, hints: [ { en: "Compare the two messages side by side: one names the input and the domain, the other names a property of the characters.", de: "Vergleiche die beiden Meldungen: eine nennt die Eingabe und den Fachbegriff, die andere eine Eigenschaft der Zeichen." }, { en: "Then ask which of them lets a caller distinguish 'not a number' from 'too large for a u16' - both inputs fail the same parse.", de: "Frage dann, welche von beiden einen Aufrufer 'keine Zahl' von 'zu gross für ein u16' unterscheiden lässt - beide Eingaben scheitern am selben Parsen." }, { en: "A String can be shown to a human and matched on by nobody; that is the whole cost, and m5-04 is where it is paid back.", de: "Ein String lässt sich einem Menschen zeigen und von niemandem auswerten; das ist der ganze Preis, und in m5-04 wird er zurückgezahlt." } ] }
  - { trigger: "task:result:failed", question: { en: "Which one fails? For `parse_port`, is the failing case the text input or the number that is too large - and does your message quote the input exactly?", de: "Welche scheitert? Ist bei `parse_port` der scheiternde Fall die Texteingabe oder die zu große Zahl - und zitiert deine Meldung die Eingabe genau?" }, hints: [ { en: "`s.parse::<u16>()` fails for both \"http\" and \"70000\", so one `map_err` covers both.", de: "`s.parse::<u16>()` scheitert sowohl bei \"http\" als auch bei \"70000\", ein `map_err` deckt also beides ab." }, { en: "The message has single quotes around the input: `format!(\"'{s}' is not a valid port\")`.", de: "Die Meldung setzt die Eingabe in einfache Anführungszeichen: `format!(\"'{s}' is not a valid port\")`." }, { en: "`text.lines().next()` gives the first line without its newline and `None` for the empty string.", de: "`text.lines().next()` liefert die erste Zeile ohne Zeilenumbruch und `None` für die leere Zeichenkette." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Is the mismatch a bare value where a Result was promised, or a Result where a bare value was expected?", de: "Ist der Konflikt ein blanker Wert, wo ein Result versprochen war, oder ein Result, wo ein blanker Wert erwartet wurde?" }, hints: [ { en: "A function returning `Result<u16, String>` must return `Ok(port)`, never a bare `port`.", de: "Eine Funktion mit Rückgabetyp `Result<u16, String>` muss `Ok(port)` liefern, nie ein blankes `port`." }, { en: "`Err` takes a `String` here, so `Err(\"…\")` with a literal is a `&str` and does not fit; use `String::from` or `format!`.", de: "`Err` nimmt hier einen `String`; `Err(\"…\")` mit einem Literal ist ein `&str` und passt nicht - nutze `String::from` oder `format!`." }, { en: "`sum_ports` returns `u32` while `parse_port` gives `u16`: convert with `u32::from(port)`.", de: "`sum_ports` liefert `u32`, `parse_port` aber `u16`: wandle mit `u32::from(port)` um." } ] }
  - { pattern: "error\\[E0599\\]: no method named `unwrap`|unused `Result` that must be used", question: { en: "A Result is being ignored or unwrapped where the function should pass it on. What is this function's contract on failure?", de: "Ein Result wird ignoriert oder ausgepackt, wo die Funktion es weiterreichen sollte. Wie lautet der Vertrag dieser Funktion im Fehlerfall?" }, hints: [ { en: "`sum_ports` must return the first error, not unwrap it - unwrapping would panic and break the contract.", de: "`sum_ports` muss den ersten Fehler zurückgeben, nicht auspacken - Auspacken stürzte ab und bräche den Vertrag." }, { en: "A `match` with an `Err(e) => return Err(e)` arm is the explicit form; the next step shortens it.", de: "Ein `match` mit einem Zweig `Err(e) => return Err(e)` ist die ausdrückliche Form; der nächste Step kürzt sie." }, { en: "`Result` is marked must_use, so ignoring one is a warning by design.", de: "`Result` ist als must_use markiert, es zu ignorieren ist also absichtlich eine Warnung." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Bringe den Fehlschlag in den Rückgabetyp einer Funktion, sodass der Aufrufer ihn nicht ignorieren kann - und schreibe eine Fehlermeldung, die es wert ist, gelesen zu werden.

## Der Typ

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

Ein gewöhnliches Enum, überall sichtbar. `T` ist der Erfolgswert, `E` der Fehler. Es ist mit `#[must_use]` markiert, ein Ignorieren ist also eine Warnung: der Compiler lässt einen Fehlschlag nicht stillschweigend durch.

## Es lesen

`match` ist die ausdrückliche Form und der Ausgangspunkt:

```rust
match parse_port(entry) {
    Ok(port) => total += u32::from(port),
    Err(e) => return Err(e),
}
```

Dieser Zweig `Err(e) => return Err(e)` ist die gesamte Fehlerbehandlung von `sum_ports`, und er taucht in fast jeder Funktion auf, die eine fehlbare aufruft. Der nächste Step ersetzt ihn durch ein einzelnes Zeichen - aber ihn einmal auszuschreiben macht dieses Zeichen danach lesbar.

## Einen Fehler in einen anderen wandeln

`s.parse::<u16>()` liefert `Result<u16, ParseIntError>`. `parse_port` verspricht `Result<u16, String>`, der Fehler muss also umgewandelt werden:

```rust
s.parse::<u16>().map_err(|_| format!("'{s}' is not a valid port"))
```

`map_err` wandelt den Fehler und lässt `Ok` unberührt. Der Closure ignoriert hier den ursprünglichen Fehler, was ein bewusster Handel und Gegenstand der Frageaufgabe ist. Der Gewinn ist eine Meldung, die Eingabe und Fachbegriff nennt, was "invalid digit found in string" nicht kann. Der Verlust ist ebenso real: der Aufrufer kann "keine Zahl" nicht mehr von "außerhalb des Bereichs" unterscheiden und den Fehler nicht per match auswerten. Modul m5-04 holt das mit einem eigenen Fehlertyp zurück.

Beachte, dass sowohl `"http"` als auch `"70000"` an demselben Parsen scheitern - das eine ist keine Zahl, das andere passt nicht in ein `u16` - und ein `map_err` beides abdeckt.

## Signaturen, die eine Leihe tragen

```rust
pub fn first_line(text: &str) -> Result<&str, String>
```

Der Erfolgswert leiht von der Eingabe; der Fehler besitzt seine Meldung. Das ist eine normale und nützliche Form, und die Lifetime-Elision behandelt sie ohne Annotation - M6 erklärt, warum.

## Deine Aufgabe

Implementiere die vier Funktionen und begründe dann die von der Spezifikation verlangte Fehlermeldung. Der nächste Step entfernt den `match`-Rahmen.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo test --test m5-02-result
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** je Test eine Zeile `test … ok` oder `… FAILED`, danach die Zusammenfassung `test result: ok. 4 passed; 0 failed`, sobald du fertig bist.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

*Die drei Handgriffe sind in jedem Step dieses Kurses dieselben - Terminal öffnen, mit `cd` in die Crate wechseln, den Befehl ausführen. Nur die letzte Zeile unterscheidet sich, und die Fassung dieses Steps steht im Block darüber.*

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
