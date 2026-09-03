---
id: m1-03-copy-types
title: "Copy-Typen: wenn eine Zuweisung kein Move ist"
bloom: understand
objectives: [ "rust-ch04-01-what-is-ownership" ]
requires: [ "m1-02-move-vs-clone" ]
estimatedMinutes: 20
scaffold: faded
links:
  - { step: "m1-04-ownership-and-functions" }
  - { file: "src/m1/m1_03_copy_types.rs" }
  - { file: "tests/m1-03-copy-types.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html", title: "The Book, 4.1: Stack-Only Data: Copy" }
sources: [ "src/m1/m1_03_copy_types.rs", "tests/m1-03-copy-types.rs" ]
tasks:
  - id: copy
    title: "Point ist Copy und mirror funktioniert"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m1-03-copy-types", expectPass: [ "m1_03_copy_types::sum_twice_doubles", "m1_03_copy_types::mirror_negates_x", "m1_03_copy_types::mirror_of_origin_is_origin" ], minPass: 3, timeoutMs: 180000 }
  - id: derive
    title: "Point leitet Copy ab"
    check: { type: "all", checks: [ { type: "fileMatches", file: "src/m1/m1_03_copy_types.rs", pattern: "#\\[derive\\([^)]*\\bCopy\\b[^)]*\\)\\]" }, { type: "fileNotMatches", file: "src/m1/m1_03_copy_types.rs", pattern: "\\.clone\\(\\)" } ] }
  - id: why-not-string
    title: "Du kannst sagen, warum String nicht Copy sein kann"
    check: { type: "question", prompt: { en: "Adding a String field to Point would make `#[derive(Copy)]` fail to compile. Explain why the language forbids that, in terms of what a bitwise copy of a String would mean at the end of the scope.", de: "Ein String-Feld in Point würde `#[derive(Copy)]` nicht mehr kompilieren lassen. Erkläre, warum die Sprache das verbietet - in Begriffen dessen, was eine bitweise Kopie eines String am Ende des Gültigkeitsbereichs bedeuten würde." }, rubric: "Explains that Copy means a bitwise duplicate is a valid second value, which for a String would duplicate the heap pointer and cause both owners to free the same allocation (a double free), and that this is why Copy and Drop are mutually exclusive. Credit for noting that Clone exists precisely for the deep-copy case.", bloom: "analyze", minChars: 50 }
socratic:
  - { trigger: "task:copy:failed", question: { en: "Does the test binary compile at all, or does it fail before any test runs? A trait bound that is not satisfied is a compile error, not a failed assertion.", de: "Kompiliert das Testbinary überhaupt, oder scheitert es, bevor ein Test läuft? Eine nicht erfüllte Trait-Schranke ist ein Compilerfehler, keine fehlgeschlagene Zusicherung." }, hints: [ { en: "`assert_is_copy::<Point>()` only compiles once `Point` implements `Copy`; the derive list on the struct is where you say so.", de: "`assert_is_copy::<Point>()` kompiliert erst, wenn `Point` das Trait `Copy` implementiert; die derive-Liste an der Struktur ist die Stelle dafür." }, { en: "`Copy` requires `Clone`: derive both, `#[derive(Debug, PartialEq, Clone, Copy)]`.", de: "`Copy` setzt `Clone` voraus: leite beide ab, `#[derive(Debug, PartialEq, Clone, Copy)]`." }, { en: "With `Copy` in place, `mirror` may use `p` twice - once as itself and once to build the mirrored point.", de: "Mit `Copy` darf `mirror` `p` zweimal verwenden - einmal als sich selbst und einmal für den gespiegelten Punkt." } ] }
