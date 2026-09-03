---
id: m2-03-aliasing-rule
title: "The aliasing rule: readers or one writer"
bloom: analyze
objectives: [ "rust-ch04-02-references-and-borrowing" ]
requires: [ "m2-02-mutable-references" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m2-02-mutable-references" ]
links:
  - { step: "m2-04-slices" }
  - { file: "src/m2/m2_03_aliasing.rs" }
  - { file: "examples/m2_borrow_scopes.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html", title: "The Book, 4.2: The Rules of References" }
sources: [ "src/m2/m2_03_aliasing.rs", "tests/m2-03-aliasing-rule.rs", "examples/m2_borrow_scopes.rs", "snippets/m2_03_two_mut_borrows.rs" ]
tasks:
  - id: two-mut
    title: "Confirm that two mutable borrows are rejected"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_03_two_mut_borrows.rs", expectExitCode: 1, expectStderr: "error\\[E0499\\]: cannot borrow `s` as mutable more than once at a time", timeoutMs: 120000 }
  - id: aliasing
    title: "The three aliasing exercises pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-03-aliasing-rule", expectPass: [ "m2_03_aliasing_rule::first_then_push_returns_first_and_pushes", "m2_03_aliasing_rule::longest_len_then_clear_works", "m2_03_aliasing_rule::longest_len_of_empty_is_zero", "m2_03_aliasing_rule::double_all_and_sum_mutates_and_sums" ], minPass: 4, timeoutMs: 180000 }
  - id: price
    title: "You can name what the rule buys"
    check: { type: "question", prompt: { en: "In first_then_push, `let first = &v[0]; v.push(x); *first` is rejected with E0502 even though on most runs it would appear to work. Name the concrete thing that can go wrong at runtime if the compiler allowed it, and why push in particular is dangerous here.", de: "In first_then_push wird `let first = &v[0]; v.push(x); *first` mit E0502 abgelehnt, obwohl es in den meisten Laeufen zu funktionieren schiene. Nenne konkret, was zur Laufzeit schiefgehen kann, wenn der Compiler es erlaubte, und warum ausgerechnet push hier gefaehrlich ist." }, rubric: "States that push may exceed the vector's capacity, reallocate the buffer and copy the elements to a new address, after which the earlier reference points at freed memory - a dangling pointer / use after free. Credit for noting that whether it happens depends on capacity, so testing would find it only sometimes, which is exactly why a compile-time rule is used instead.", bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:aliasing:failed", question: { en: "Which function does not compile, and which two borrows overlap in it? Ask for each: could the reading one end before the writing one starts?", de: "Welche Funktion kompiliert nicht, und welche beiden Leihen ueberlappen darin? Frage jeweils: koennte die lesende enden, bevor die schreibende beginnt?" }, hints: [ { en: "Copy the value out first: `let first = v[0];` (no `&`) reads an `i32` and ends the borrow immediately.", de: "Kopiere den Wert zuerst heraus: `let first = v[0];` (ohne `&`) liest ein `i32` und beendet die Leihe sofort." }, { en: "In `longest_len_then_clear`, finish the loop over `words.iter()` completely before calling `clear`.", de: "Beende in `longest_len_then_clear` die Schleife ueber `words.iter()` vollstaendig, bevor du `clear` aufrufst." }, { en: "`double_all_and_sum` needs one loop with `iter_mut()`; write through `*x` and add to the running total in the same pass.", de: "`double_all_and_sum` braucht eine Schleife mit `iter_mut()`; schreibe ueber `*x` und addiere im selben Durchgang zur Summe." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]: cannot borrow `\\w+` as mutable because it is also borrowed as immutable", question: { en: "A reader and a writer overlap. Where is the reader's last use - and can you move it earlier, or replace the reference with a copied value?", de: "Ein Leser und ein Schreiber ueberlappen. Wo liegt die letzte Verwendung des Lesers - und kannst du sie vorziehen oder die Referenz durch einen kopierten Wert ersetzen?" }, hints: [ { en: "The diagnostic's third label, `immutable borrow later used here`, is what keeps the borrow alive; that line is the real constraint.", de: "Die dritte Beschriftung der Diagnose, `immutable borrow later used here`, haelt die Leihe am Leben; diese Zeile ist die eigentliche Einschraenkung." }, { en: "For a `Copy` element, dropping the `&` turns a borrow into an independent value and the conflict disappears.", de: "Bei einem `Copy`-Element macht das Weglassen des `&` aus einer Leihe einen unabhaengigen Wert, und der Konflikt verschwindet." }, { en: "For a non-Copy element, compute what you need from it - a length, a clone of just that field - before the mutation.", de: "Bei einem Nicht-Copy-Element berechne vor der Aenderung, was du brauchst - eine Laenge, einen Klon nur dieses Felds." } ] }
  - { pattern: "error\\[E0499\\]", question: { en: "Two writers at once. Can the work be done in one pass with a single mutable borrow instead of two?", de: "Zwei Schreiber gleichzeitig. Laesst sich die Arbeit in einem Durchgang mit einer einzigen veraenderlichen Leihe erledigen statt mit zweien?" }, hints: [ { en: "One `for x in v.iter_mut()` loop holds exactly one mutable borrow for its whole duration.", de: "Eine Schleife `for x in v.iter_mut()` haelt fuer ihre gesamte Dauer genau eine veraenderliche Leihe." }, { en: "Accumulate into a local variable inside the loop rather than borrowing the collection a second time to sum it.", de: "Sammle in einer lokalen Variablen innerhalb der Schleife, statt die Sammlung ein zweites Mal zum Summieren zu leihen." }, { en: "Methods that take indices (`swap`, `split_at_mut`) exist to express two-element access under one borrow.", de: "Methoden mit Indizes (`swap`, `split_at_mut`) gibt es, um Zugriff auf zwei Elemente unter einer Leihe auszudruecken." } ] }
