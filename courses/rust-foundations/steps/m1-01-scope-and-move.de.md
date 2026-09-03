---
id: m1-01-scope-and-move
title: "Gültigkeitsbereich, Eigentümer, Move"
bloom: understand
objectives: [ "rust-ch04-01-what-is-ownership" ]
requires: [ "m0-05-compiler-errors" ]
estimatedMinutes: 20
scaffold: worked
links:
  - { step: "m1-02-move-vs-clone" }
  - { file: "src/m1/m1_01_scope.rs" }
  - { file: "snippets/m1_01_move_error.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html", title: "The Book, 4.1: What Is Ownership?" }
sources: [ "src/m1/m1_01_scope.rs", "tests/m1-01-scope-and-move.rs", "snippets/m1_01_move_error.rs" ]
tasks:
  - id: guess
    title: "Sage vorher, ob das Move-Snippet kompiliert"
    check: { type: "predict", prompt: { en: "snippets/m1_01_move_error.rs assigns a String to a second variable and then prints both. Does it compile? If not, write the error code you expect and which of the two println! lines the compiler will point at.", de: "snippets/m1_01_move_error.rs bindet einen String an eine zweite Variable und gibt dann beide aus. Kompiliert das? Wenn nein, notiere den erwarteten Fehlercode und welche der beiden println!-Zeilen der Compiler markieren wird." }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m1_01_move_error.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0382\\]: borrow of moved value: `s1`", timeoutMs: 120000 }, rubric: "Predicts that it does not compile, with E0382, and points at the first println! - the one printing s1, the moved-from variable - not the second. A prediction of 'compiles, prints hello twice' is the common wrong model and worth naming as such.", bloom: "evaluate" }
  - id: ownership
    title: "takes_ownership und gives_ownership bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m1-01-scope-and-move", expectPass: [ "m1_01_scope_and_move::takes_ownership_returns_length", "m1_01_scope_and_move::empty_string_has_length_zero", "m1_01_scope_and_move::gives_ownership_returns_yours" ], minPass: 3, timeoutMs: 180000 }
socratic:
  - { trigger: "task:ownership:failed", question: { en: "Both functions are two lines long. Which one panics - and does the panic say `not yet implemented`, or does an assertion compare the wrong value?", de: "Beide Funktionen sind zwei Zeilen lang. Welche stürzt ab - und meldet die Panic `not yet implemented`, oder vergleicht eine Zusicherung den falschen Wert?" }, hints: [ { en: "`takes_ownership` owns `s`, so it may call any method on it, including `len()`.", de: "`takes_ownership` besitzt `s` und darf daher jede Methode darauf aufrufen, auch `len()`." }, { en: "`gives_ownership` has to create the `String` itself: `String::from(\"yours\")` allocates and hands the result to the caller.", de: "`gives_ownership` muss den `String` selbst erzeugen: `String::from(\"yours\")` alloziert und übergibt das Ergebnis an den Aufrufer." }, { en: "`len()` counts bytes, and for these ASCII test strings that is the same as characters.", de: "`len()` zählt Bytes, was bei diesen ASCII-Testzeichenketten dasselbe ist wie Zeichen." } ] }
