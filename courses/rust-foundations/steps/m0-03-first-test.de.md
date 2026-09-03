---
id: m0-03-first-test
title: "Einen Test lesen, dann bestehen lassen"
bloom: apply
objectives: [ "rust-tooling-cargo" ]
requires: [ "m0-02-workbench" ]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: "m0-04-predict-output" }
  - { file: "src/m0/m0_03_first_test.rs" }
  - { file: "tests/m0-03-first-test.rs" }
  - { url: "https://doc.rust-lang.org/book/ch11-01-writing-tests.html", title: "The Book, 11.1: How to Write Tests" }
sources: [ "src/m0/m0_03_first_test.rs", "tests/m0-03-first-test.rs", "README.md" ]
tasks:
  - id: greet
    title: "greet() liefert die Begrüßung"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m0-03-first-test", expectPass: [ "m0_03_first_test::adds_two_numbers", "m0_03_first_test::greets_by_name", "m0_03_first_test::greets_any_name" ], minPass: 3, timeoutMs: 180000 }
  - id: read-the-test
    title: "Du kannst sagen, was der Test verlangt"
    check: { type: "question", prompt: { en: "The test greets_any_name asserts greet(\"\") == \"Hello, !\". What does that single assertion tell you about how greet must be written, and what would break if you had special-cased the empty name?", de: "Der Test greets_any_name verlangt greet(\"\") == \"Hello, !\". Was sagt dir diese eine Zusicherung darüber, wie greet geschrieben sein muss, und was ginge kaputt, wenn du den leeren Namen gesondert behandelt hättest?" }, rubric: "States that greet must interpolate the name unconditionally - format!(\"Hello, {name}!\") - with no branch on emptiness, and that a special case for \"\" would return something other than \"Hello, !\" and fail that assertion. Credit for noticing the test pins the exact punctuation and spacing.", bloom: "understand", minChars: 40 }
