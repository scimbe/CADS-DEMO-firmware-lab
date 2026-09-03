---
id: m2-04-slices
title: "Slices: a borrow of part of a collection"
bloom: apply
objectives: [ "rust-ch04-03-slices" ]
requires: [ "m2-03-aliasing-rule" ]
estimatedMinutes: 25
scaffold: independent
recallFrom: [ "m2-03-aliasing-rule", "m2-01-shared-references" ]
links:
  - { step: "m3-01-structs" }
  - { file: "src/m2/m2_04_slices.rs" }
  - { file: "snippets/m2_04_slice_then_clear.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-03-slices.html", title: "The Book, 4.3: The Slice Type" }
sources: [ "src/m2/m2_04_slices.rs", "tests/m2-04-slices.rs", "snippets/m2_04_slice_then_clear.rs" ]
tasks:
  - id: guess
    title: "Predict the fate of a slice whose source is cleared"
    check: { type: "predict", prompt: { en: "snippets/m2_04_slice_then_clear.rs takes a slice with first_word(&s), then calls s.clear(), then prints the slice. Does it compile? If not, which error, and which of the three statements does the compiler underline?", de: "snippets/m2_04_slice_then_clear.rs holt mit first_word(&s) einen Slice, ruft dann s.clear() auf und gibt den Slice aus. Kompiliert das? Wenn nein: welcher Fehler, und welche der drei Anweisungen unterstreicht der Compiler?" }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_04_slice_then_clear.rs", expectExitCode: 1, expectStderr: "error\\[E0502\\]: cannot borrow `s` as mutable because it is also borrowed as immutable", timeoutMs: 120000 }, rubric: "Predicts E0502 with the caret on s.clear(), and identifies the println! as the reason the shared borrow is still alive at that point. A prediction that it compiles and prints a stale word is the C-style model and worth naming explicitly.", bloom: "evaluate" }
  - id: slices
    title: "first_word, last_word, sum and tail pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-04-slices", expectPass: [ "m2_04_slices::first_word_of_sentence", "m2_04_slices::first_word_of_single_word", "m2_04_slices::last_word_of_sentence", "m2_04_slices::sum_and_tail_of_slices" ], minPass: 4, timeoutMs: 180000 }
