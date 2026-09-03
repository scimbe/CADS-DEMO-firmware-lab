---
id: m6-04-lifetimes
title: "Lifetimes: how long a borrow is valid"
bloom: analyze
objectives: [ "rust-ch10-03-lifetime-syntax" ]
requires: [ "m6-03-trait-bounds" ]
estimatedMinutes: 35
scaffold: independent
recallFrom: [ "m2-03-aliasing-rule", "m6-03-trait-bounds" ]
links:
  - { step: "m7-01-wordstat" }
  - { file: "src/m6/m6_04_lifetimes.rs" }
  - { file: "repair/m6_04_missing_lifetime.rs" }
  - { file: "snippets/m6_04_missing_lifetime.rs" }
  - { url: "https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html", title: "The Book, 10.3: Validating References with Lifetimes" }
sources: [ "src/m6/m6_04_lifetimes.rs", "tests/m6-04-lifetimes.rs", "repair/m6_04_missing_lifetime.rs", "snippets/m6_04_missing_lifetime.rs" ]
tasks:
  - id: guess
    title: "Predict the two errors in the repair file"
    check: { type: "predict", prompt: { en: "snippets/m6_04_missing_lifetime.rs - the read-only twin of the file you will repair - declares a struct holding a &str and a longest function returning a &str. Before you compile it: how many errors do you expect, which error code, and which lines carry them?", de: "snippets/m6_04_missing_lifetime.rs - der schreibgeschuetzte Zwilling der Datei, die du reparieren wirst - deklariert eine Struktur mit einem &str und eine Funktion longest, die einen &str liefert. Bevor du uebersetzt: wie viele Fehler erwartest du, welcher Fehlercode, und an welchen Zeilen stehen sie?" }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m6_04_missing_lifetime.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0106\\]: missing lifetime specifier", timeoutMs: 120000 }, rubric: "Predicts two E0106 errors: one on the struct field `part: &str` and one on the return type of `longest`. Predicting one error only misses that a struct holding a reference needs a lifetime parameter too, which is the point of the second half of the chapter.", bloom: "evaluate" }
  - id: repair
    title: "The repaired file compiles and runs"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 -o target/check/m6_04 repair/m6_04_missing_lifetime.rs && target/check/m6_04", expectExitCode: 0, expectStdout: "Call me Ishmael", timeoutMs: 120000 }
  - id: lifetimes
    title: "The lifetime exercises pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-04-lifetimes", expectPass: [ "m6_04_lifetimes::longest_picks_the_longer_string", "m6_04_lifetimes::longest_borrows_from_both_inputs", "m6_04_lifetimes::first_sentence_keeps_the_full_stop", "m6_04_lifetimes::announcement_is_returned_alongside_the_winner", "m6_04_lifetimes::first_word_needs_no_annotation" ], minPass: 5, timeoutMs: 180000 }
socratic:
  - { trigger: "task:repair:failed", question: { en: "How many E0106 errors are left? The struct and the function each need one, and the struct's is easy to overlook.", de: "Wie viele E0106-Fehler sind noch da? Struktur und Funktion brauchen je einen, und der der Struktur wird leicht uebersehen." }, hints: [ { en: "A struct that holds a reference declares its lifetime like a type parameter: `struct Excerpt<'a> { part: &'a str }`.", de: "Eine Struktur, die eine Referenz haelt, deklariert ihre Lifetime wie einen Typparameter: `struct Excerpt<'a> { part: &'a str }`." }, { en: "`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str` - the same name on both inputs and the output.", de: "`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str` - derselbe Name an beiden Eingaben und an der Ausgabe." }, { en: "rustc's help block for E0106 prints the corrected signature; compare it with what you wrote.", de: "Der help-Block von rustc zu E0106 gibt die korrigierte Signatur aus; vergleiche sie mit dem, was du geschrieben hast." } ] }
  - { trigger: "task:lifetimes:failed", question: { en: "Which test fails? For `first_sentence`, does your slice include the full stop itself?", de: "Welcher Test scheitert? Schliesst dein Slice in `first_sentence` den Punkt selbst ein?" }, hints: [ { en: "`&text[..=i]` is inclusive of index i; `&text[..i]` stops before it.", de: "`&text[..=i]` schliesst den Index i ein; `&text[..i]` haelt davor an." }, { en: "`longest_with_announcement` returns a tuple: the announcement string first, then the winning slice.", de: "`longest_with_announcement` liefert ein Tupel: zuerst die Ankuendigungszeichenkette, dann den siegreichen Slice." }, { en: "`longest` returns `x` on a tie, so compare with `y.len() > x.len()`.", de: "`longest` liefert bei Gleichstand `x`, vergleiche also mit `y.len() > x.len()`." } ] }
