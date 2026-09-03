---
id: m1-03-copy-types
title: "Copy types: when assignment is not a move"
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
    title: "Point is Copy and mirror works"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m1-03-copy-types", expectPass: [ "m1_03_copy_types::sum_twice_doubles", "m1_03_copy_types::mirror_negates_x", "m1_03_copy_types::mirror_of_origin_is_origin" ], minPass: 3, timeoutMs: 180000 }
  - id: derive
    title: "Point derives Copy"
    check: { type: "all", checks: [ { type: "fileMatches", file: "src/m1/m1_03_copy_types.rs", pattern: "#\\[derive\\([^)]*\\bCopy\\b[^)]*\\)\\]" }, { type: "fileNotMatches", file: "src/m1/m1_03_copy_types.rs", pattern: "\\.clone\\(\\)" } ] }
  - id: why-not-string
    title: "You can say why String cannot be Copy"
    check: { type: "question", prompt: { en: "Adding a String field to Point would make `#[derive(Copy)]` fail to compile. Explain why the language forbids that, in terms of what a bitwise copy of a String would mean at the end of the scope.", de: "Ein String-Feld in Point würde `#[derive(Copy)]` nicht mehr kompilieren lassen. Erkläre, warum die Sprache das verbietet - in Begriffen dessen, was eine bitweise Kopie eines String am Ende des Gültigkeitsbereichs bedeuten würde." }, rubric: "Explains that Copy means a bitwise duplicate is a valid second value, which for a String would duplicate the heap pointer and cause both owners to free the same allocation (a double free), and that this is why Copy and Drop are mutually exclusive. Credit for noting that Clone exists precisely for the deep-copy case.", bloom: "analyze", minChars: 50 }
socratic:
  - { trigger: "task:copy:failed", question: { en: "Does the test binary compile at all, or does it fail before any test runs? A trait bound that is not satisfied is a compile error, not a failed assertion.", de: "Kompiliert das Testbinary überhaupt, oder scheitert es, bevor ein Test läuft? Eine nicht erfüllte Trait-Schranke ist ein Compilerfehler, keine fehlgeschlagene Zusicherung." }, hints: [ { en: "`assert_is_copy::<Point>()` only compiles once `Point` implements `Copy`; the derive list on the struct is where you say so.", de: "`assert_is_copy::<Point>()` kompiliert erst, wenn `Point` das Trait `Copy` implementiert; die derive-Liste an der Struktur ist die Stelle dafür." }, { en: "`Copy` requires `Clone`: derive both, `#[derive(Debug, PartialEq, Clone, Copy)]`.", de: "`Copy` setzt `Clone` voraus: leite beide ab, `#[derive(Debug, PartialEq, Clone, Copy)]`." }, { en: "With `Copy` in place, `mirror` may use `p` twice - once as itself and once to build the mirrored point.", de: "Mit `Copy` darf `mirror` `p` zweimal verwenden - einmal als sich selbst und einmal für den gespiegelten Punkt." } ] }
misconceptions:
  - { pattern: "the trait bound `.*: Copy` is not satisfied", question: { en: "The compiler is being asked for a Copy that does not exist. Which type is missing the derive, and are all of its fields themselves Copy?", de: "Es wird ein Copy verlangt, das es nicht gibt. Welchem Typ fehlt das derive, und sind alle seine Felder selbst Copy?" }, hints: [ { en: "`#[derive(Copy)]` on a struct compiles only when every field is `Copy` as well.", de: "`#[derive(Copy)]` an einer Struktur kompiliert nur, wenn auch jedes Feld `Copy` ist." }, { en: "`Copy` cannot stand alone: it requires `Clone` in the same derive list.", de: "`Copy` steht nicht allein: es verlangt `Clone` in derselben derive-Liste." }, { en: "All integer, floating-point, boolean and character types are Copy, and so are tuples of them.", de: "Alle Ganzzahl-, Gleitkomma-, Wahrheitswert- und Zeichentypen sind Copy, ebenso Tupel daraus." } ] }
  - { pattern: "error\\[E0382\\]: use of moved value", question: { en: "A value was used twice. Is its type one that should have been Copy, or is this a genuine move you need to plan around?", de: "Ein Wert wurde zweimal genutzt. Ist sein Typ einer, der Copy sein sollte, oder ist das ein echter Move, um den du herumplanen musst?" }, hints: [ { en: "If the type is a struct of integers, adding `Copy` to its derive list removes the error at no cost.", de: "Ist der Typ eine Struktur aus Ganzzahlen, beseitigt `Copy` in der derive-Liste den Fehler kostenlos." }, { en: "If it owns heap data, `Copy` is not available; read the field once into a local before moving the value.", de: "Besitzt er Heap-Daten, ist `Copy` nicht möglich; lies das Feld einmal in eine lokale Variable, bevor du den Wert verschiebst." }, { en: "The diagnostic's `move occurs because … does not implement the Copy trait` line names the type for you.", de: "Die Zeile `move occurs because … does not implement the Copy trait` der Diagnose nennt dir den Typ." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Explain why `let y = x;` moves a `String` but not an `i32`, and make a struct of your own behave like the second.

## The exception to the move rule

```rust
let x = 5;
let y = x;
println!("{x} and {y}");
```

This compiles, although the shape is identical to the `String` case that did not. The difference is the `Copy` trait. A type is `Copy` when duplicating its bits produces a valid, independent second value - trü for everything that lives entirely on the stack with a size known at compile time: all integers, `f32`/`f64`, `bool`, `char`, and tuples whose members are all `Copy`.

For such a type there is no move. `x` stays usable because `y` is not sharing anything with it; there is nothing to share.

## Copy and Drop are mutually exclusive

Rust refuses `Copy` on any type that implements `Drop`, and the reason is exactly the double free from the last step. A bitwise copy of a `String` would duplicate the heap pointer; both copies would run `drop` at the end of their scope; the same allocation would be freed twice. So `String`, `Vec<T>` and every type that owns heap data are never `Copy`, and `Clone` - an explicit, possibly expensive deep copy - is what exists for them instead.

## Asking for Copy on your own struct

```rust
#[derive(Debug, PartialEq)]
pub struct Point {
    pub x: i32,
    pub y: i32,
}
```

Both fields are `Copy`, so `Point` *could* be, but it is not until you say so. `derive` generates trait implementations mechanically; `Copy` requires `Clone` alongside it, because `Copy` is defined as a `Clone` that is a plain bit copy.

Whether a type is `Copy` is decided at compile time. A test could pin that down with a bound:

```rust
fn assert_is_copy<T: Copy>() {}   // empty body, asserts nothing at runtime
assert_is_copy::<Point>();        // the compiler checks the bound
```

That is deliberately **not** in the test here. While the derive was missing, this test file would not compile, and a single test target that fails to compile aborts a whole-workspace `cargo test` before any test runs - you would see an error from M1 while working on M5. The step therefore checks the derive by reading the source (`fileMatches` for `#[derive(…Copy…)]`) and forbids a `.clone()` in that file so the derive cannot be side-stepped.

`mirror` proves the semantics: it uses `p` twice without cloning, which only compiles once `Point` is `Copy`.

## Your task

Add the derives `Point` needs, implement `mirror`, and answer why a `String` field would make that impossible.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo test --test m1-03-copy-types
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 3 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
