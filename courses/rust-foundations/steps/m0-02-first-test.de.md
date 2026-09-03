---
id: m0-02-first-test
title: "Einen Test lesen, dann bestehen lassen"
bloom: apply
objectives: [ "rust-tooling-cargo" ]
requires: [ "m0-01-welcome" ]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: "m0-03-predict-output" }
  - { file: "src/m0/m0_02_first_test.rs" }
  - { file: "tests/m0-02-first-test.rs" }
  - { url: "https://doc.rust-lang.org/book/ch11-01-writing-tests.html", title: "The Book, 11.1: How to Write Tests" }
sources: [ "src/m0/m0_02_first_test.rs", "tests/m0-02-first-test.rs", "README.md" ]
tasks:
  - id: greet
    title: "greet() liefert die Begruessung"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m0-02-first-test", expectPass: [ "m0_02_first_test::adds_two_numbers", "m0_02_first_test::greets_by_name", "m0_02_first_test::greets_any_name" ], minPass: 3, timeoutMs: 180000 }
  - id: read-the-test
    title: "Du kannst sagen, was der Test verlangt"
    check: { type: "question", prompt: { en: "The test greets_any_name asserts greet(\"\") == \"Hello, !\". What does that single assertion tell you about how greet must be written, and what would break if you had special-cased the empty name?", de: "Der Test greets_any_name verlangt greet(\"\") == \"Hello, !\". Was sagt dir diese eine Zusicherung darueber, wie greet geschrieben sein muss, und was ginge kaputt, wenn du den leeren Namen gesondert behandelt haettest?" }, rubric: "States that greet must interpolate the name unconditionally - format!(\"Hello, {name}!\") - with no branch on emptiness, and that a special case for \"\" would return something other than \"Hello, !\" and fail that assertion. Credit for noticing the test pins the exact punctuation and spacing.", bloom: "understand", minChars: 40 }