socratic:
  - { trigger: "task:slices:failed", question: { en: "Which function fails, and on which input? The single-word and empty-string cases are the ones most solutions miss.", de: "Welche Funktion scheitert, und bei welcher Eingabe? Die Faelle mit einem Wort und mit leerer Zeichenkette werden von den meisten Loesungen uebersehen." }, hints: [ { en: "`s.find(' ')` returns `Option<usize>`; the `None` arm is the no-space case, where the answer is the whole string.", de: "`s.find(' ')` liefert `Option<usize>`; der `None`-Zweig ist der Fall ohne Leerzeichen, in dem die ganze Zeichenkette die Antwort ist." }, { en: "For `last_word`, `rfind` searches from the end; the slice starts one byte after the separator.", de: "Fuer `last_word` sucht `rfind` von hinten; der Slice beginnt ein Byte hinter dem Trennzeichen." }, { en: "`tail` on an empty slice must stay empty: `&xs[1..]` on an empty slice panics, so check `is_empty()` first.", de: "`tail` muss beim leeren Slice leer bleiben: `&xs[1..]` auf einem leeren Slice stuerzt ab, pruefe also zuerst `is_empty()`." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]", question: { en: "A slice is still alive when the collection is modified. Where is the slice used last, and does the modification have to happen before that?", de: "Ein Slice lebt noch, waehrend die Sammlung veraendert wird. Wo wird der Slice zuletzt benutzt, und muss die Aenderung wirklich davor passieren?" }, hints: [ { en: "A slice is a borrow of the collection, not a copy of the data - which is precisely why this is caught.", de: "Ein Slice ist eine Leihe auf die Sammlung, keine Kopie der Daten - genau deshalb wird das erkannt." }, { en: "If you need the text after the collection changes, make it owned with `.to_string()` first.", de: "Brauchst du den Text nach der Aenderung der Sammlung, mache ihn zuvor mit `.to_string()` besitzend." }, { en: "Reordering the statements so the last use of the slice comes before the mutation is usually the better fix.", de: "Die Anweisungen so umzuordnen, dass die letzte Verwendung des Slice vor der Aenderung liegt, ist meist die bessere Loesung." } ] }
  - { pattern: "byte index \\d+ is out of bounds|byte index \\d+ is not a char boundary", question: { en: "A slice index is not where you assumed. Are you indexing by bytes into text whose characters are not all one byte, or past the end?", de: "Ein Slice-Index liegt nicht dort, wo du annimmst. Indizierst du byteweise in Text, dessen Zeichen nicht alle ein Byte lang sind - oder hinter das Ende?" }, hints: [ { en: "String slicing uses byte offsets; the offsets from `find`/`rfind` are always valid boundaries, hand-computed ones may not be.", de: "String-Slicing nutzt Byte-Offsets; die Offsets von `find`/`rfind` sind stets gueltige Grenzen, selbst berechnete nicht unbedingt." }, { en: "`&s[i + 1..]` is right after a single-byte space, but not after a multi-byte separator.", de: "`&s[i + 1..]` stimmt hinter einem Ein-Byte-Leerzeichen, aber nicht hinter einem mehrbyteigen Trennzeichen." }, { en: "Check the empty-input case separately before you index at all.", de: "Pruefe den Fall der leeren Eingabe gesondert, bevor du ueberhaupt indizierst." } ] }
---
## Learning goal

Return a reference to part of a collection, and see the borrow checker connect that reference back to the collection it came from.

## The problem in the book

Chapter 4.3 opens with `first_word` returning a `usize` index. It compiles and it is a trap: the index is just a number, unconnected to the string. Clear the string and the index survives, now meaningless. With two indices for a second word, the bug doubles.

A slice fixes this by being a reference:

```rust
pub fn first_word(s: &str) -> &str
```

`&s[0..5]` stores a pointer to byte 0 and a length of 5. It borrows `s`, so the compiler knows the two are connected, and every rule from the previous step applies.

## What that buys you

`snippets/m2_04_slice_then_clear.rs`:

```rust
let word = first_word(&s);
s.clear();                              // error[E0502]
println!("the first word is: {word}");
```

Predict the outcome before compiling. `clear` needs a mutable borrow; `word` still holds a shared one, because the `println!` on the next line uses it. The compiler rejects the *shape*, and the bug that would have been a stale index in another language never exists.

## `&str` is a slice

This is why `&str` has been the recommended parameter type since m2-01. A string literal is a `&str` pointing into the binary. `&my_string[..]` is a `&str` over the whole `String`. `&my_string[0..5]` is a `&str` over part of it. One parameter type takes all three, and `first_word(&s)` works whether `s` is a `String` or a literal.

The same applies to arrays and vectors: `&[i32]` is a slice, and `sum(&v)`, `sum(&v[1..3])` and `sum(&[])` all fit the one signature.

## Byte offsets, not character offsets

String slicing works in bytes. `s.find(' ')` and `s.rfind(' ')` give you offsets that are guaranteed to be valid character boundaries; offsets you compute yourself may not be, and slicing into the middle of a multi-byte character panics at runtime with `byte index N is not a char boundary`. Module M4 goes into this properly; here it is enough to take your offsets from `find`.

## The edge cases the tests pin down

`first_word("hello")` - no space, so the whole string. `first_word("")` - the empty string. `last_word("fox")` - the whole string again. `tail(&[])` - the empty slice, and note that `&xs[1..]` on an empty slice panics, so it needs a guard.

## Your task

Predict the snippet, then implement the four functions. Module M3 leaves borrowing behind for a while and builds data types of your own.
