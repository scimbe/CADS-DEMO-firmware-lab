---
id: m5-04-custom-error
title: "Ein eigener Fehlertyp"
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
    title: "Der eigene Fehlertyp verhält sich richtig"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m5-04-custom-error", expectPass: [ "m5_04_custom_error::parse_config_reads_pairs", "m5_04_custom_error::a_line_without_equals_is_a_syntax_error", "m5_04_custom_error::the_question_mark_converts_the_parse_error", "m5_04_custom_error::display_is_readable", "m5_04_custom_error::config_error_is_a_std_error", "m5_04_custom_error::config_get_separates_absent_from_broken" ], minPass: 6, timeoutMs: 180000 }
  - id: absent
    title: "Du kannst Ok(None) gegen Err verteidigen"
    check: { type: "question", prompt: { en: "config_get returns Ok(None) for a key that is absent and Err only for a broken file. Argue why 'not there' is not an error here, and describe a caller for whom that decision would be wrong - and what you would change for them.", de: "config_get liefert Ok(None) für einen fehlenden Schlüssel und Err nur für eine kaputte Datei. Begründe, warum 'nicht vorhanden' hier kein Fehler ist, und beschreibe einen Aufrufer, für den diese Entscheidung falsch wäre - und was du für ihn ändern würdest." }, rubric: "Argues that an absent optional key is an expected state with an obvious response (use a default), while a malformed file means the caller cannot trust any of the data, so the two deserve different types; conflating them would force every caller to inspect an error to find out whether anything is actually wrong. The counter-case should be a caller for which the key is mandatory, and the change should be concrete - a separate require_key returning Err(Missing(key)), or a MissingKey variant used by that entry point. Does not pass: a counter-case that is not a caller (a different file format, a stricter language), or a change that is only stricter validation rather than a distinguishable return.", bloom: "evaluate", minChars: 80 }
socratic:
  - { trigger: "task:absent:failed", question: { en: "Two callers ask for the same key. For which of them is a missing key a normal Tuesday?", de: "Zwei Aufrufer fragen nach demselben Schlüssel. Für welchen davon ist ein fehlender Schlüssel ein ganz normaler Tag?" }, hints: [ { en: "A caller with a sensible default has an obvious response to absence and nothing to report.", de: "Ein Aufrufer mit einer sinnvollen Vorgabe hat auf Abwesenheit eine naheliegende Antwort und nichts zu melden." }, { en: "Now ask what a broken file means for every other key in it - that is why the two cases get different types.", de: "Frage nun, was eine kaputte Datei für jeden anderen Schlüssel darin bedeutet - deshalb erhalten die beiden Fälle verschiedene Typen." }, { en: "For the counter-case, find a key with no possible default; the change is then a second entry point or a variant that names the missing key.", de: "Suche für den Gegenfall einen Schlüssel ohne mögliche Vorgabe; die Änderung ist dann ein zweiter Einstiegspunkt oder eine Variante, die den fehlenden Schlüssel nennt." } ] }
  - { trigger: "task:custom:failed", question: { en: "Which test fails? If it is the_question_mark_converts_the_parse_error, is your From impl carrying the parser's own message, or one of your own?", de: "Welcher Test scheitert? Ist es the_question_mark_converts_the_parse_error: trägt dein From-Impl die Meldung des Parsers oder eine eigene?" }, hints: [ { en: "`ConfigError::NotANumber(e.to_string())` stores the parser's message, which for a non-numeric value is exactly \"invalid digit found in string\".", de: "`ConfigError::NotANumber(e.to_string())` speichert die Meldung des Parsers, die bei einem nicht-numerischen Wert genau \"invalid digit found in string\" lautet." }, { en: "`Display` must produce `syntax error in line: a b` and `not a number: <message>`; the test compares the strings exactly.", de: "`Display` muss `syntax error in line: a b` und `not a number: <Meldung>` erzeugen; der Test vergleicht die Zeichenketten genau." }, { en: "`split_once('=')` gives the two halves; trim both, and remember to trim the whole line before checking whether it is empty.", de: "`split_once('=')` liefert beide Hälften; entferne bei beiden den Leerraum, und trimme die ganze Zeile, bevor du sie auf Leere prüfst." } ] }