socratic:
  - { trigger: "task:greet:failed", question: { en: "The test says `not yet implemented`. Which file and line does the panic message point at, and is that the file you edited?", de: "Der Test meldet `not yet implemented`. Auf welche Datei und Zeile zeigt die Panic-Meldung, und ist das die Datei, die du bearbeitet hast?" }, hints: [ { en: "A `todo!()` panic prints the exact source location; open that file at that line and replace the macro with real code.", de: "Eine `todo!()`-Panic gibt die genaue Quellposition aus; oeffne diese Datei an dieser Zeile und ersetze das Makro durch echten Code." }, { en: "The last expression of a function body, written without a semicolon, is its return value - `format!(\"…\")` on its own line, no `return` needed.", de: "Der letzte Ausdruck eines Funktionsrumpfs ohne Semikolon ist der Rueckgabewert - `format!(\"…\")` allein in der Zeile, ohne `return`." }, { en: "`format!` builds a String from a template; a name in braces is substituted: compare the pattern with the `println!` in the module documentation.", de: "`format!` baut einen String aus einer Vorlage; ein Name in geschweiften Klammern wird eingesetzt: vergleiche das Muster mit dem `println!` in der Moduldokumentation." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "The compiler says the types do not match. Which type does the signature promise, and which type does your expression actually produce?", de: "Der Compiler sagt, die Typen passen nicht. Welchen Typ verspricht die Signatur, und welchen Typ liefert dein Ausdruck tatsaechlich?" }, hints: [ { en: "Read the two lines after `expected`/`found`: they name both types.", de: "Lies die beiden Zeilen nach `expected`/`found`: sie nennen beide Typen." }, { en: "A literal in quotes is a `&str`; the signature promises an owned `String`.", de: "Ein Literal in Anfuehrungszeichen ist ein `&str`; die Signatur verspricht ein besitzendes `String`." }, { en: "`format!` already returns a `String`; `\"Hello, \" + name` does not.", de: "`format!` liefert bereits ein `String`; `\"Hello, \" + name` nicht." } ] }
  - { pattern: "not yet implemented", question: { en: "A `todo!()` is still in the path the test takes. Which function did the test reach that you have not written yet?", de: "Ein `todo!()` liegt noch auf dem Weg, den der Test nimmt. Welche Funktion hat der Test erreicht, die du noch nicht geschrieben hast?" }, hints: [ { en: "The panic line names the file and line of the remaining `todo!()`.", de: "Die Panic-Zeile nennt Datei und Zeile des verbliebenen `todo!()`." }, { en: "Only `greet` is yours in this step; `add` is already complete and shows the shape.", de: "In diesem Step gehoert nur `greet` dir; `add` ist fertig und zeigt die Form." }, { en: "Delete the whole `todo!(...)` call, including its message, and put the expression in its place.", de: "Loesche den gesamten `todo!(...)`-Aufruf samt Meldung und setze den Ausdruck an seine Stelle." } ] }
---
## Lernziel

Lies einen Rust-Test als Spezifikation und schreibe die eine Funktion, die ihn erfuellt - und sieh die Meldung von `not yet implemented` zu `ok` wechseln.

## Der Test ist die Spezifikation

Oeffne `tests/m0-02-first-test.rs`. Er ist kurz, und jede Zeile ist eine Forderung:

```rust
#[test]
fn greets_by_name() {
    assert_eq!(greet("Ada"), "Hello, Ada!");
}

#[test]
fn greets_any_name() {
    assert_eq!(greet("Rust"), "Hello, Rust!");
    assert_eq!(greet(""), "Hello, !");
}
```

`#[test]` markiert eine Funktion, die der Testlaeufer aufrufen soll. `assert_eq!` vergleicht zwei Werte und gibt bei Abweichung beide aus - `left` ist, was dein Code lieferte, `right` das Erwartete. Nichts davon ist verhandelbar: Komma, Leerzeichen und Ausrufezeichen gehoeren zum Vertrag, und der Fall des leeren Namens ebenso.

## Das vorgemachte Beispiel neben deinem

`src/m0/m0_02_first_test.rs` enthaelt zwei Funktionen. Die erste ist fertig und dient als Vorlage:

```rust
/// Returns the sum of `a` and `b`.
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

Vier Dinge daran. `pub` macht die Funktion ausserhalb ihres Moduls sichtbar, was der Test braucht. Jeder Parameter traegt einen Typ; in einer Signatur leitet Rust nie einen her. Der Rueckgabetyp steht hinter `->`. Und der letzte Ausdruck des Rumpfs, **ohne Semikolon** geschrieben, ist der Rueckgabewert - `a + b`, nicht `return a + b;`. Setzt du das Semikolon, wird aus dem Ausdruck eine Anweisung, die Funktion liefert `()`, und du erhaeltst Fehler E0308.

Die zweite Funktion gehoert dir:

```rust
/// Returns `"Hello, <name>!"` - for `greet("Ada")` that is `"Hello, Ada!"`.
pub fn greet(name: &str) -> String {
    todo!("build the greeting with format!")
}
```

`&str` ist ein geliehener String-Slice - der Typ eines Literals wie `"Ada"`. `String` ist eine besitzende, wachsende Zeichenkette. Sie aus einer Vorlage zu bauen ist die Aufgabe von `format!`: dieselbe Vorlagensyntax wie `println!`, nur liefert es den `String` zurueck, statt ihn auszugeben.

## Ausfuehren, scheitern sehen, beheben

```bash
cargo test --test m0-02-first-test
```

Bevor du etwas aenderst, scheitern zwei der drei Tests so:

```text
thread 'm0_02_first_test::greets_by_name' panicked at src/m0/m0_02_first_test.rs:14:5:
not yet implemented: build the greeting with format!
```

Diese Meldung lohnt zweimal lesen: sie nennt **Datei und Zeile des `todo!()`**, nicht des Tests. Dort arbeitest du. Ersetze den Makroaufruf durch einen Ausdruck vom Typ `String` und fuehre den Befehl erneut aus; die Zusammenfassung lautet dann `test result: ok. 3 passed`.

## Deine Aufgabe

Implementiere `greet`, sodass alle drei Tests bestehen, und beantworte dann, was die Zusicherung mit dem leeren Namen ueber die Implementierung aussagt. Der naechste Step dreht die Richtung um: du sagst die Ausgabe vorher, bevor du das Programm startest.
