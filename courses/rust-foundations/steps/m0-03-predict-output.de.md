---
id: m0-03-predict-output
title: "Die Ausgabe vorhersagen, dann ausfuehren"
bloom: understand
objectives: [ "rust-tooling-cargo" ]
requires: [ "m0-02-first-test" ]
estimatedMinutes: 20
scaffold: faded
links:
  - { step: "m0-04-compiler-errors" }
  - { file: "examples/m0_shadowing.rs" }
  - { file: "src/m0/m0_03_predict.rs" }
  - { url: "https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html", title: "The Book, 3.1: Variables and Mutability" }
sources: [ "examples/m0_shadowing.rs", "src/m0/m0_03_predict.rs", "tests/m0-03-predict-output.rs" ]
tasks:
  - id: guess
    title: "Sage vorher, was m0_shadowing ausgibt"
    check: { type: "predict", prompt: { en: "examples/m0_shadowing.rs shadows `x` three times and shadows `spaces` with a value of a different type. Write down, line by line, what the program prints - all four lines, with the exact numbers.", de: "examples/m0_shadowing.rs ueberschattet `x` dreimal und ueberschattet `spaces` mit einem Wert anderen Typs. Schreibe Zeile fuer Zeile auf, was das Programm ausgibt - alle vier Zeilen mit den genauen Zahlen." }, then: { type: "command", command: "cargo run --quiet --example m0_shadowing", seedMustFail: false, expectExitCode: 0, expectStdout: "inner scope is: 12", timeoutMs: 120000 }, rubric: "The prediction gives 12 for the inner scope and 6 for the outer x, 3 for spaces, and 3 / 1 for the integer division and remainder. A prediction of 6 for the inner scope (missing the second shadowing) or an error for `spaces` (expecting a type conflict) is a wrong prediction, which is a useful result, not a failure.", bloom: "evaluate" }
  - id: convert
    title: "Die Temperaturumrechnungen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m0-03-predict-output", expectPass: [ "m0_03_predict_output::boiling_point", "m0_03_predict_output::freezing_point", "m0_03_predict_output::minus_forty_is_the_same_in_both" ], minPass: 3, timeoutMs: 180000 }
socratic:
  - { trigger: "task:convert:failed", question: { en: "One of the three assertions fails. Which one, and what does `left` differ from `right` by - a rounding step, or a factor?", de: "Eine der drei Zusicherungen scheitert. Welche, und worin unterscheidet sich `left` von `right` - um eine Rundung oder um einen Faktor?" }, hints: [ { en: "`9 / 5` between two integers is 1, not 1.8: write the constants as `9.0 / 5.0` so the division happens in f64.", de: "`9 / 5` zwischen zwei Ganzzahlen ist 1, nicht 1,8: schreibe die Konstanten als `9.0 / 5.0`, damit in f64 geteilt wird." }, { en: "Check the order of operations: `c * 9.0 / 5.0 + 32.0` is not the same as `c * (9.0 / (5.0 + 32.0))`.", de: "Pruefe die Reihenfolge: `c * 9.0 / 5.0 + 32.0` ist nicht dasselbe wie `c * (9.0 / (5.0 + 32.0))`." }, { en: "The -40 test passes only when both directions are exact inverses; if it alone fails, one of the two formulas is transposed.", de: "Der -40-Test besteht nur, wenn beide Richtungen exakt invers sind; scheitert nur er, ist eine der beiden Formeln vertauscht." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Which of your two numbers is an integer where the signature promised an f64?", de: "Welche deiner beiden Zahlen ist eine Ganzzahl, wo die Signatur ein f64 versprochen hat?" }, hints: [ { en: "`32` is an integer literal, `32.0` is a float literal; Rust does not convert between them for you.", de: "`32` ist ein Ganzzahl-, `32.0` ein Gleitkommaliteral; Rust rechnet sie nicht ineinander um." }, { en: "The `expected`/`found` lines of the diagnostic name both types explicitly.", de: "Die Zeilen `expected`/`found` der Diagnose nennen beide Typen ausdruecklich." }, { en: "Write every constant in these two formulas with a decimal point and the mismatch disappears.", de: "Schreibe jede Konstante dieser beiden Formeln mit Dezimalpunkt, dann verschwindet der Konflikt." } ] }
---
## Lernziel

Lege dich auf eine Vorhersage fest, bevor du ein Programm ausfuehrst - damit du, wenn die Ausgabe dich ueberrascht, etwas lernst statt nur zu lesen.

## Warum zuerst vorhersagen

Code zu lesen und zu glauben, man verstehe ihn, fuehlt sich von innen gleich an. Die Antwort vorher aufzuschreiben trennt beides: eine falsche Vorhersage ist eine genaue Karte dessen, was dein Sprachmodell falsch abbildet. Deshalb verlangt dieser Kurs je Modul mindestens eine Vorhersage.

## Das Programm

`examples/m0_shadowing.rs` liegt unter `examples/`, einem Verzeichnis, das cargo als eigenstaendige Programme uebersetzt. Ausgefuehrt wird eines mit `cargo run --example <name>` - hier `cargo run --quiet --example m0_shadowing`. Fuehre es noch nicht aus.

```rust
let x = 5;
let x = x + 1;
{
    let x = x * 2;
    println!("The value of x in the inner scope is: {x}");
}
println!("The value of x is: {x}");
```

Drei `let x`, keines davon `mut`. Das ist *Shadowing*: ein `let` mit einem bereits vorhandenen Namen erzeugt eine **neue** Variable, die die alte fuer den Rest des Gueltigkeitsbereichs verdeckt. Es ist keine Zuweisung - das erste `x` existiert unveraendert weiter und taucht wieder auf, sobald der innere Block endet.

Die zweite Haelfte ist die, ueber die man stolpert:

```rust
let spaces = "   ";
let spaces = spaces.len();
```

Das erste `spaces` ist ein `&str`, das zweite ein `usize`. Shadowing darf den Typ wechseln, weil es wirklich eine neue Variable ist. `let mut spaces = "   ";` gefolgt von `spaces = spaces.len();` waere stattdessen Fehler E0308 - eine Zuweisung darf den Typ nicht aendern.

Die letzten beiden Zeilen nutzen `/` und `%` auf zwei Ganzzahlen. Ganzzahldivision schneidet zur Null hin ab; in diesem Ausdruck kommt kein Gleitkomma vor.

## Schreibe deine Vorhersage

Vier ausgegebene Zeilen. Nenne die genauen Zahlen aller vier, bevor du irgendetwas ausfuehrst. Fuehre dann das Programm aus und vergleiche.

## Die zweite Haelfte dieses Steps

`src/m0/m0_03_predict.rs` enthaelt die Temperaturumrechnungen aus dem Buch als `todo!()`-Stubs, beide auf `f64`. Die Falle ist dieselbe Ganzzahl-Gleitkomma-Trennung wie oben: `9 / 5` ist `1`, also liefert `c * 9 / 5 + 32` fuer kochendes Wasser 132 statt 212. Schreibe die Konstanten mit Dezimalpunkt.

```bash
cargo test --test m0-03-predict-output
```

Drei Tests, darunter `minus_forty_is_the_same_in_both` - die eine Temperatur, bei der beide Skalen uebereinstimmen, und eine billige Probe darauf, dass du die beiden Formeln nicht vertauscht hast.

## Deine Aufgabe

Sage die Ausgabe des Beispiels vorher und implementiere dann beide Umrechnungen. Der naechste Step gibt dir eine Datei, die ueberhaupt nicht kompiliert.
