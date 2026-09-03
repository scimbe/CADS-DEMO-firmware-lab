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
    check: { type: "question", prompt: { en: "config_get returns Ok(None) for a key that is absent and Err only for a broken file. Argue why 'not there' is not an error here, and describe a caller for whom that decision would be wrong - and what you would change for them.", de: "config_get liefert Ok(None) für einen fehlenden Schlüssel und Err nur für eine kaputte Datei. Begründe, warum 'nicht vorhanden' hier kein Fehler ist, und beschreibe einen Aufrufer, für den diese Entscheidung falsch wäre - und was du für ihn ändern würdest." }, rubric: "Argues that an absent optional key is an expected state with an obvious response (use a default), while a malformed file means the caller cannot trust any of the data, so the two deserve different types; conflating them would force every caller to inspect an error to find out whether anything is actually wrong. The counter-case should be a caller for which the key is mandatory, and the change should be concrete - a separate require_key returning Err(Missing(key)), or a MissingKey variant used by that entry point.", bloom: "evaluate", minChars: 80 }
socratic:
  - { trigger: "task:custom:failed", question: { en: "Which test fails? If it is the_question_mark_converts_the_parse_error, is your From impl carrying the parser's own message, or one of your own?", de: "Welcher Test scheitert? Ist es the_question_mark_converts_the_parse_error: trägt dein From-Impl die Meldung des Parsers oder eine eigene?" }, hints: [ { en: "`ConfigError::NotANumber(e.to_string())` stores the parser's message, which for a non-numeric value is exactly \"invalid digit found in string\".", de: "`ConfigError::NotANumber(e.to_string())` speichert die Meldung des Parsers, die bei einem nicht-numerischen Wert genau \"invalid digit found in string\" lautet." }, { en: "`Display` must produce `syntax error in line: a b` and `not a number: <message>`; the test compares the strings exactly.", de: "`Display` muss `syntax error in line: a b` und `not a number: <Meldung>` erzeugen; der Test vergleicht die Zeichenketten genau." }, { en: "`split_once('=')` gives the two halves; trim both, and remember to trim the whole line before checking whether it is empty.", de: "`split_once('=')` liefert beide Hälften; entferne bei beiden den Leerraum, und trimme die ganze Zeile, bevor du sie auf Leere prüfst." } ] }
misconceptions:
  - { pattern: "error\\[E0277\\].*`.*` doesn't implement `std::fmt::Display`|the trait bound `.*: std::error::Error` is not satisfied", question: { en: "Something needs your type to be printable or to be a standard error. Which trait is missing, and what does the standard Error trait require before you may implement it?", de: "Etwas verlangt, dass dein Typ druckbar oder ein Standardfehler ist. Welches Trait fehlt, und was verlangt das Standard-Error-Trait, bevor du es implementieren darfst?" }, hints: [ { en: "`std::error::Error` requires both `Debug` and `Display`; `Debug` comes from the derive, `Display` you write.", de: "`std::error::Error` verlangt sowohl `Debug` als auch `Display`; `Debug` liefert das derive, `Display` schreibst du." }, { en: "`impl std::error::Error for ConfigError {}` needs no body once those two are in place.", de: "`impl std::error::Error for ConfigError {}` braucht keinen Rumpf, sobald die beiden vorhanden sind." }, { en: "`Display::fmt` writes into the formatter: `write!(f, \"…\")`, and returns its result.", de: "`Display::fmt` schreibt in den Formatter: `write!(f, \"…\")`, und liefert dessen Ergebnis." } ] }
  - { pattern: "the trait bound `.*: From<.*>` is not satisfied|`\\?` couldn't convert the error", question: { en: "? has no route from the parser's error to yours. Is the From impl missing, or does it convert into a different type than the function returns?", de: "? findet keinen Weg vom Fehler des Parsers zu deinem. Fehlt das From-Impl, oder wandelt es in einen anderen Typ, als die Funktion liefert?" }, hints: [ { en: "`impl From<ParseIntError> for ConfigError` is what makes `value.trim().parse()?` compile inside this function.", de: "`impl From<ParseIntError> for ConfigError` ist es, was `value.trim().parse()?` in dieser Funktion übersetzbar macht." }, { en: "The annotation on the binding (`let number: i64 = …`) tells `parse` which type to produce, and thus which error to make.", de: "Die Annotation an der Bindung (`let number: i64 = …`) sagt `parse`, welchen Typ es erzeugen soll, und damit welchen Fehler." }, { en: "The test requires the conversion to happen through `?`, so a hand-written `map_err` here would miss the point even if it passed.", de: "Der Test verlangt die Umwandlung über `?`; ein selbst geschriebenes `map_err` verfehlte hier also den Punkt, selbst wenn es bestünde." } ] }
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

`config_get` liefert `Ok(None)` für einen fehlenden Schlüssel und `Err` nur, wenn die Datei selbst kaputt ist. Das sind wirklich verschiedene Lagen: ein fehlender optionaler Schlüssel hat eine naheliegende Antwort, eine fehlerhafte Datei bedeutet, dass keinem Datum zu trauen ist. Beides zusammenzulegen zwänge jeden Aufrufer, einen Fehler zu untersuchen, nur um herauszufinden, ob überhaupt etwas nicht stimmt.

## Deine Aufgabe

Implementiere `Display`, das `From`-Impl, `parse_config` und `config_get`, verteidige dann die `Ok(None)`-Entscheidung und nenne einen Aufrufer, für den sie falsch wäre. Modul M6 ist das letzte vor dem Projekt.