misconceptions:
  - { pattern: "error\\[E0277\\].*`.*` doesn't implement `std::fmt::Display`|the trait bound `.*: std::error::Error` is not satisfied", question: { en: "Something needs your type to be printable or to be a standard error. Which trait is missing, and what does the standard Error trait require before you may implement it?", de: "Etwas verlangt, dass dein Typ druckbar oder ein Standardfehler ist. Welches Trait fehlt, und was verlangt das Standard-Error-Trait, bevor du es implementieren darfst?" }, hints: [ { en: "`std::error::Error` requires both `Debug` and `Display`; `Debug` comes from the derive, `Display` you write.", de: "`std::error::Error` verlangt sowohl `Debug` als auch `Display`; `Debug` liefert das derive, `Display` schreibst du." }, { en: "`impl std::error::Error for ConfigError {}` needs no body once those two are in place.", de: "`impl std::error::Error for ConfigError {}` braucht keinen Rumpf, sobald die beiden vorhanden sind." }, { en: "`Display::fmt` writes into the formatter: `write!(f, \"…\")`, and returns its result.", de: "`Display::fmt` schreibt in den Formatter: `write!(f, \"…\")`, und liefert dessen Ergebnis." } ] }
  - { pattern: "the trait bound `.*: From<.*>` is not satisfied|`\\?` couldn't convert the error", question: { en: "? has no route from the parser's error to yours. Is the From impl missing, or does it convert into a different type than the function returns?", de: "? findet keinen Weg vom Fehler des Parsers zu deinem. Fehlt das From-Impl, oder wandelt es in einen anderen Typ, als die Funktion liefert?" }, hints: [ { en: "`impl From<ParseIntError> for ConfigError` is what makes `value.trim().parse()?` compile inside this function.", de: "`impl From<ParseIntError> for ConfigError` ist es, was `value.trim().parse()?` in dieser Funktion übersetzbar macht." }, { en: "The annotation on the binding (`let number: i64 = …`) tells `parse` which type to produce, and thus which error to make.", de: "Die Annotation an der Bindung (`let number: i64 = …`) sagt `parse`, welchen Typ es erzeugen soll, und damit welchen Fehler." }, { en: "The test requires the conversion to happen through `?`, so a hand-written `map_err` here would miss the point even if it passed.", de: "Der Test verlangt die Umwandlung über `?`; ein selbst geschriebenes `map_err` verfehlte hier also den Punkt, selbst wenn es bestünde." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Definiere einen Fehlertyp für dein Modul, lass `?` automatisch dorthin wandeln und entscheide, was überhaupt ein Fehler sein soll.

## Warum nicht einfach `String`

`Result<T, String>` hat m5-02 benutzt, und für eine kleine Funktion ist das in Ordnung. Es hört auf, in Ordnung zu sein, sobald ein Aufrufer je nach Fehlschlag etwas anderes *tun* will: ein `String` lässt sich ausgeben und sonst nichts. Ein Enum lässt sich matchen.

```rust
pub enum ConfigError {
    Syntax(String),
    NotANumber(String),
}
```

Zwei Varianten, jede mit dem Kontext, den ein Leser braucht. Ein Aufrufer kann nun sagen: "ein Syntaxfehler heißt, zeige die Zeile; eine falsche Zahl heißt, nimm die Vorgabe" - was keine Zeichenkette erlaubt.

## Die drei Impls, die daraus einen echten Fehler machen

**`Debug`** kommt aus `#[derive(Debug)]`. Es ist, was `unwrap` ausgibt und was `{:?}` zeigt.

**`Display`** ist, was ein Nutzer sieht, und du schreibst es:

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

`write!` schreibt in den Formatter und liefert das Ergebnis, das das Trait erwartet. `Display` zu implementieren liefert dir außerdem `.to_string()` kostenlos.

**`std::error::Error`** verlangt genau `Debug` und `Display`, mit beiden vorhanden ist die Implementierung also leer:

```rust
impl std::error::Error for ConfigError {}
```

Diese eine Zeile ermöglicht es, dass ein `ConfigError` in ein `Box<dyn Error>` passt und durch Code nach oben reist, der dein Modul nicht kennt - der Test `config_error_is_a_std_error` prüft genau das.

## Das From-Impl holt `?` zurück

```rust
impl From<ParseIntError> for ConfigError {
    fn from(e: ParseIntError) -> Self {
        ConfigError::NotANumber(e.to_string())
    }
}
```

Einmal geschrieben, lässt es jedes `?` in einer Funktion mit Rückgabetyp `Result<_, ConfigError>` einen Parse-Fehlschlag automatisch wandeln. In `parse_config` lautet die Zeile schlicht:

```rust
let number: i64 = value.trim().parse()?;
```

Kein `map_err` an irgendeiner Aufrufstelle. Das ist das Muster, das der `?`-Abschnitt des Kapitels beschreibt, und der Grund, warum `?` skaliert: die Umwandlung liegt beim Typ, nicht bei jeder Verwendung.

Beachte, dass `e.to_string()` den Wortlaut des Parsers speichert, `invalid digit found in string`. Der Test sichert genau diesen Text zu, was den Kurs ehrlich hält - es ist, was die Standardbibliothek auf dieser Maschine tatsächlich erzeugt, und nichts für die Übung Erfundenes.

## Nicht alles ist ein Fehler

`config_get` liefert `Ok(None)` für einen fehlenden Schlüssel und `Err` nur, wenn die Datei selbst kaputt ist. Zwei Rückgabewerte für zwei Lagen - und ob das die richtige Entscheidung ist und für wen sie die falsche wäre, fragt dieser Step.

## Deine Aufgabe

Implementiere `Display`, das `From`-Impl, `parse_config` und `config_get`, verteidige dann die `Ok(None)`-Entscheidung und nenne einen Aufrufer, für den sie falsch wäre. Modul M6 ist das letzte vor dem Projekt.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo test --test m5-04-custom-error
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** je Test eine Zeile `test … ok` oder `… FAILED`, danach die Zusammenfassung `test result: ok. 6 passed; 0 failed`, sobald du fertig bist.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

*Die drei Handgriffe sind in jedem Step dieses Kurses dieselben - Terminal öffnen, mit `cd` in die Crate wechseln, den Befehl ausführen. Nur die letzte Zeile unterscheidet sich, und die Fassung dieses Steps steht im Block darüber.*

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