misconceptions:
  - { pattern: "error\\[E0382\\]: borrow of moved value", question: { en: "The compiler says a value was moved. Which line moved it, and does the code after that line still need the old owner - or would the new one do?", de: "Der Compiler sagt, ein Wert wurde verschoben. Welche Zeile hat ihn verschoben, und braucht der Code danach wirklich noch den alten Eigentümer - oder täte es auch der neue?" }, hints: [ { en: "The diagnostic marks three places: where the value was created, `value moved here`, and `value borrowed here after move`. Read them in that order.", de: "Die Diagnose markiert drei Stellen: wo der Wert entstand, `value moved here` und `value borrowed here after move`. Lies sie in dieser Reihenfolge." }, { en: "Assigning a `String` to a second name, or passing it to a function by value, moves it; the old name is unusable afterwards.", de: "Ein `String` an einen zweiten Namen zu binden oder ihn per Wert an eine Funktion zu übergeben verschiebt ihn; der alte Name ist danach unbrauchbar." }, { en: "`clone()` is the honest fix only when you genuinely need two independent values; if you only need to read, a reference is what you want - and that is the next module.", de: "`clone()` ist nur dann die ehrliche Lösung, wenn du wirklich zwei unabhängige Werte brauchst; willst du nur lesen, ist eine Referenz das Richtige - und die kommt im nächsten Modul." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`pwd` prints the current folder; it has to be the rust-foundations workspace, the one holding Cargo.toml.", de: "`pwd` gibt den aktuellen Ordner aus; er muss der rust-foundations-Workspace sein, in dem die Cargo.toml liegt." }, { en: "A terminal opened with Terminal → New Terminal starts in the workspace folder; one you navigated away from does not.", de: "Ein über Terminal → Neues Terminal geöffnetes Terminal startet im Workspace-Ordner; eines, aus dem du herausnavigiert bist, nicht." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Nenne die drei Ownership-Regeln und erkenne in einer Diagnose den Moment, in dem ein Wert aufgehört hat, einer Variablen zu gehören.

## Die drei Regeln

Aus Kapitel 4.1, unverändert:

1. Jeder Wert in Rust hat einen *Eigentümer*.
2. Es gibt immer nur einen Eigentümer zugleich.
3. Verlässt der Eigentümer seinen Gültigkeitsbereich, wird der Wert aufgeräumt.

Die dritte Regel ersetzt sowohl Garbage Collection als auch manuelles `free`. An der schließenden Klammer des Bereichs, der einen `String` besitzt, ruft Rust `drop` auf und gibt die Heap-Allokation zurück. Keine Laufzeitumgebung ist beteiligt, nichts wird durchsucht; der Compiler weiß schlicht, wo die Klammer steht.

## Warum `String` und nicht `&str`

Ein String-Literal steckt im Binary, hat feste Größe und wird nie freigegeben, lässt sich also beliebig kopieren. Ein `String` ist etwas anderes: Zeiger, Länge und Kapazität auf dem Stack, dazu ein Puffer auf dem Heap, dessen Größe erst zur Laufzeit feststeht. Um diesen Heap-Puffer geht es bei Ownership.

## Was ein Move ist

```rust
let s1 = String::from("hello");
let s2 = s1;
```

Rust kopiert die drei Stack-Wörter nach `s2` und **nicht** den Heap-Puffer - beide zeigten also auf dieselbe Allokation. Zwei Eigentümer bedeuten ein doppeltes Freigeben am Ende des Bereichs, deshalb verbietet Regel 2 das: `s1` wird nach `s2` *verschoben* und ist nicht mehr gültig. Keine flache Kopie, keine tiefe Kopie - ein Move.

Nutzt du `s1` danach, erhältst du:

```text
error[E0382]: borrow of moved value: `s1`
5 |     let s2 = s1;
  |              -- value moved here
7 |     println!("{s1}, world!");
  |                ^^ value borrowed here after move
```

Das ist `snippets/m1_01_move_error.rs`. Sage sein Ergebnis vorher, bevor du es übersetzt; der Check ruft `rustc` darauf auf und erwartet genau diesen Fehlschlag.

## In Funktionen hinein und wieder heraus

Übergabe per Wert verschiebt, genau wie eine Zuweisung - und ein Rückgabewert verschiebt zurück heraus. `src/m1/m1_01_scope.rs` enthält je ein Beispiel:

```rust
pub fn takes_ownership(s: String) -> usize { … }
pub fn gives_ownership() -> String { … }
```

Die interessante Zeile im Test steht nach dem ersten Aufruf:

```rust
let s = String::from("hello");
assert_eq!(takes_ownership(s), 5);
// `s` is gone here: using it would be error E0382.
```

Der Aufrufer hat die Zeichenkette weggegeben. `takes_ownership` räumt sie beim Verlassen auf. Das ist eine echte Einschränkung, und die nächsten beiden Steps zeigen die zwei ehrlichen Auswege: den Wert zurückgeben oder klonen. Den Weg, den du tatsächlich am häufigsten nimmst - Borrowing - behandelt Modul M2.

## Deine Aufgabe

Sage das Ergebnis des Snippets vorher, implementiere dann beide Funktionen und führe `cargo test --test m1-01-scope-and-move` aus.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1** (im Browser zuverlässiger als Strg+Umschalt+P), tippe `Terminal: Create New Terminal` und drücke die Eingabetaste. Das Terminal öffnet sich im Bereich unten, bereits im Workspace-Ordner. Führe dann aus:

```bash
mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m1_01_move_error.rs
cargo test --test m1-01-scope-and-move
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** eine Compilerdiagnose und sonst nichts - diese Datei soll *nicht* übersetzen, der Fehler ist also das erwartete Ergebnis und nicht dein Fehler.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, steht das Terminal im falschen Ordner - wechsle mit `cd` zurück in den Workspace-Ordner.
