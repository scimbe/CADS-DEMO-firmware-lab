---
id: m5-01-panic-vs-result
title: "panic! ist für Programmfehler"
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
    check: { type: "predict", prompt: { en: "examples/m5_unwrap_panic.rs indexes a slice, calls get with an out-of-range index, and parses two strings with expect. Which line ends the program, what does the panic message say, and what is the process exit code?", de: "examples/m5_unwrap_panic.rs indiziert einen Slice, ruft get mit einem Index außerhalb des Bereichs auf und parst zwei Zeichenketten mit expect. Welche Zeile beendet das Programm, was sagt die Panic-Meldung, und wie lautet der Exit-Code des Prozesses?" }, then: { type: "command", command: "cargo run --quiet --example m5_unwrap_panic", seedMustFail: false, expectExitCode: 101, expectStderr: "not a valid port: ParseIntError \\{ kind: InvalidDigit \\}", timeoutMs: 120000 }, rubric: "Predicts that v.get(99) prints None without panicking, that the \"8080\" parse succeeds, and that the \"http\" parse is the line that panics, with the expect message followed by the Debug form of the error. Exit code 101 is the detail most predictions miss and is worth stating explicitly. Predicting a panic at v[1] or at get(99) is the wrong model to name.", bloom: "evaluate" }
  - id: panics
    title: "Die vier Funktionen stürzen dort ab, wo sie sollen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m5-01-panic-vs-result", expectPass: [ "m5_01_panic_vs_result::element_at_returns_the_element", "m5_01_panic_vs_result::element_at_panics_with_a_useful_message", "m5_01_panic_vs_result::element_at_opt_never_panics", "m5_01_panic_vs_result::parse_port_accepts_a_number", "m5_01_panic_vs_result::parse_port_panics_on_text", "m5_01_panic_vs_result::parse_port_panics_above_the_u16_range", "m5_01_panic_vs_result::average_of_a_non_empty_slice", "m5_01_panic_vs_result::average_of_nothing_panics" ], minPass: 8, timeoutMs: 180000 }
socratic:
  - { trigger: "task:guess:failed", question: { en: "Three of the four calls in that program succeed. Which one is the odd one out, and why?", de: "Drei der vier Aufrufe in diesem Programm gelingen. Welcher ist der Ausreisser, und warum?" }, hints: [ { en: "`v.get(99)` returns an Option rather than panicking, so it prints something instead of ending the program.", de: "`v.get(99)` liefert ein Option statt abzustürzen, gibt also etwas aus statt das Programm zu beenden." }, { en: "Two of the parses are the same call with different inputs. Ask which of the two inputs is a number a u16 can hold.", de: "Zwei der Parse-Aufrufe sind derselbe Aufruf mit verschiedenen Eingaben. Frage, welche der beiden Eingaben eine Zahl ist, die ein u16 halten kann." }, { en: "A panic does not exit with 1; the code it uses is fixed and is not 0, 1 or 2.", de: "Eine Panic beendet nicht mit 1; der verwendete Code ist fest und ist nicht 0, 1 oder 2." } ] }
  - { trigger: "task:panics:failed", question: { en: "Is a should_panic test failing because nothing panicked, or because the message did not contain the expected text?", de: "Scheitert ein should_panic-Test, weil nichts abgestürzt ist, oder weil die Meldung den erwarteten Text nicht enthielt?" }, hints: [ { en: "`#[should_panic(expected = \"...\")]` checks that the panic message *contains* that substring; the wording has to match.", de: "`#[should_panic(expected = \"...\")]` prüft, dass die Panic-Meldung diesen Teilstring *enthält*; der Wortlaut muss passen." }, { en: "`element_at` must build its message with the index and the length: `panic!(\"index {i} out of range (len {})\", v.len())`.", de: "`element_at` muss seine Meldung aus Index und Länge bauen: `panic!(\"index {i} out of range (len {})\", v.len())`." }, { en: "`parse_port_or_panic(\"70000\")` must panic too: 70000 does not fit in a u16, so the parse fails just as \"http\" does.", de: "`parse_port_or_panic(\"70000\")` muss ebenfalls abstürzen: 70000 passt nicht in ein u16, das Parsen scheitert also wie bei \"http\"." } ] }
