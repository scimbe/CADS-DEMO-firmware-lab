---
id: m4-01-vectors
title: "Vectors: a growable list"
bloom: apply
objectives: [ "rust-ch08-01-vectors" ]
requires: [ "m3-04-if-let" ]
estimatedMinutes: 20
scaffold: worked
recallFrom: [ "m2-03-aliasing-rule" ]
links:
  - { step: "m4-02-strings" }
  - { file: "src/m4/m4_01_vectors.rs" }
  - { file: "tests/m4-01-vectors.rs" }
  - { url: "https://doc.rust-lang.org/book/ch08-01-vectors.html", title: "The Book, 8.1: Storing Lists of Values with Vectors" }
sources: [ "src/m4/m4_01_vectors.rs", "tests/m4-01-vectors.rs", "src/m2/m2_04_slices.rs" ]
tasks:
  - id: vectors
    title: "The five vector functions pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m4-01-vectors", expectPass: [ "m4_01_vectors::build_range_counts_from_one", "m4_01_vectors::sum_all_takes_a_slice", "m4_01_vectors::get_at_does_not_panic", "m4_01_vectors::double_in_place_mutates", "m4_01_vectors::evens_keeps_order" ], minPass: 5, timeoutMs: 180000 }
  - id: index-vs-get
    title: "You can choose between v[i] and v.get(i)"
    check: { type: "question", prompt: { en: "get_at must return None for an out-of-range index, so v[i] is wrong there. Name a place in the same file where v[i] would be the better choice, and state the rule you would give a colleague for picking between the two.", de: "get_at muss für einen Index außerhalb des Bereichs None liefern, v[i] ist dort also falsch. Nenne eine Stelle in derselben Datei, an der v[i] die bessere Wahl wäre, und formuliere die Regel, die du einem Kollegen für die Wahl zwischen beiden geben würdest." }, rubric: "Names a place where the index is known to be in range (an index derived from the vector's own length, or iteration) and states a rule of the form: use v[i] when an out-of-range index would be a bug in the program - a panic is then the correct, loud response - and v.get(i) when the index comes from outside and being out of range is an expected condition the caller must handle.", bloom: "evaluate", minChars: 60 }
socratic:
  - { trigger: "task:vectors:failed", question: { en: "Which one fails? For `build_range`, what does `1..=n` produce when `n` is 0 or negative?", de: "Welche scheitert? Was liefert `1..=n` in `build_range`, wenn `n` 0 oder negativ ist?" }, hints: [ { en: "An inclusive range whose end is below its start is simply empty, so no special case is needed.", de: "Ein einschließender Bereich, dessen Ende unter dem Start liegt, ist schlicht leer; ein Sonderfall ist unnötig." }, { en: "`double_in_place` must write through the reference: `for x in v.iter_mut() { *x *= 2; }`.", de: "`double_in_place` muss über die Referenz schreiben: `for x in v.iter_mut() { *x *= 2; }`." }, { en: "`v.get(i)` gives `Option<&i32>`; `.copied()` turns it into the `Option<i32>` the signature promises.", de: "`v.get(i)` liefert `Option<&i32>`; `.copied()` macht daraus das von der Signatur versprochene `Option<i32>`." } ] }
misconceptions:
  - { pattern: "index out of bounds: the len is \\d+ but the index is \\d+", question: { en: "An index went past the end at runtime. Was the index supposed to be trusted here, or should the function have returned an Option instead?", de: "Ein Index lief zur Laufzeit über das Ende hinaus. Sollte dem Index hier vertraut werden, oder hätte die Funktion ein Option liefern müssen?" }, hints: [ { en: "`v[i]` panics on an out-of-range index; `v.get(i)` returns `None`.", de: "`v[i]` stürzt bei einem Index außerhalb des Bereichs ab; `v.get(i)` liefert `None`." }, { en: "The panic message names both the length and the index, which usually identifies the off-by-one immediately.", de: "Die Panic-Meldung nennt Länge und Index, was den Off-by-one meist sofort zeigt." }, { en: "`get_at` promises never to panic; its signature already says so with `Option`.", de: "`get_at` verspricht, nie abzustürzen; seine Signatur sagt das mit `Option` bereits." } ] }
  - { pattern: "error\\[E0502\\]", question: { en: "A read of the vector overlaps a write to it. Which line still holds the shared borrow when the mutation happens?", de: "Ein Lesen des Vektors überlappt ein Schreiben darauf. Welche Zeile hält beim Ändern noch die geteilte Leihe?" }, hints: [ { en: "`iter()` borrows the whole vector for the duration of the loop; `push` inside it cannot work.", de: "`iter()` leiht den gesamten Vektor für die Dauer der Schleife; ein `push` darin kann nicht funktionieren." }, { en: "Collect into a second vector and replace the first afterwards, rather than mutating during iteration.", de: "Sammle in einen zweiten Vektor und ersetze den ersten danach, statt während der Iteration zu ändern." }, { en: "`iter_mut()` is the one loop that may change elements - but not the length.", de: "`iter_mut()` ist die eine Schleife, die Elemente ändern darf - die Länge aber nicht." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Build, read, iterate and mutate a `Vec<T>`, and pick deliberately between indexing that panics and indexing that returns an `Option`.

## Creating and growing

```rust
let mut v: Vec<i32> = Vec::new();
v.push(1);

let v = vec![1, 2, 3];       // the macro, when you know the contents
```

`Vec::new()` needs a type annotation because there is nothing to infer from; after the first `push` there would be. Elements live next to each other on the heap, all of one type, and the vector is dropped - along with everything in it - when it gös out of scope.

## Two ways to read one element

```rust
let third = &v[2];             // panics if out of range
let third = v.get(2);          // Option<&i32>
```

They are not interchangeable and the choice is a design decision, not a style one:

- Use `v[i]` when an out-of-range index would mean the program has a bug. Panicking loudly at that point is better than continuing with nonsense.
- Use `v.get(i)` when the index comes from outside - a user, a file, an argument - and being out of range is a condition your caller should handle.

`get_at` in this step is the second kind, and its signature says so. `.copied()` after `get` turns `Option<&i32>` into `Option<i32>`, which ends the borrow and lets you return a value rather than a reference into the caller's data.

## Iterating

```rust
for x in &v { … }               // shared borrow, read only
for x in v.iter_mut() { *x *= 2; }   // one mutable borrow for the whole loop
```

The `*` in the second form is not optional: `x` is a `&mut i32`, and `x *= 2` would try to multiply a reference. The loop holds a single mutable borrow for its whole duration, which is why `push` inside such a loop is E0502 - the aliasing rule from M2, met again in its most common everyday form.

## Slices, again

`sum_all` takes `&[i32]`, not `&Vec<i32>`. That is the m2-04 lesson applied: the slice accepts a whole vector, a part of one, an array and a literal, and the function is usable in more places for free. Clippy suggests this conversion by name (`ptr_arg`), and the workspace only keeps `&mut Vec` where the reference itself is the subject of the exercise.

## Your task

Implement the five functions, then argü where `v[i]` would be the better call. The next step is the collection that looks simplest and is not: `String`.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo test --test m4-01-vectors
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 5 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
