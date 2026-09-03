---
id: m0-04-predict-output
title: "Die Ausgabe vorhersagen, dann ausführen"
bloom: understand
objectives: [ "rust-tooling-cargo" ]
requires: [ "m0-03-first-test" ]
estimatedMinutes: 20
scaffold: faded
links:
  - { step: "m0-05-compiler-errors" }
  - { file: "examples/m0_shadowing.rs" }
  - { file: "src/m0/m0_04_predict.rs" }
  - { url: "https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html", title: "The Book, 3.1: Variables and Mutability" }
sources: [ "examples/m0_shadowing.rs", "src/m0/m0_04_predict.rs", "tests/m0-04-predict-output.rs" ]
tasks:
  - id: guess
    title: "Sage vorher, was m0_shadowing ausgibt"
    check: { type: "predict", prompt: { en: "examples/m0_shadowing.rs shadows `x` three times and shadows `spaces` with a value of a different type. Write down, line by line, what the program prints - all four lines, with the exact numbers.", de: "examples/m0_shadowing.rs überschattet `x` dreimal und überschattet `spaces` mit einem Wert anderen Typs. Schreibe Zeile für Zeile auf, was das Programm ausgibt - alle vier Zeilen mit den genauen Zahlen." }, then: { type: "command", command: "cargo run --quiet --example m0_shadowing", seedMustFail: false, expectExitCode: 0, expectStdout: "inner scope is: 12", timeoutMs: 120000 }, rubric: "The prediction gives 12 for the inner scope and 6 for the outer x, 3 for spaces, and 3 / 1 for the integer division and remainder. A prediction of 6 for the inner scope (missing the second shadowing) or an error for `spaces` (expecting a type conflict) is a wrong prediction, which is a useful result, not a failure.", bloom: "evaluate" }
  - id: convert
    title: "Die Temperaturumrechnungen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m0-04-predict-output", expectPass: [ "m0_04_predict_output::boiling_point", "m0_04_predict_output::freezing_point", "m0_04_predict_output::minus_forty_is_the_same_in_both" ], minPass: 3, timeoutMs: 180000 }