misconceptions:
  - { pattern: "index out of bounds: the len is \\d+ but the index is \\d+", question: { en: "The default index panic fired instead of yours. Did you check the range before indexing, or index first and check afterwards?", de: "Die Standard-Panic der Indizierung hat ausgelöst statt deiner. Hast du den Bereich vor dem Indizieren geprüft oder erst indiziert und dann geprüft?" }, hints: [ { en: "The guard has to come first: compare `i` with `v.len()` before `v[i]` is evaluated.", de: "Die Absicherung muss zuerst kommen: vergleiche `i` mit `v.len()`, bevor `v[i]` ausgewertet wird." }, { en: "The test's expected substring is your message, not the standard library's.", de: "Der erwartete Teilstring des Tests ist deine Meldung, nicht die der Standardbibliothek." }, { en: "Your message must name the index and the length; the wording is fixed by the test.", de: "Deine Meldung muss Index und Länge nennen; den Wortlaut gibt der Test vor." } ] }
  - { pattern: "called `Option::unwrap\\(\\)` on a `None` value|called `Result::unwrap\\(\\)` on an `Err` value", question: { en: "An unwrap met the case it does not handle. Was that case genuinely impossible here, or did you assume it away?", de: "Ein unwrap ist auf den Fall getroffen, den es nicht behandelt. War dieser Fall hier wirklich unmöglich, oder hast du ihn wegangenommen?" }, hints: [ { en: "`expect(\"...\")` replaces the message with one that says what you assumed, which turns a mystery into a report.", de: "`expect(\"...\")` ersetzt die Meldung durch eine, die deine Annahme benennt, und macht aus einem Rätsel einen Bericht." }, { en: "If the case can actually occur at runtime, the answer is a `Result` and not an unwrap - that is the next step.", de: "Kann der Fall zur Laufzeit tatsächlich auftreten, lautet die Antwort `Result` und nicht unwrap - das ist der nächste Step." }, { en: "In this step only `parse_port_or_panic` is meant to panic; the other lookups return an Option.", de: "In diesem Step soll nur `parse_port_or_panic` abstürzen; die anderen Zugriffe liefern ein Option." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Entscheide, ob ein Fehlschlag ein Fehler in deinem Programm ist oder ein Zustand, den dein Aufrufer behandeln soll - und schreibe die Panic, die das deutlich sagt.

## Was eine Panic tut

`panic!` gibt eine Meldung samt Quellposition aus, wickelt den Stack ab und führt dabei jedes `drop` aus, und beendet den Prozess mit Code **101**. Es ist keine Ausnahme: in gewöhnlichem Code fängt sie niemand ab, und ein `try` gibt es nicht.

Panics kommen aus drei Quellen, und sie unterscheiden zu können lohnt sich:

```rust
panic!("index {i} out of range (len {})", v.len());   // deine, ausdrücklich
v[99]                                                  // die der Standardbibliothek
"http".parse::<u16>().expect("not a valid port")       // deine, über expect
```

## unwrap und expect

`unwrap()` auf einem `None` oder `Err` stürzt mit einer allgemeinen Meldung ab. `expect("…")` stürzt mit deiner ab, gefolgt von der `Debug`-Form des Fehlers:

```text
thread 'main' panicked at examples/m5_unwrap_panic.rs:12:35:
not a valid port: ParseIntError { kind: InvalidDigit }
```

Bevorzuge stets `expect`. Der Unterschied zwischen "called `Result::unwrap()` on an `Err` value" und "not a valid port" ist der Unterschied zwischen einem Rätsel um drei Uhr nachts und einem Bericht. Der Rat aus Kapitel 9 lautet, dass die Meldung sagen soll, *warum du den Fehlschlag für unmöglich hieltst*, nicht bloß, was fehlschlug.

## Wann eine Panic richtig ist

Stürze ab, wenn Weitermachen bedeutet, dass das Programm bereits falsch ist:

- eine verletzte Invariante - `average` eines leeren Slice hat keine Antwort, und `0` zurückzugeben verbärge den Fehler des Aufrufers;
- ein Index außerhalb des Bereichs, weil anderswo falsch gerechnet wurde;
- eine fest einkodierte Konfiguration, die nicht parst, wie in `parse_port_or_panic`, wo ein falscher Wert ein Tippfehler im Quelltext ist und keine Nutzereingabe.

Liefere ein `Result`, wenn ein Fehlschlag erwartbar ist: eine fehlende Datei, fehlerhafte Eingaben, ein ausgefallenes Netz. Das sind Zustände, keine Programmfehler, und der Aufrufer kann meist sinnvoll darauf reagieren.

Beachte, wie dieser Step die Funktionen paart. `element_at` stürzt ab; `element_at_opt` macht denselben Zugriff und liefert `Option`. Beide sind korrekt - es sind verschiedene Verträge, und eine Bibliothek bietet üblicherweise beide an.

## Eine Panic testen

```rust
#[test]
#[should_panic(expected = "index 5 out of range (len 3)")]
fn element_at_panics_with_a_useful_message() {
    element_at(&[1, 2, 3], 5);
}
```

Der Test besteht nur, wenn die Funktion abstürzt **und** die Meldung diesen Teilstring enthält. Damit wird die Meldung Teil des Vertrags, und dort gehört sie hin.

Eine Einzelheit lohnt sich zu wissen: cargo listet einen solchen Test als `test … - should panic ... ok` auf, mit der Markierung zwischen Name und Ergebnis. Alle vier Panic-Tests stehen im Check dieses Steps namentlich, samt Markierung.

## Deine Aufgabe

Sage das Beispiel vorher und implementiere dann die vier Funktionen so, dass jede genau dort und so abstürzt, wie die Tests es verlangen. Der nächste Step liefert Fehler zurück, statt das Programm zu beenden.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo run --quiet --example m5_unwrap_panic
cargo test --test m5-01-panic-vs-result
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** eine Compilerdiagnose und sonst nichts - diese Datei soll *nicht* übersetzen, der Fehler ist also das erwartete Ergebnis und nicht dein Fehler.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

*Die drei Handgriffe sind in jedem Step dieses Kurses dieselben - Terminal öffnen, mit `cd` in die Crate wechseln, den Befehl ausführen. Nur die letzte Zeile unterscheidet sich, und die Fassung dieses Steps steht im Block darüber.*

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