misconceptions:
  - { pattern: "error\\[E0106\\]: missing lifetime specifier", question: { en: "The compiler cannot tell where a returned reference borrows from. How many input references are there, and does the elision rule apply?", de: "Der Compiler kann nicht erkennen, woher eine zurueckgegebene Referenz leiht. Wie viele Eingabereferenzen gibt es, und greift die Elisionsregel?" }, hints: [ { en: "With one input reference the lifetime is inferred; with two the compiler needs you to say which one the result comes from.", de: "Bei einer Eingabereferenz wird die Lifetime hergeleitet; bei zweien musst du sagen, aus welcher das Ergebnis stammt." }, { en: "Give both inputs and the output the same name `'a` when the result may come from either.", de: "Gib beiden Eingaben und der Ausgabe denselben Namen `'a`, wenn das Ergebnis aus beiden stammen kann." }, { en: "A struct field of reference type always needs a declared lifetime on the struct.", de: "Ein Strukturfeld vom Referenztyp braucht stets eine an der Struktur deklarierte Lifetime." } ] }
  - { pattern: "error\\[E0597\\]: `\\w+` does not live long enough", question: { en: "A reference outlives what it points at. Which value is dropped first, and does the result really need to be used after that point?", de: "Eine Referenz ueberlebt das, worauf sie zeigt. Welcher Wert wird zuerst aufgeraeumt, und muss das Ergebnis wirklich danach noch benutzt werden?" }, hints: [ { en: "The annotation did not make anything shorter-lived; it revealed a use that was already invalid.", de: "Die Annotation hat nichts kurzlebiger gemacht; sie hat eine bereits ungueltige Verwendung sichtbar gemacht." }, { en: "With `'a` shared by both inputs, the result may be used only while the shorter-lived input is alive.", de: "Teilen sich beide Eingaben `'a`, darf das Ergebnis nur benutzt werden, solange die kurzlebigere Eingabe lebt." }, { en: "Move the use inside the inner scope, or make the result owned with `.to_string()` if it must outlive the input.", de: "Ziehe die Verwendung in den inneren Bereich, oder mache das Ergebnis mit `.to_string()` besitzend, wenn es die Eingabe ueberleben muss." } ] }
---
## Learning goal

Read `'a` in a signature as a relationship between references, add the annotations a compiler asks for, and know when it does not ask.

## What a lifetime annotation is not

It does not change how long anything lives. Nothing is kept alive longer, nothing is dropped sooner, and no code is generated for it. An annotation *describes* a relationship the compiler cannot infer, so it can check the calls.

## The situation that needs one

```rust
fn longest(x: &str, y: &str) -> &str {
    if x.len() > y.len() { x } else { y }
}
```

```text
error[E0106]: missing lifetime specifier
   = help: this function's return type contains a borrowed value, but the
     signature does not say whether it is borrowed from `x` or `y`
```

The compiler checks each function against its signature alone, never by looking inside. Here the signature does not say where the result comes from, so it cannot check any call. The fix names the relationship:

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str
```

Read it as: *for some region `'a` in which both inputs are valid, the result is valid too*. `'a` is not a duration; it is the overlap of the two inputs. So the result may be used only while **both** are alive - which is what the test's inner scope demonstrates, and why Listing 10-24 of the book, which moves the use out of that scope, does not compile.

## Structs that hold references

```rust
pub struct Excerpt<'a> {
    pub part: &'a str,
}
```

A struct holding a reference needs a lifetime parameter, declared like a type parameter. It means: an `Excerpt` may not outlive the text it points into. This is the half of the repair file that is easy to miss - predict *two* E0106 errors, not one.

## Elision: why you have written almost none

`first_word(text: &str) -> &str` compiles with no annotation, and so did every borrowing function since M2. Three rules let the compiler fill them in:

1. Each input reference gets its own lifetime.
2. If there is exactly **one** input lifetime, it is given to every output.
3. If one of the inputs is `&self`, its lifetime is given to every output.

Rule 2 covers `first_word` and, back in m5-02, `first_line`. `longest` has two input references and no `self`, so no rule applies and you must say it yourself.

`'_` in `first_sentence(text: &str) -> Excerpt<'_>` is the anonymous lifetime: it says *this borrows from the input* and lets elision pick which, keeping the fact visible without naming it.

## All three at once

```rust
pub fn longest_with_announcement<'a, T: Display>(x: &'a str, y: &'a str, announcement: T)
```

Lifetime parameters come first inside the angle brackets, then type parameters, then the bounds. It looks dense and it is only three independent ideas in one line - which is the point of putting it at the end of the module.

## Your task

Predict the repair file's errors, repair it, then implement the four functions. Next: the project.