socratic:
  - { trigger: "task:convert:failed", question: { en: "One of the three assertions fails. Which one, and what does `left` differ from `right` by - a rounding step, or a factor?", de: "Eine der drei Zusicherungen scheitert. Welche, und worin unterscheidet sich `left` von `right` - um eine Rundung oder um einen Faktor?" }, hints: [ { en: "`9 / 5` between two integers is 1, not 1.8: write the constants as `9.0 / 5.0` so the division happens in f64.", de: "`9 / 5` zwischen zwei Ganzzahlen ist 1, nicht 1,8: schreibe die Konstanten als `9.0 / 5.0`, damit in f64 geteilt wird." }, { en: "Check the order of operations: `c * 9.0 / 5.0 + 32.0` is not the same as `c * (9.0 / (5.0 + 32.0))`.", de: "Prüfe die Reihenfolge: `c * 9.0 / 5.0 + 32.0` ist nicht dasselbe wie `c * (9.0 / (5.0 + 32.0))`." }, { en: "The -40 test passes only when both directions are exact inverses; if it alone fails, one of the two formulas is transposed.", de: "Der -40-Test besteht nur, wenn beide Richtungen exakt invers sind; scheitert nur er, ist eine der beiden Formeln vertauscht." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Which of your two numbers is an integer where the signature promised an f64?", de: "Welche deiner beiden Zahlen ist eine Ganzzahl, wo die Signatur ein f64 versprochen hat?" }, hints: [ { en: "`32` is an integer literal, `32.0` is a float literal; Rust does not convert between them for you.", de: "`32` ist ein Ganzzahl-, `32.0` ein Gleitkommaliteral; Rust rechnet sie nicht ineinander um." }, { en: "The `expected`/`found` lines of the diagnostic name both types explicitly.", de: "Die Zeilen `expected`/`found` der Diagnose nennen beide Typen ausdrücklich." }, { en: "Write every constant in these two formulas with a decimal point and the mismatch disappears.", de: "Schreibe jede Konstante dieser beiden Formeln mit Dezimalpunkt, dann verschwindet der Konflikt." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Lege dich auf eine Vorhersage fest, bevor du ein Programm ausführst - damit du, wenn die Ausgabe dich überrascht, etwas lernst statt nur zu lesen.

## Warum zuerst vorhersagen

Code zu lesen und zu glauben, man verstehe ihn, fühlt sich von innen gleich an. Die Antwort vorher aufzuschreiben trennt beides: eine falsche Vorhersage ist eine genaue Karte dessen, was dein Sprachmodell falsch abbildet. Deshalb verlangt dieser Kurs je Modul mindestens eine Vorhersage.

## Das Programm

`examples/m0_shadowing.rs` liegt unter `examples/`, einem Verzeichnis, das cargo als eigenständige Programme übersetzt. Ausgeführt wird eines mit `cargo run --example <name>` - hier `cargo run --quiet --example m0_shadowing`. Führe es noch nicht aus.

```rust
let x = 5;
let x = x + 1;
{
    let x = x * 2;
    println!("The value of x in the inner scope is: {x}");
}
println!("The value of x is: {x}");
```

Drei `let x`, keines davon `mut`. Das ist *Shadowing*: ein `let` mit einem bereits vorhandenen Namen erzeugt eine **neue** Variable, die die alte für den Rest des Gültigkeitsbereichs verdeckt. Es ist keine Zuweisung - das erste `x` existiert unverändert weiter und taucht wieder auf, sobald der innere Block endet.

Die zweite Hälfte ist die, über die man stolpert:

```rust
let spaces = "   ";
let spaces = spaces.len();
```

Das erste `spaces` ist ein `&str`, das zweite ein `usize`. Shadowing darf den Typ wechseln, weil es wirklich eine neue Variable ist. `let mut spaces = "   ";` gefolgt von `spaces = spaces.len();` wäre stattdessen Fehler E0308 - eine Zuweisung darf den Typ nicht ändern.

Die letzten beiden Zeilen nutzen `/` und `%` auf zwei Ganzzahlen. Ganzzahldivision schneidet zur Null hin ab; in diesem Ausdruck kommt kein Gleitkomma vor.

## Schreibe deine Vorhersage

Vier ausgegebene Zeilen. Nenne die genauen Zahlen aller vier, bevor du irgendetwas ausführst. Führe dann das Programm aus und vergleiche.

## Die zweite Hälfte dieses Steps

`src/m0/m0_04_predict.rs` enthält die Temperaturumrechnungen aus dem Buch als `todo!()`-Stubs, beide auf `f64`. Die Falle ist dieselbe Ganzzahl-Gleitkomma-Trennung wie oben: `9 / 5` ist `1`, also liefert `c * 9 / 5 + 32` für kochendes Wasser 132 statt 212. Schreibe die Konstanten mit Dezimalpunkt.

```bash
cargo test --test m0-04-predict-output
```

Drei Tests, darunter `minus_forty_is_the_same_in_both` - die eine Temperatur, bei der beide Skalen übereinstimmen, und eine billige Probe darauf, dass du die beiden Formeln nicht vertauscht hast.

## Deine Aufgabe

Sage die Ausgabe des Beispiels vorher und implementiere dann beide Umrechnungen. Der nächste Step gibt dir eine Datei, die überhaupt nicht kompiliert.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo run --quiet --example m0_shadowing
cargo test --test m0-04-predict-output
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** die Ausgabe des Programms, darin `inner scope is: 12`.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

*Die drei Handgriffe sind in jedem Step dieses Kurses dieselben - Terminal öffnen, mit `cd` in die Crate wechseln, den Befehl ausführen. Nur die letzte Zeile unterscheidet sich, und die Fassung dieses Steps steht im Block darüber.*

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
