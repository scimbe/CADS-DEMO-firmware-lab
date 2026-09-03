---
id: m6-01-generics
title: "Generics: one function, many types"
bloom: understand
objectives: [ "rust-ch10-01-syntax" ]
requires: [ "m5-04-custom-error" ]
estimatedMinutes: 25
scaffold: worked
recallFrom: [ "m4-01-vectors", "m1-03-copy-types" ]
links:
  - { step: "m6-02-traits" }
  - { file: "src/m6/m6_01_generics.rs" }
  - { file: "tests/m6-01-generics.rs" }
  - { url: "https://doc.rust-lang.org/book/ch10-01-syntax.html", title: "The Book, 10.1: Generic Data Types" }
sources: [ "src/m6/m6_01_generics.rs", "tests/m6-01-generics.rs" ]
tasks:
  - id: generics
    title: "The generic functions and structs pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-01-generics", expectPass: [ "m6_01_generics::largest_works_for_numbers_and_chars", "m6_01_generics::largest_returns_a_reference_into_the_slice", "m6_01_generics::swap_exchanges_both_values", "m6_01_generics::first_of_clones", "m6_01_generics::label_mixes_two_type_parameters" ], minPass: 5, timeoutMs: 180000 }
  - id: bounds-why
    title: "You can explain why largest needs a bound"
    check: { type: "question", prompt: { en: "swap<T> needs no trait bound at all, while largest<T> needs T: PartialOrd. Explain what the compiler knows about an unbounded T, and why returning &T rather than T in largest avoids a second bound.", de: "swap<T> braucht gar keine Trait-Schranke, largest<T> aber T: PartialOrd. Erkläre, was der Compiler über ein ungebundenes T weiß, und warum die Rückgabe von &T statt T in largest eine zweite Schranke erspart." }, rubric: "States that an unbounded T supports only what every type supports - being moved and dropped - which is enough for swap because it only moves values around, while largest compares with > and comparison is exactly what PartialOrd provides. The second half should note that returning an owned T would require copying or cloning the element out of the slice, hence Copy or Clone, whereas returning a reference borrows it and needs nothing.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:generics:failed", question: { en: "Which one fails? For `largest`, are you comparing the items themselves or the references to them - and does the result borrow from the slice?", de: "Welche scheitert? Vergleichst du in `largest` die Elemente selbst oder die Referenzen darauf - und leiht das Ergebnis aus dem Slice?" }, hints: [ { en: "Start with `let mut largest = &list[0];` and compare `item > largest`; both sides are then `&T` and `PartialOrd` applies through the reference.", de: "Beginne mit `let mut largest = &list[0];` und vergleiche `item > largest`; beide Seiten sind dann `&T`, und `PartialOrd` gilt durch die Referenz hindurch." }, { en: "`first_of` has a `Clone` bound because it hands back an owned value: `list.first().cloned()`.", de: "`first_of` hat eine `Clone`-Schranke, weil es einen besitzenden Wert zurückgibt: `list.first().cloned()`." }, { en: "`label` has two independent parameters; the function body just builds the struct from them.", de: "`label` hat zwei unabhängige Parameter; der Rumpf baut daraus lediglich die Struktur." } ] }
