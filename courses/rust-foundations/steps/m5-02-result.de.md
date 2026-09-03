---
id: m5-02-result
title: "Result: Fehlschlag im Rueckgabetyp"
bloom: apply
objectives: [ "rust-ch09-02-recoverable-errors-with-result" ]
requires: [ "m5-01-panic-vs-result" ]
estimatedMinutes: 20
scaffold: worked
recallFrom: [ "m5-01-panic-vs-result", "m3-03-match" ]
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
    check: { type: "question", prompt: { en: "parse_port is specified to report \"'http' is not a valid port\" rather than passing on the parser's own \"invalid digit found in string\". Argue for that choice from the point of view of whoever reads the message, and name the cost of discarding the original error.", de: "parse_port soll \"'http' is not a valid port\" melden statt die eigene Meldung des Parsers \"invalid digit found in string\" durchzureichen. Begruende diese Entscheidung aus Sicht dessen, der die Meldung liest, und nenne den Preis dafuer, den urspruenglichen Fehler zu verwerfen." }, rubric: "Argues that the message should name the offending input and the domain concept (a port), which the parser's generic message cannot, and that this is what lets a user fix their configuration. Names the cost honestly: the original error is thrown away, so the caller can no longer distinguish 'not a number' from 'out of range for u16', and cannot match on the error programmatically - which is what a custom error type in m5-04 restores.", bloom: "evaluate", minChars: 70 }
socratic:
  - { trigger: "task:result:failed", question: { en: "Which one fails? For `parse_port`, is the failing case the text input or the number that is too large - and does your message quote the input exactly?", de: "Welche scheitert? Ist bei `parse_port` der scheiternde Fall die Texteingabe oder die zu grosse Zahl - und zitiert deine Meldung die Eingabe genau?" }, hints: [ { en: "`s.parse::<u16>()` fails for both \"http\" and \"70000\", so one `map_err` covers both.", de: "`s.parse::<u16>()` scheitert sowohl bei \"http\" als auch bei \"70000\", ein `map_err` deckt also beides ab." }, { en: "The message has single quotes around the input: `format!(\"'{s}' is not a valid port\")`.", de: "Die Meldung setzt die Eingabe in einfache Anfuehrungszeichen: `format!(\"'{s}' is not a valid port\")`." }, { en: "`text.lines().next()` gives the first line without its newline and `None` for the empty string.", de: "`text.lines().next()` liefert die erste Zeile ohne Zeilenumbruch und `None` fuer die leere Zeichenkette." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Is the mismatch a bare value where a Result was promised, or a Result where a bare value was expected?", de: "Ist der Konflikt ein blanker Wert, wo ein Result versprochen war, oder ein Result, wo ein blanker Wert erwartet wurde?" }, hints: [ { en: "A function returning `Result<u16, String>` must return `Ok(port)`, never a bare `port`.", de: "Eine Funktion mit Rueckgabetyp `Result<u16, String>` muss `Ok(port)` liefern, nie ein blankes `port`." }, { en: "`Err` takes a `String` here, so `Err(\"…\")` with a literal is a `&str` and does not fit; use `String::from` or `format!`.", de: "`Err` nimmt hier einen `String`; `Err(\"…\")` mit einem Literal ist ein `&str` und passt nicht - nutze `String::from` oder `format!`." }, { en: "`sum_ports` returns `u32` while `parse_port` gives `u16`: convert with `u32::from(port)`.", de: "`sum_ports` liefert `u32`, `parse_port` aber `u16`: wandle mit `u32::from(port)` um." } ] }
  - { pattern: "error\\[E0599\\]: no method named `unwrap`|unused `Result` that must be used", question: { en: "A Result is being ignored or unwrapped where the function should pass it on. What is this function's contract on failure?", de: "Ein Result wird ignoriert oder ausgepackt, wo die Funktion es weiterreichen sollte. Wie lautet der Vertrag dieser Funktion im Fehlerfall?" }, hints: [ { en: "`sum_ports` must return the first error, not unwrap it - unwrapping would panic and break the contract.", de: "`sum_ports` muss den ersten Fehler zurueckgeben, nicht auspacken - Auspacken stuerzte ab und braeche den Vertrag." }, { en: "A `match` with an `Err(e) => return Err(e)` arm is the explicit form; the next step shortens it.", de: "Ein `match` mit einem Zweig `Err(e) => return Err(e)` ist die ausdrueckliche Form; der naechste Step kuerzt sie." }, { en: "`Result` is marked must_use, so ignoring one is a warning by design.", de: "`Result` ist als must_use markiert, es zu ignorieren ist also absichtlich eine Warnung." } ] }
---
## Lernziel

Bringe den Fehlschlag in den Rueckgabetyp einer Funktion, sodass der Aufrufer ihn nicht ignorieren kann - und schreibe eine Fehlermeldung, die es wert ist, gelesen zu werden.

## Der Typ

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

Ein gewoehnliches Enum, ueberall sichtbar. `T` ist der Erfolgswert, `E` der Fehler. Es ist mit `#[must_use]` markiert, ein Ignorieren ist also eine Warnung: der Compiler laesst einen Fehlschlag nicht stillschweigend durch.

## Es lesen

`match` ist die ausdrueckliche Form und der Ausgangspunkt:

```rust
match parse_port(entry) {
    Ok(port) => total += u32::from(port),
    Err(e) => return Err(e),
}
```

Dieser Zweig `Err(e) => return Err(e)` ist die gesamte Fehlerbehandlung von `sum_ports`, und er taucht in fast jeder Funktion auf, die eine fehlbare aufruft. Der naechste Step ersetzt ihn durch ein einzelnes Zeichen - aber ihn einmal auszuschreiben macht dieses Zeichen danach lesbar.

## Einen Fehler in einen anderen wandeln

`s.parse::<u16>()` liefert `Result<u16, ParseIntError>`. `parse_port` verspricht `Result<u16, String>`, der Fehler muss also umgewandelt werden:

```rust
s.parse::<u16>().map_err(|_| format!("'{s}' is not a valid port"))
```

`map_err` wandelt den Fehler und laesst `Ok` unberuehrt. Der Closure ignoriert hier den urspruenglichen Fehler, was ein bewusster Handel und Gegenstand der Frageaufgabe ist. Der Gewinn ist eine Meldung, die Eingabe und Fachbegriff nennt, was "invalid digit found in string" nicht kann. Der Verlust ist ebenso real: der Aufrufer kann "keine Zahl" nicht mehr von "ausserhalb des Bereichs" unterscheiden und den Fehler nicht per match auswerten. Modul m5-04 holt das mit einem eigenen Fehlertyp zurueck.

Beachte, dass sowohl `"http"` als auch `"70000"` an demselben Parsen scheitern - das eine ist keine Zahl, das andere passt nicht in ein `u16` - und ein `map_err` beides abdeckt.

## Signaturen, die eine Leihe tragen

```rust
pub fn first_line(text: &str) -> Result<&str, String>
```

Der Erfolgswert leiht von der Eingabe; der Fehler besitzt seine Meldung. Das ist eine normale und nuetzliche Form, und die Lifetime-Elision behandelt sie ohne Annotation - M6 erklaert, warum.

## Deine Aufgabe

Implementiere die vier Funktionen und begruende dann die von der Spezifikation verlangte Fehlermeldung. Der naechste Step entfernt den `match`-Rahmen.
