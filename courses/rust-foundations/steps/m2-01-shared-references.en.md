---
id: m2-01-shared-references
title: "Borrow instead of taking"
bloom: apply
objectives: [ "rust-ch04-02-references-and-borrowing" ]
requires: [ "m1-04-ownership-and-functions" ]
estimatedMinutes: 20
scaffold: worked
recallFrom: [ "m1-02-move-vs-clone" ]
links:
  - { step: "m2-02-mutable-references" }
  - { file: "src/m2/m2_01_shared_refs.rs" }
  - { file: "snippets/m2_01_mutate_through_shared_ref.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html", title: "The Book, 4.2: References and Borrowing" }
sources: [ "src/m2/m2_01_shared_refs.rs", "tests/m2-01-shared-references.rs", "snippets/m2_01_mutate_through_shared_ref.rs" ]
tasks:
  - id: guess
    title: "Predict whether you can change a value through &"
    check: { type: "predict", prompt: { en: "snippets/m2_01_mutate_through_shared_ref.rs passes a String to a function as &String and calls push_str on it. Does it compile? Name the error code if not, and say which line the compiler will underline.", de: "snippets/m2_01_mutate_through_shared_ref.rs übergibt einen String als &String an eine Funktion und ruft push_str darauf auf. Kompiliert das? Nenne andernfalls den Fehlercode und sage, welche Zeile der Compiler unterstreichen wird." }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_01_mutate_through_shared_ref.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0596\\]: cannot borrow `\\*some_string` as mutable", timeoutMs: 120000 }, rubric: "Predicts that it does not compile and names E0596 (or describes it as 'cannot borrow as mutable behind a & reference'), pointing at the push_str line inside change, not the call site. Predicting E0502 or E0499 shows the aliasing rule is being confused with plain immutability.", bloom: "evaluate" }
  - id: borrow
    title: "The three borrowing functions pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-01-shared-references", expectPass: [ "m2_01_shared_references::calculate_length_borrows", "m2_01_shared_references::count_char_counts", "m2_01_shared_references::same_length_compares_lengths" ], minPass: 3, timeoutMs: 180000 }
socratic:
  - { trigger: "task:borrow:failed", question: { en: "Which function fails? For `count_char`, are you comparing characters or bytes - and does the closure receive a `char` or a `&char`?", de: "Welche Funktion scheitert? Vergleichst du bei `count_char` Zeichen oder Bytes - und bekommt der Closure ein `char` oder ein `&char`?" }, hints: [ { en: "`s.chars()` yields `char` values; a `filter` closure then receives `&char`, so compare with `*c == needle`.", de: "`s.chars()` liefert `char`-Werte; ein `filter`-Closure erhält dann `&char`, vergleiche also mit `*c == needle`." }, { en: "A plain loop is just as good: `for c in s.chars() { if c == needle { n += 1; } }`.", de: "Eine gewöhnliche Schleife tut es genauso: `for c in s.chars() { if c == needle { n += 1; } }`." }, { en: "`calculate_length` needs one method call; the reference gives you read access to everything a `String` can tell you.", de: "`calculate_length` braucht einen Methodenaufruf; die Referenz gibt dir Lesezugriff auf alles, was ein `String` mitteilen kann." } ] }
misconceptions:
  - { pattern: "error\\[E0596\\]: cannot borrow", question: { en: "You are trying to change something through a shared reference. Should this function be allowed to change the caller's value at all - and if so, what has to change in the signature?", de: "Du versuchst, über eine geteilte Referenz etwas zu ändern. Soll diese Funktion den Wert des Aufrufers überhaupt ändern dürfen - und wenn ja, was muss sich an der Signatur ändern?" }, hints: [ { en: "`&T` grants read access only. Mutation needs `&mut T`, on the parameter and at the call site.", de: "`&T` gewährt nur Lesezugriff. Veränderung braucht `&mut T`, am Parameter und an der Aufrufstelle." }, { en: "None of this step's three functions is meant to change anything: if you reach for mutation here, re-read what the function should return.", de: "Keine der drei Funktionen dieses Steps soll etwas ändern: greifst du hier zur Veränderung, lies erneut, was die Funktion liefern soll." }, { en: "Building a new value and returning it is usually better than mutating through a reference.", de: "Einen neuen Wert zu bauen und zurückzugeben ist meist besser, als über eine Referenz zu verändern." } ] }
---
## Learning goal

Pass a value to a function without giving it away, and know exactly what the borrow allows.

## The problem borrowing solves

Last module's `length_and_back` had to return the string alongside the length, purely so the caller could keep using it. A reference removes that:

```rust
let s1 = String::from("hello");
let len = calculate_length(&s1);
println!("The length of '{s1}' is {len}.");
```

`&s1` creates a *reference*: a value that points at `s1` without owning it. `s1` is untouched and usable afterwards. The parameter is written the same way:

```rust
pub fn calculate_length(s: &String) -> usize {
    s.len()
}
```

Creating a reference is called *borrowing*. When the reference gös out of scope, nothing is dropped - the reference never owned anything.

## A borrow is read-only

`&T` grants read access and nothing else. `snippets/m2_01_mutate_through_shared_ref.rs` tries to break that:

```rust
fn change(some_string: &String) {
    some_string.push_str(", world");
}
```

Predict the result before you compile it. The answer is:

```text
error[E0596]: cannot borrow `*some_string` as mutable, as it is behind a `&` reference
```

Note *which* line is underlined: the `push_str` inside `change`, not the call. The contract was broken where it was violated, not where it was signed.

## `&str` is the better parameter

`calculate_length` takes `&String` because that is Listing 4-5 of the book, and it is kept here to be compared against the next function:

```rust
pub fn count_char(haystack: &str, needle: char) -> usize
```

`&str` accepts a string literal, a `&String` (Rust converts automatically) and a slice of either. `&String` accepts only the first of those. Any function that just reads text should take `&str`; clippy will tell you so, and in the workspace `calculate_length` carries an `#[allow]` with that explanation.

The default is deliberately shared and read-only, which is why the rest of this module is about the one thing that follows from it: what happens when someone does need to write.

## Your task

Predict the snippet's error, then implement `calculate_length`, `count_char` and `same_length`. `count_char` counts characters, so iterate with `chars()`, not over bytes. The next step lends out a value that may be changed.