misconceptions:
  - { pattern: "error\\[E0369\\]: binary operation `>` cannot be applied to type", question: { en: "You compared two values of a generic type with no bound. Which trait provides comparison, and where does it belong in the signature?", de: "Du hast zwei Werte eines generischen Typs ohne Schranke verglichen. Welches Trait liefert den Vergleich, und wohin gehört es in der Signatur?" }, hints: [ { en: "`T: PartialOrd` after the type parameter is what makes `<` and `>` legal in the body.", de: "`T: PartialOrd` hinter dem Typparameter macht `<` und `>` im Rumpf zulässig." }, { en: "The diagnostic usually suggests the exact bound to add - check it against what the body actually needs.", de: "Die Diagnose schlägt meist genau die fehlende Schranke vor - prüfe sie an dem, was der Rumpf wirklich braucht." }, { en: "A generic parameter with no bound supports only moving and dropping; every operation has to be justified by a bound.", de: "Ein generischer Parameter ohne Schranke unterstützt nur Verschieben und Aufräumen; jede Operation muss durch eine Schranke begründet sein." } ] }
  - { pattern: "error\\[E0507\\]: cannot move out of", question: { en: "You tried to take an owned value out of a slice you only borrowed. Does the caller keep its data - and if so, is a reference or a clone the right answer?", de: "Du wolltest einen besitzenden Wert aus einem nur geliehenen Slice nehmen. Behält der Aufrufer seine Daten - und ist dann eine Referenz oder ein Klon die richtige Antwort?" }, hints: [ { en: "`largest` returns `&T`, so nothing needs to be moved out at all.", de: "`largest` liefert `&T`, es muss also gar nichts herausbewegt werden." }, { en: "`first_of` really does hand back a value, which is why it carries the `Clone` bound and uses `.cloned()`.", de: "`first_of` gibt tatsächlich einen Wert heraus, deshalb trägt es die `Clone`-Schranke und nutzt `.cloned()`." }, { en: "Indexing a slice of a non-Copy type gives a place, not a value; `&list[0]` borrows it instead.", de: "Ein Slice eines Nicht-Copy-Typs zu indizieren liefert einen Ort, keinen Wert; `&list[0]` leiht ihn stattdessen." } ] }
---
## Learning goal

Read and write a generic signature, and say what the compiler is allowed to assume about a type parameter.

## The duplication generics remove

Two functions that find the largest element - one for `i32`, one for `char` - differ only in a type name. Chapter 10.1 walks that refactor; the result is:

```rust
pub fn largest<T: PartialOrd>(list: &[T]) -> &T
```

`<T>` after the name declares the parameter. It is a placeholder filled in at each call site, and the compiler generates a specialised copy of the function per concrete type - *monomorphisation*. There is no runtime cost and no dynamic dispatch; the generic version is exactly as fast as the two hand-written ones.

## What an unbounded T can do

Very little. `T` with no bound supports only what every type supports: being moved and being dropped. That is enough for `swap`:

```rust
pub fn swap<T>(p: Pair<T>) -> Pair<T> {
    Pair { first: p.second, second: p.first }
}
```

It only moves values from one field to another, and moving works for any type.

`largest` compares, and comparison is not universal, so it must ask:

```text
error[E0369]: binary operation `>` cannot be applied to type `&T`
```

`T: PartialOrd` is the answer. Read a bound as a promise the caller must keep and the body may rely on - nothing more and nothing less.

## Why `&T` and not `T`

Returning `T` would mean taking an element out of a slice the caller still owns, which is `error[E0507]: cannot move out of`. You would then need `T: Copy` or `T: Clone` on top of `PartialOrd`, narrowing who can call the function. Returning `&T` borrows instead and needs nothing extra. The test proves the difference: `largest(&words)` works on a `Vec<String>`, which is neither `Copy` nor cheap to clone, and the vector still owns its strings afterwards.

`first_of` is the deliberate contrast: it hands back an owned value, so it carries `T: Clone` and uses `.cloned()`. Two functions, two contracts, and each bound is there because the body needs it.

## Generic structs

```rust
pub struct Pair<T> { pub first: T, pub second: T }
pub struct Labelled<L, V> { pub label: L, pub value: V }
```

One parameter means both fields have the *same* type; `Pair { first: 1, second: "x" }` does not compile. Two parameters let them differ, which is how `Option<T>`, `Result<T, E>` and `HashMap<K, V>` are declared. Use as many as you need and no more - every extra parameter is something the reader has to track.

## Your task

Implement the four items, then explain why `swap` needs no bound and `largest` does. The next step is about defining the behaviour a bound refers to.