misconceptions:
  - { pattern: "the trait bound `.*: Copy` is not satisfied", question: { en: "The compiler is being asked for a Copy that does not exist. Which type is missing the derive, and are all of its fields themselves Copy?", de: "Es wird ein Copy verlangt, das es nicht gibt. Welchem Typ fehlt das derive, und sind alle seine Felder selbst Copy?" }, hints: [ { en: "`#[derive(Copy)]` on a struct compiles only when every field is `Copy` as well.", de: "`#[derive(Copy)]` an einer Struktur kompiliert nur, wenn auch jedes Feld `Copy` ist." }, { en: "`Copy` cannot stand alone: it requires `Clone` in the same derive list.", de: "`Copy` steht nicht allein: es verlangt `Clone` in derselben derive-Liste." }, { en: "All integer, floating-point, boolean and character types are Copy, and so are tuples of them.", de: "Alle Ganzzahl-, Gleitkomma-, Wahrheitswert- und Zeichentypen sind Copy, ebenso Tupel daraus." } ] }
  - { pattern: "error\\[E0382\\]: use of moved value", question: { en: "A value was used twice. Is its type one that should have been Copy, or is this a genuine move you need to plan around?", de: "Ein Wert wurde zweimal genutzt. Ist sein Typ einer, der Copy sein sollte, oder ist das ein echter Move, um den du herumplanen musst?" }, hints: [ { en: "If the type is a struct of integers, adding `Copy` to its derive list removes the error at no cost.", de: "Ist der Typ eine Struktur aus Ganzzahlen, beseitigt `Copy` in der derive-Liste den Fehler kostenlos." }, { en: "If it owns heap data, `Copy` is not available; read the field once into a local before moving the value.", de: "Besitzt er Heap-Daten, ist `Copy` nicht möglich; lies das Feld einmal in eine lokale Variable, bevor du den Wert verschiebst." }, { en: "The diagnostic's `move occurs because … does not implement the Copy trait` line names the type for you.", de: "Die Zeile `move occurs because … does not implement the Copy trait` der Diagnose nennt dir den Typ." } ] }
---
## Lernziel

Erkläre, warum `let y = x;` einen `String` verschiebt, ein `i32` aber nicht - und bringe eine eigene Struktur dazu, sich wie das Zweite zu verhalten.

## Die Ausnahme von der Move-Regel

```rust
let x = 5;
let y = x;
println!("{x} and {y}");
```

Das kompiliert, obwohl die Form dieselbe ist wie im `String`-Fall, der es nicht tat. Der Unterschied ist das Trait `Copy`. Ein Typ ist `Copy`, wenn das Verdoppeln seiner Bits einen gültigen, unabhängigen zweiten Wert ergibt - das gilt für alles, was vollständig auf dem Stack liegt und dessen Größe zur Übersetzungszeit feststeht: alle Ganzzahlen, `f32`/`f64`, `bool`, `char` sowie Tupel, deren Bestandteile alle `Copy` sind.

Für solche Typen gibt es keinen Move. `x` bleibt nutzbar, weil `y` nichts mit ihm teilt; es gibt nichts zu teilen.

## Copy und Drop schließen einander aus

Rust verweigert `Copy` für jeden Typ, der `Drop` implementiert, und der Grund ist genau das doppelte Freigeben aus dem letzten Step. Eine bitweise Kopie eines `String` würde den Heap-Zeiger verdoppeln; beide Kopien würden am Ende ihres Bereichs `drop` ausführen; dieselbe Allokation würde zweimal freigegeben. Deshalb sind `String`, `Vec<T>` und jeder Typ mit Heap-Besitz nie `Copy`, und `Clone` - eine ausdrückliche, möglicherweise teure tiefe Kopie - ist das, was es für sie stattdessen gibt.

## Copy für die eigene Struktur anfordern

```rust
#[derive(Debug, PartialEq)]
pub struct Point {
    pub x: i32,
    pub y: i32,
}
```

Beide Felder sind `Copy`, `Point` *könnte* es also sein - ist es aber erst, wenn du es sagst. `derive` erzeugt Trait-Implementierungen mechanisch; `Copy` verlangt `Clone` daneben, denn `Copy` ist definiert als ein `Clone`, das eine reine Bitkopie ist.

Ob ein Typ `Copy` ist, entscheidet sich zur Übersetzungszeit. Ein Test könnte das mit einer Schranke festnageln:

```rust
fn assert_is_copy<T: Copy>() {}   // leerer Rumpf, prüft zur Laufzeit nichts
assert_is_copy::<Point>();        // der Compiler prüft die Schranke
```

Genau das steht hier bewusst **nicht** im Test. Solange das derive fehlte, ließe sich diese Testdatei nicht übersetzen, und ein einziges nicht übersetzbares Testziel bricht ein `cargo test` über den ganzen Workspace ab, bevor irgendein Test läuft - du sähest einen Fehler aus M1, während du an M5 arbeitest. Der Step prüft das derive deshalb, indem er die Quelldatei liest (`fileMatches` auf `#[derive(…Copy…)]`), und verbietet zugleich ein `.clone()` in dieser Datei, damit die Ableitung nicht umgangen wird.

Die Semantik beweist `mirror`: es nutzt `p` zweimal, ohne zu klonen, und das übersetzt nur, wenn `Point` `Copy` ist.

## Deine Aufgabe

Ergänze die derives, die `Point` braucht, implementiere `mirror` und beantworte, warum ein `String`-Feld das unmöglich machen würde.
