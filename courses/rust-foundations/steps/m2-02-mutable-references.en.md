---
id: m2-02-mutable-references
title: "Mutable references"
bloom: apply
objectives: [ "rust-ch04-02-references-and-borrowing" ]
requires: [ "m2-01-shared-references" ]
estimatedMinutes: 20
scaffold: faded
recallFrom: [ "m2-01-shared-references", "m1-03-copy-types" ]
links:
  - { step: "m2-03-aliasing-rule" }
  - { file: "src/m2/m2_02_mutable_refs.rs" }
  - { file: "tests/m2-02-mutable-references.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html", title: "The Book, 4.2: Mutable References" }
sources: [ "src/m2/m2_02_mutable_refs.rs", "tests/m2-02-mutable-references.rs" ]
tasks:
  - id: mutate
    title: "change, append_twice and swap_ends pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-02-mutable-references", expectPass: [ "m2_02_mutable_references::change_appends_world", "m2_02_mutable_references::append_twice_appends_twice", "m2_02_mutable_references::swap_ends_swaps", "m2_02_mutable_references::swap_ends_short_vectors" ], minPass: 4, timeoutMs: 180000 }
  - id: swap-why
    title: "You can explain why Vec::swap exists"
    check: { type: "question", prompt: { en: "Writing swap_ends with two &mut into the same vector is rejected with E0499. Explain why the standard library offers Vec::swap(i, j) taking two indices instead, and what that changes about who holds the mutable borrow.", de: "swap_ends mit zwei &mut in denselben Vektor zu schreiben wird mit E0499 abgelehnt. Erklaere, warum die Standardbibliothek stattdessen Vec::swap(i, j) mit zwei Indizes anbietet, und was das daran aendert, wer die veraenderliche Leihe haelt." }, rubric: "States that two simultaneous &mut to the same vector violate the exclusivity rule, and that swap takes indices so there is exactly one mutable borrow - the &mut self of the method - inside which the two elements are exchanged, keeping the exclusivity invariant while still doing the job. Credit for noting that copying through a temporary works too because i32 is Copy.", bloom: "analyze", minChars: 50 }
socratic:
  - { trigger: "task:mutate:failed", question: { en: "Is this a compile error or a failing assertion? If `swap_ends` will not compile, how many mutable borrows of the vector are alive at the same time in your version?", de: "Ist das ein Uebersetzungsfehler oder eine fehlgeschlagene Zusicherung? Laesst sich `swap_ends` nicht uebersetzen: wie viele veraenderliche Leihen des Vektors leben in deiner Fassung gleichzeitig?" }, hints: [ { en: "`v.swap(0, last)` does the whole job with a single borrow.", de: "`v.swap(0, last)` erledigt alles mit einer einzigen Leihe." }, { en: "Compute `v.len() - 1` before you touch anything, and guard the case of fewer than two elements - `0 - 1` on a usize panics.", de: "Berechne `v.len() - 1` vor allem anderen und sichere den Fall von weniger als zwei Elementen ab - `0 - 1` auf einem usize stuerzt ab." }, { en: "In `change` and `append_twice` you may call `push_str` directly on the `&mut String`; no dereference is needed.", de: "In `change` und `append_twice` darfst du `push_str` direkt auf dem `&mut String` aufrufen; ein Dereferenzieren ist nicht noetig." } ] }
misconceptions:
  - { pattern: "error\\[E0499\\]: cannot borrow `\\w+` as mutable more than once", question: { en: "Two mutable borrows of the same value are alive at once. Which two, and does the second one really need to exist while the first is still in use?", de: "Zwei veraenderliche Leihen desselben Werts leben gleichzeitig. Welche zwei, und muss die zweite wirklich existieren, solange die erste noch benutzt wird?" }, hints: [ { en: "The diagnostic labels `first mutable borrow occurs here` and `second mutable borrow occurs here` - the fix is almost always to end the first one earlier.", de: "Die Diagnose beschriftet `first mutable borrow occurs here` und `second mutable borrow occurs here` - die Loesung ist fast immer, die erste frueher enden zu lassen." }, { en: "A borrow ends after its last use, not at the closing brace, so moving the last use up can be enough.", de: "Eine Leihe endet nach ihrer letzten Verwendung, nicht an der schliessenden Klammer; die letzte Verwendung nach oben zu ziehen kann genuegen." }, { en: "For two elements of one collection, use the method that takes indices instead of two references.", de: "Fuer zwei Elemente einer Sammlung nutze die Methode, die Indizes nimmt, statt zweier Referenzen." } ] }
  - { pattern: "error\\[E0596\\]: cannot borrow", question: { en: "Something is being changed through a shared reference, or through a binding that is not `mut`. Which of the two is it here?", de: "Etwas wird ueber eine geteilte Referenz oder ueber eine nicht-`mut`-Bindung geaendert. Welches von beidem ist es hier?" }, hints: [ { en: "A `&mut` may only be taken from a binding that is itself declared `mut`.", de: "Ein `&mut` darf nur von einer Bindung genommen werden, die selbst `mut` deklariert ist." }, { en: "The call site needs `&mut s`, not `&s` - the ampersand alone is the shared kind.", de: "Die Aufrufstelle braucht `&mut s`, nicht `&s` - das Kaufmanns-Und allein ist die geteilte Form." }, { en: "The parameter type has to say `&mut` too; both sides must agree.", de: "Auch der Parametertyp muss `&mut` lauten; beide Seiten muessen uebereinstimmen." } ] }
---
## Learning goal

Lend a value out for writing, and see the one restriction that comes with it.

## Three places the `mut` has to appear

```rust
let mut s = String::from("hello");
change(&mut s);

fn change(some_string: &mut String) {
    some_string.push_str(", world");
}
```

The binding must be `mut`, the call site must say `&mut s`, and the parameter type must be `&mut String`. Miss any one of them and you get E0596. This is verbose on purpose: at every call site you can see that this function may change your value.

Note that you call `push_str` directly on the reference. Rust dereferences automatically for method calls, so `(*some_string).push_str(...)` is never needed.

## The one restriction

If you have a mutable reference to a value, you may have no other reference to that value at the same time - mutable or shared. This code is rejected:

```rust
let r1 = &mut s;
let r2 = &mut s;
println!("{r1}, {r2}");
```

```text
error[E0499]: cannot borrow `s` as mutable more than once at a time
```

The benefit is stated plainly in ch. 4.2: data races cannot occur, because a data race needs two pointers to the same data with at least one of them writing. Rust does not detect the race at runtime; it refuses to compile the shape that permits one.

The restriction is narrower than it looks, because a borrow ends after its **last use**, not at the end of the block:

```rust
let r1 = &mut s;
r1.push_str(" world");   // last use of r1
let r2 = &mut s;         // fine: r1 is over
```

## The exercise

`change` and `append_twice` are direct: take the `&mut String`, call the method.

`swap_ends` is where the rule bites. The obvious idea - grab `&mut v[0]` and `&mut v[last]` and exchange them - is E0499. There are two honest ways out, and both are worth knowing:

- `v.swap(0, last)`: the standard library's method takes two *indices*, so the only mutable borrow is the `&mut self` of the call itself.
- Copy the two values through temporaries and write them back. `i32` is `Copy`, so reading `v[0]` produces an independent value and no borrow survives it - the M1 material paying off.

Guard the short cases: `v.len() - 1` on an empty vector underflows and panics, because `usize` cannot be negative.

## Your task

Implement the three functions and then explain why `Vec::swap` is shaped the way it is. The next step generalises the restriction into the aliasing rule.
