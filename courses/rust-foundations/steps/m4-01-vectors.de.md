---
id: m4-01-vectors
title: "Vektoren: eine wachsende Liste"
bloom: apply
objectives: [ "rust-ch08-01-vectors" ]
requires: [ "m3-04-if-let" ]
estimatedMinutes: 20
scaffold: worked
recallFrom: [ "m2-04-slices" ]
links:
  - { step: "m4-02-strings" }
  - { file: "src/m4/m4_01_vectors.rs" }
  - { file: "tests/m4-01-vectors.rs" }
  - { url: "https://doc.rust-lang.org/book/ch08-01-vectors.html", title: "The Book, 8.1: Storing Lists of Values with Vectors" }
sources: [ "src/m4/m4_01_vectors.rs", "tests/m4-01-vectors.rs", "src/m2/m2_04_slices.rs" ]
tasks:
  - id: vectors
    title: "Die fuenf Vektor-Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m4-01-vectors", expectPass: [ "m4_01_vectors::build_range_counts_from_one", "m4_01_vectors::sum_all_takes_a_slice", "m4_01_vectors::get_at_does_not_panic", "m4_01_vectors::double_in_place_mutates", "m4_01_vectors::evens_keeps_order" ], minPass: 5, timeoutMs: 180000 }
  - id: index-vs-get
    title: "Du kannst zwischen v[i] und v.get(i) waehlen"
    check: { type: "question", prompt: { en: "get_at must return None for an out-of-range index, so v[i] is wrong there. Name a place in the same file where v[i] would be the better choice, and state the rule you would give a colleague for picking between the two.", de: "get_at muss fuer einen Index ausserhalb des Bereichs None liefern, v[i] ist dort also falsch. Nenne eine Stelle in derselben Datei, an der v[i] die bessere Wahl waere, und formuliere die Regel, die du einem Kollegen fuer die Wahl zwischen beiden geben wuerdest." }, rubric: "Names a place where the index is known to be in range (an index derived from the vector's own length, or iteration) and states a rule of the form: use v[i] when an out-of-range index would be a bug in the program - a panic is then the correct, loud response - and v.get(i) when the index comes from outside and being out of range is an expected condition the caller must handle.", bloom: "evaluate", minChars: 60 }
socratic:
  - { trigger: "task:vectors:failed", question: { en: "Which one fails? For `build_range`, what does `1..=n` produce when `n` is 0 or negative?", de: "Welche scheitert? Was liefert `1..=n` in `build_range`, wenn `n` 0 oder negativ ist?" }, hints: [ { en: "An inclusive range whose end is below its start is simply empty, so no special case is needed.", de: "Ein einschliessender Bereich, dessen Ende unter dem Start liegt, ist schlicht leer; ein Sonderfall ist unnoetig." }, { en: "`double_in_place` must write through the reference: `for x in v.iter_mut() { *x *= 2; }`.", de: "`double_in_place` muss ueber die Referenz schreiben: `for x in v.iter_mut() { *x *= 2; }`." }, { en: "`v.get(i)` gives `Option<&i32>`; `.copied()` turns it into the `Option<i32>` the signature promises.", de: "`v.get(i)` liefert `Option<&i32>`; `.copied()` macht daraus das von der Signatur versprochene `Option<i32>`." } ] }
