---
id: m5-01-panic-vs-result
title: "panic! ist fuer Programmfehler"
bloom: understand
objectives: [ "rust-ch09-01-unrecoverable-errors-with-panic" ]
requires: [ "m4-04-collections-report" ]
estimatedMinutes: 20
scaffold: worked
recallFrom: [ "m4-01-vectors" ]
links:
  - { step: "m5-02-result" }
  - { file: "src/m5/m5_01_panic.rs" }
  - { file: "examples/m5_unwrap_panic.rs" }
  - { url: "https://doc.rust-lang.org/book/ch09-01-unrecoverable-errors-with-panic.html", title: "The Book, 9.1: Unrecoverable Errors with panic!" }
sources: [ "src/m5/m5_01_panic.rs", "tests/m5-01-panic-vs-result.rs", "examples/m5_unwrap_panic.rs" ]
tasks:
  - id: guess
    title: "Sage vorher, welche Zeile das Programm beendet"
    check: { type: "predict", prompt: { en: "examples/m5_unwrap_panic.rs indexes a slice, calls get with an out-of-range index, and parses two strings with expect. Which line ends the program, what does the panic message say, and what is the process exit code?", de: "examples/m5_unwrap_panic.rs indiziert einen Slice, ruft get mit einem Index ausserhalb des Bereichs auf und parst zwei Zeichenketten mit expect. Welche Zeile beendet das Programm, was sagt die Panic-Meldung, und wie lautet der Exit-Code des Prozesses?" }, then: { type: "command", command: "cargo run --quiet --example m5_unwrap_panic", expectExitCode: 101, expectStderr: "not a valid port: ParseIntError \\{ kind: InvalidDigit \\}", timeoutMs: 120000 }, rubric: "Predicts that v.get(99) prints None without panicking, that the \"8080\" parse succeeds, and that the \"http\" parse is the line that panics, with the expect message followed by the Debug form of the error. Exit code 101 is the detail most predictions miss and is worth stating explicitly. Predicting a panic at v[1] or at get(99) is the wrong model to name.", bloom: "evaluate" }
  - id: panics
    title: "Die vier Funktionen stuerzen dort ab, wo sie sollen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m5-01-panic-vs-result", expectPass: [ "m5_01_panic_vs_result::element_at_returns_the_element", "m5_01_panic_vs_result::element_at_panics_with_a_useful_message", "m5_01_panic_vs_result::element_at_opt_never_panics", "m5_01_panic_vs_result::parse_port_accepts_a_number", "m5_01_panic_vs_result::parse_port_panics_on_text", "m5_01_panic_vs_result::parse_port_panics_above_the_u16_range", "m5_01_panic_vs_result::average_of_a_non_empty_slice", "m5_01_panic_vs_result::average_of_nothing_panics" ], minPass: 8, timeoutMs: 180000 }
socratic:
  - { trigger: "task:panics:failed", question: { en: "Is a should_panic test failing because nothing panicked, or because the message did not contain the expected text?", de: "Scheitert ein should_panic-Test, weil nichts abgestuerzt ist, oder weil die Meldung den erwarteten Text nicht enthielt?" }, hints: [ { en: "`#[should_panic(expected = \"...\")]` checks that the panic message *contains* that substring; the wording has to match.", de: "`#[should_panic(expected = \"...\")]` prueft, dass die Panic-Meldung diesen Teilstring *enthaelt*; der Wortlaut muss passen." }, { en: "`element_at` must build its message with the index and the length: `panic!(\"index {i} out of range (len {})\", v.len())`.", de: "`element_at` muss seine Meldung aus Index und Laenge bauen: `panic!(\"index {i} out of range (len {})\", v.len())`." }, { en: "`parse_port_or_panic(\"70000\")` must panic too: 70000 does not fit in a u16, so the parse fails just as \"http\" does.", de: "`parse_port_or_panic(\"70000\")` muss ebenfalls abstuerzen: 70000 passt nicht in ein u16, das Parsen scheitert also wie bei \"http\"." } ] }