socratic:
  - { trigger: "task:greet:failed", question: { en: "The test says `not yet implemented`. Which file and line does the panic message point at, and is that the file you edited?", de: "Der Test meldet `not yet implemented`. Auf welche Datei und Zeile zeigt die Panic-Meldung, und ist das die Datei, die du bearbeitet hast?" }, hints: [ { en: "A `todo!()` panic prints the exact source location; open that file at that line and replace the macro with real code.", de: "Eine `todo!()`-Panic gibt die genaue Quellposition aus; öffne diese Datei an dieser Zeile und ersetze das Makro durch echten Code." }, { en: "The last expression of a function body, written without a semicolon, is its return value - `format!(\"…\")` on its own line, no `return` needed.", de: "Der letzte Ausdruck eines Funktionsrumpfs ohne Semikolon ist der Rückgabewert - `format!(\"…\")` allein in der Zeile, ohne `return`." }, { en: "`format!` builds a String from a template; a name in braces is substituted: compare the pattern with the `println!` in the module documentation.", de: "`format!` baut einen String aus einer Vorlage; ein Name in geschweiften Klammern wird eingesetzt: vergleiche das Muster mit dem `println!` in der Moduldokumentation." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "The compiler says the types do not match. Which type does the signature promise, and which type does your expression actually produce?", de: "Der Compiler sagt, die Typen passen nicht. Welchen Typ verspricht die Signatur, und welchen Typ liefert dein Ausdruck tatsächlich?" }, hints: [ { en: "Read the two lines after `expected`/`found`: they name both types.", de: "Lies die beiden Zeilen nach `expected`/`found`: sie nennen beide Typen." }, { en: "A literal in quotes is a `&str`; the signature promises an owned `String`.", de: "Ein Literal in Anführungszeichen ist ein `&str`; die Signatur verspricht ein besitzendes `String`." }, { en: "`format!` already returns a `String`; `\"Hello, \" + name` does not.", de: "`format!` liefert bereits ein `String`; `\"Hello, \" + name` nicht." } ] }
  - { pattern: "not yet implemented", question: { en: "A `todo!()` is still in the path the test takes. Which function did the test reach that you have not written yet?", de: "Ein `todo!()` liegt noch auf dem Weg, den der Test nimmt. Welche Funktion hat der Test erreicht, die du noch nicht geschrieben hast?" }, hints: [ { en: "The panic line names the file and line of the remaining `todo!()`.", de: "Die Panic-Zeile nennt Datei und Zeile des verbliebenen `todo!()`." }, { en: "Only `greet` is yours in this step; `add` is already complete and shows the shape.", de: "In diesem Step gehört nur `greet` dir; `add` ist fertig und zeigt die Form." }, { en: "Delete the whole `todo!(...)` call, including its message, and put the expression in its place.", de: "Lösche den gesamten `todo!(...)`-Aufruf samt Meldung und setze den Ausdruck an seine Stelle." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Lies einen Rust-Test als Spezifikation und schreibe die eine Funktion, die ihn erfüllt - und sieh die Meldung von `not yet implemented` zu `ok` wechseln.

## Der Test ist die Spezifikation

Öffne `tests/m0-03-first-test.rs`. Er ist kurz, und jede Zeile ist eine Forderung:

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

`#[test]` markiert eine Funktion, die der Testläufer aufrufen soll. `assert_eq!` vergleicht zwei Werte und gibt bei Abweichung beide aus - `left` ist, was dein Code lieferte, `right` das Erwartete. Nichts davon ist verhandelbar: Komma, Leerzeichen und Ausrufezeichen gehören zum Vertrag, und der Fall des leeren Namens ebenso.

## Das vorgemachte Beispiel neben deinem

`src/m0/m0_03_first_test.rs` enthält zwei Funktionen. Die erste ist fertig und dient als Vorlage:

```rust
/// Returns the sum of `a` and `b`.
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

Vier Dinge daran. `pub` macht die Funktion außerhalb ihres Moduls sichtbar, was der Test braucht. Jeder Parameter trägt einen Typ; in einer Signatur leitet Rust nie einen her. Der Rückgabetyp steht hinter `->`. Und der letzte Ausdruck des Rumpfs, **ohne Semikolon** geschrieben, ist der Rückgabewert - `a + b`, nicht `return a + b;`. Setzt du das Semikolon, wird aus dem Ausdruck eine Anweisung, die Funktion liefert `()`, und du erhältst Fehler E0308.

Die zweite Funktion gehört dir:

```rust
/// Returns `"Hello, <name>!"` - for `greet("Ada")` that is `"Hello, Ada!"`.
pub fn greet(name: &str) -> String {
    todo!("build the greeting with format!")
}
```

`&str` ist ein geliehener String-Slice - der Typ eines Literals wie `"Ada"`. `String` ist eine besitzende, wachsende Zeichenkette. Sie aus einer Vorlage zu bauen ist die Aufgabe von `format!`: dieselbe Vorlagensyntax wie `println!`, nur liefert es den `String` zurück, statt ihn auszugeben.

## Ausführen, scheitern sehen, beheben

![Der Editor zeigt src/m0/m0_03_first_test.rs mit Rust-Syntaxhervorhebung;
das Terminal darunter zeigt den fehlgeschlagenen Testlauf, und die
Panic-Meldung nennt genau diese Datei in Zeile 14. In der Statusleiste stehen
rust-analyzer und Rust.](editor-and-test-run.png)

```bash
cargo test --test m0-03-first-test
```

Bevor du etwas änderst, scheitern zwei der drei Tests so:

```text
thread 'm0_03_first_test::greets_by_name' panicked at src/m0/m0_03_first_test.rs:14:5:
not yet implemented: build the greeting with format!
```

Diese Meldung lohnt zweimal lesen: sie nennt **Datei und Zeile des `todo!()`**, nicht des Tests. Dort arbeitest du. Ersetze den Makroaufruf durch einen Ausdruck vom Typ `String` und führe den Befehl erneut aus; die Zusammenfassung lautet dann `test result: ok. 3 passed`.

## Deine Aufgabe

Implementiere `greet`, sodass alle drei Tests bestehen, und beantworte dann, was die Zusicherung mit dem leeren Namen über die Implementierung aussagt. Der nächste Step dreht die Richtung um: du sagst die Ausgabe vorher, bevor du das Programm startest.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo test --test m0-03-first-test
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** je Test eine Zeile `test … ok` oder `… FAILED`, danach die Zusammenfassung `test result: ok. 3 passed; 0 failed`, sobald du fertig bist.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

*Die drei Handgriffe sind in jedem Step dieses Kurses dieselben - Terminal öffnen, mit `cd` in die Crate wechseln, den Befehl ausführen. Nur die letzte Zeile unterscheidet sich, und die Fassung dieses Steps steht im Block darüber.*

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