misconceptions:
  - { pattern: "index out of bounds: the len is \\d+ but the index is \\d+", question: { en: "An index went past the end at runtime. Was the index supposed to be trusted here, or should the function have returned an Option instead?", de: "Ein Index lief zur Laufzeit ueber das Ende hinaus. Sollte dem Index hier vertraut werden, oder haette die Funktion ein Option liefern muessen?" }, hints: [ { en: "`v[i]` panics on an out-of-range index; `v.get(i)` returns `None`.", de: "`v[i]` stuerzt bei einem Index ausserhalb des Bereichs ab; `v.get(i)` liefert `None`." }, { en: "The panic message names both the length and the index, which usually identifies the off-by-one immediately.", de: "Die Panic-Meldung nennt Laenge und Index, was den Off-by-one meist sofort zeigt." }, { en: "`get_at` promises never to panic; its signature already says so with `Option`.", de: "`get_at` verspricht, nie abzustuerzen; seine Signatur sagt das mit `Option` bereits." } ] }
  - { pattern: "error\\[E0502\\]", question: { en: "A read of the vector overlaps a write to it. Which line still holds the shared borrow when the mutation happens?", de: "Ein Lesen des Vektors ueberlappt ein Schreiben darauf. Welche Zeile haelt beim Aendern noch die geteilte Leihe?" }, hints: [ { en: "`iter()` borrows the whole vector for the duration of the loop; `push` inside it cannot work.", de: "`iter()` leiht den gesamten Vektor fuer die Dauer der Schleife; ein `push` darin kann nicht funktionieren." }, { en: "Collect into a second vector and replace the first afterwards, rather than mutating during iteration.", de: "Sammle in einen zweiten Vektor und ersetze den ersten danach, statt waehrend der Iteration zu aendern." }, { en: "`iter_mut()` is the one loop that may change elements - but not the length.", de: "`iter_mut()` ist die eine Schleife, die Elemente aendern darf - die Laenge aber nicht." } ] }
---
## Lernziel

Baue, lies, durchlaufe und aendere einen `Vec<T>` und waehle bewusst zwischen einer Indizierung, die abstuerzt, und einer, die ein `Option` liefert.

## Erzeugen und wachsen lassen

```rust
let mut v: Vec<i32> = Vec::new();
v.push(1);

let v = vec![1, 2, 3];       // das Makro, wenn der Inhalt bekannt ist
```

`Vec::new()` braucht eine Typannotation, weil es nichts herzuleiten gibt; nach dem ersten `push` gaebe es das. Die Elemente liegen nebeneinander auf dem Heap, alle vom selben Typ, und der Vektor wird - samt allem darin - aufgeraeumt, wenn er seinen Gueltigkeitsbereich verlaesst.

## Zwei Wege, ein Element zu lesen

```rust
let third = &v[2];             // stuerzt ausserhalb des Bereichs ab
let third = v.get(2);          // Option<&i32>
```

Sie sind nicht austauschbar, und die Wahl ist eine Entwurfs-, keine Stilfrage:

- Nutze `v[i]`, wenn ein Index ausserhalb des Bereichs bedeuten wuerde, dass das Programm einen Fehler hat. Dann lautstark abzustuerzen ist besser, als mit Unsinn weiterzurechnen.
- Nutze `v.get(i)`, wenn der Index von aussen kommt - von einem Nutzer, aus einer Datei, aus einem Argument - und ausserhalb des Bereichs zu liegen ein Zustand ist, den dein Aufrufer behandeln soll.

`get_at` in diesem Step ist der zweite Fall, und seine Signatur sagt das. `.copied()` nach `get` macht aus `Option<&i32>` ein `Option<i32>`, beendet damit die Leihe und erlaubt, einen Wert statt einer Referenz in die Daten des Aufrufers zurueckzugeben.

## Iterieren

```rust
for x in &v { … }               // geteilte Leihe, nur lesend
for x in v.iter_mut() { *x *= 2; }   // eine veraenderliche Leihe fuer die ganze Schleife
```

Das `*` in der zweiten Form ist nicht optional: `x` ist ein `&mut i32`, und `x *= 2` versuchte, eine Referenz zu multiplizieren. Die Schleife haelt fuer ihre gesamte Dauer eine einzige veraenderliche Leihe - deshalb ist ein `push` darin E0502, die Aliasing-Regel aus M2 in ihrer haeufigsten Alltagsform.

## Slices, noch einmal

`sum_all` nimmt `&[i32]`, nicht `&Vec<i32>`. Das ist die Lektion aus m2-04 angewandt: der Slice akzeptiert einen ganzen Vektor, einen Teil davon, ein Array und ein Literal, und die Funktion ist ohne Mehraufwand an mehr Stellen einsetzbar. Clippy schlaegt diese Umstellung namentlich vor (`ptr_arg`), und der Workspace behaelt `&mut Vec` nur dort, wo die Referenz selbst der Gegenstand der Uebung ist.

## Deine Aufgabe

Implementiere die fuenf Funktionen und begruende dann, wo `v[i]` der bessere Aufruf waere. Der naechste Step behandelt die Sammlung, die am einfachsten aussieht und es nicht ist: `String`.