---
## Learning goal

State the aliasing rule, recognise the two errors that enforce it, and restructure code so the borrows do not overlap.

## The rule

At any point, for any value, you may have **either** any number of shared references (`&T`) **or** exactly one mutable reference (`&mut T`) - never both. Two errors enforce it:

- **E0499** - two mutable borrows at once.
- **E0502** - a mutable borrow while a shared one is still live.

`snippets/m2_03_two_mut_borrows.rs` is the minimal E0499; the first check compiles it and expects that failure, so you see the message in your own terminal rather than only in this text.

## Why "would work anyway" is not an argument

The obvious way to write `first_then_push` is:

```rust
let first = &v[0];
v.push(x);
*first          // error[E0502]
```

Run that in a language without the rule and it usually works. Usually. `push` may find the vector at capacity, allocate a larger buffer, copy the elements across and free the old one. `first` then points into freed memory. Whether that happens depends on the capacity at that moment, so a test suite finds it on some inputs and not others, and a debugger shows a plausible-looking value. This is the bug class the rule exists to remove, and the reason it is enforced at compile time rather than detected at run time.

## Non-lexical lifetimes

The rule is about *overlap*, not about scopes. A borrow ends after its last use:

```rust
let r1 = &s;
let r2 = &s;
println!("{r1} and {r2}");   // last use of r1 and r2
let r3 = &mut s;             // fine
```

`examples/m2_borrow_scopes.rs` is exactly this, runnable. Reading it next to the failing snippet is the fastest way to see that the difference is *when the last use is*, not how many braces are involved.

## Restructuring, three ways

The exercises are three shapes of the same fix.

`first_then_push`: copy the value out. `let first = v[0];` without the `&` reads an `i32` - a `Copy` type, so there is no borrow left to conflict with `push`.

`longest_len_then_clear`: finish reading before writing. Loop over `words.iter()`, keep the maximum in a local `usize`, and only then call `clear()`. The local outlives the borrow because it is a number, not a reference into the vector.

`double_all_and_sum`: do both jobs in one pass. `for x in v.iter_mut()` holds a single mutable borrow; write through `*x` and add to a local total inside the same loop, instead of mutating and then borrowing again to sum.

## Your task

Run the snippet check, implement the three functions, and then name what can actually go wrong if E0502 were allowed. The next step introduces slices, whose whole purpose is to make a borrow of *part* of a collection safe.