misconceptions:
  - { pattern: "index out of bounds: the len is \\d+ but the index is \\d+", question: { en: "The default index panic fired instead of yours. Did you check the range before indexing, or index first and check afterwards?", de: "Die Standard-Panic der Indizierung hat ausgeloest statt deiner. Hast du den Bereich vor dem Indizieren geprueft oder erst indiziert und dann geprueft?" }, hints: [ { en: "The guard has to come first: compare `i` with `v.len()` before `v[i]` is evaluated.", de: "Die Absicherung muss zuerst kommen: vergleiche `i` mit `v.len()`, bevor `v[i]` ausgewertet wird." }, { en: "The test's expected substring is your message, not the standard library's.", de: "Der erwartete Teilstring des Tests ist deine Meldung, nicht die der Standardbibliothek." }, { en: "Your message must name the index and the length; the wording is fixed by the test.", de: "Deine Meldung muss Index und Laenge nennen; den Wortlaut gibt der Test vor." } ] }
  - { pattern: "called `Option::unwrap\\(\\)` on a `None` value|called `Result::unwrap\\(\\)` on an `Err` value", question: { en: "An unwrap met the case it does not handle. Was that case genuinely impossible here, or did you assume it away?", de: "Ein unwrap ist auf den Fall getroffen, den es nicht behandelt. War dieser Fall hier wirklich unmoeglich, oder hast du ihn wegangenommen?" }, hints: [ { en: "`expect(\"...\")` replaces the message with one that says what you assumed, which turns a mystery into a report.", de: "`expect(\"...\")` ersetzt die Meldung durch eine, die deine Annahme benennt, und macht aus einem Raetsel einen Bericht." }, { en: "If the case can actually occur at runtime, the answer is a `Result` and not an unwrap - that is the next step.", de: "Kann der Fall zur Laufzeit tatsaechlich auftreten, lautet die Antwort `Result` und nicht unwrap - das ist der naechste Step." }, { en: "In this step only `parse_port_or_panic` is meant to panic; the other lookups return an Option.", de: "In diesem Step soll nur `parse_port_or_panic` abstuerzen; die anderen Zugriffe liefern ein Option." } ] }
---
## Lernziel

Entscheide, ob ein Fehlschlag ein Fehler in deinem Programm ist oder ein Zustand, den dein Aufrufer behandeln soll - und schreibe die Panic, die das deutlich sagt.

## Was eine Panic tut

`panic!` gibt eine Meldung samt Quellposition aus, wickelt den Stack ab und fuehrt dabei jedes `drop` aus, und beendet den Prozess mit Code **101**. Es ist keine Ausnahme: in gewoehnlichem Code faengt sie niemand ab, und ein `try` gibt es nicht.

Panics kommen aus drei Quellen, und sie unterscheiden zu koennen lohnt sich:

```rust
panic!("index {i} out of range (len {})", v.len());   // deine, ausdruecklich
v[99]                                                  // die der Standardbibliothek
"http".parse::<u16>().expect("not a valid port")       // deine, ueber expect
```

## unwrap und expect

`unwrap()` auf einem `None` oder `Err` stuerzt mit einer allgemeinen Meldung ab. `expect("…")` stuerzt mit deiner ab, gefolgt von der `Debug`-Form des Fehlers:

```text
thread 'main' panicked at examples/m5_unwrap_panic.rs:12:35:
not a valid port: ParseIntError { kind: InvalidDigit }
```

Bevorzuge stets `expect`. Der Unterschied zwischen "called `Result::unwrap()` on an `Err` value" und "not a valid port" ist der Unterschied zwischen einem Raetsel um drei Uhr nachts und einem Bericht. Der Rat aus Kapitel 9 lautet, dass die Meldung sagen soll, *warum du den Fehlschlag fuer unmoeglich hieltst*, nicht bloss, was fehlschlug.

## Wann eine Panic richtig ist

Stuerze ab, wenn Weitermachen bedeutet, dass das Programm bereits falsch ist:

- eine verletzte Invariante - `average` eines leeren Slice hat keine Antwort, und `0` zurueckzugeben verbaerge den Fehler des Aufrufers;
- ein Index ausserhalb des Bereichs, weil anderswo falsch gerechnet wurde;
- eine fest einkodierte Konfiguration, die nicht parst, wie in `parse_port_or_panic`, wo ein falscher Wert ein Tippfehler im Quelltext ist und keine Nutzereingabe.

Liefere ein `Result`, wenn ein Fehlschlag erwartbar ist: eine fehlende Datei, fehlerhafte Eingaben, ein ausgefallenes Netz. Das sind Zustaende, keine Programmfehler, und der Aufrufer kann meist sinnvoll darauf reagieren.

Beachte, wie dieser Step die Funktionen paart. `element_at` stuerzt ab; `element_at_opt` macht denselben Zugriff und liefert `Option`. Beide sind korrekt - es sind verschiedene Vertraege, und eine Bibliothek bietet ueblicherweise beide an.

## Eine Panic testen

```rust
#[test]
#[should_panic(expected = "index 5 out of range (len 3)")]
fn element_at_panics_with_a_useful_message() {
    element_at(&[1, 2, 3], 5);
}
```

Der Test besteht nur, wenn die Funktion abstuerzt **und** die Meldung diesen Teilstring enthaelt. Damit wird die Meldung Teil des Vertrags, und dort gehoert sie hin.

## Deine Aufgabe

Sage das Beispiel vorher und implementiere dann die vier Funktionen so, dass jede genau dort und so abstuerzt, wie die Tests es verlangen. Der naechste Step liefert Fehler zurueck, statt das Programm zu beenden.
