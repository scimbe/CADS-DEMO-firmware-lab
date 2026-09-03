---
id: m6-03-trait-bounds
title: "Trait bounds: asking for exactly what you need"
bloom: apply
objectives: [ "rust-ch10-02-traits" ]
requires: [ "m6-02-traits" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m6-02-traits", "m6-01-generics" ]
links:
  - { step: "m6-04-lifetimes" }
  - { file: "src/m6/m6_03_bounds.rs" }
  - { file: "tests/m6-03-trait-bounds.rs" }
  - { url: "https://doc.rust-lang.org/book/ch10-02-traits.html", title: "The Book, 10.2: Traits as Parameters" }
sources: [ "src/m6/m6_03_bounds.rs", "tests/m6-03-trait-bounds.rs", "src/m6/m6_02_traits.rs" ]
tasks:
  - id: bounds
    title: "The four bounded functions pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-03-trait-bounds", expectPass: [ "m6_03_trait_bounds::notify_accepts_any_summary", "m6_03_trait_bounds::summarize_all_joins_with_newlines", "m6_03_trait_bounds::longest_summary_picks_the_longest", "m6_03_trait_bounds::describe_pair_needs_two_bounds" ], minPass: 4, timeoutMs: 180000 }
  - id: impl-vs-generic
    title: "You can say when &impl Trait is not enough"
    check: { type: "question", prompt: { en: "notify takes &impl Summary and summarize_all takes <T: Summary>. Name a signature that can only be written with the explicit generic form and not with impl Trait, and explain what the explicit form guarantees that the short form does not.", de: "notify nimmt &impl Summary, summarize_all nimmt <T: Summary>. Nenne eine Signatur, die sich nur mit der ausdruecklichen generischen Form schreiben laesst und nicht mit impl Trait, und erklaere, was die ausdrueckliche Form zusichert, was die Kurzform nicht zusichert." }, rubric: "Names a case where the same type parameter must appear more than once - two parameters of the same type such as fn compare<T: Summary>(a: &T, b: &T), a slice &[T] as in summarize_all, or a return type tied to the argument - and explains that impl Trait introduces a fresh anonymous parameter per use, so two impl Trait arguments may be different types, while <T> forces them to be the same and can be named with a turbofish.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:bounds:failed", question: { en: "Which one fails? For `describe_pair`, check the equality case - does your code reach the tie branch when a and b compare equal?", de: "Welche scheitert? Pruefe bei `describe_pair` den Gleichheitsfall - erreicht dein Code den Gleichstandszweig, wenn a und b gleich sind?" }, hints: [ { en: "Three branches: `a > b`, `b > a`, and everything else is the tie. Two branches cannot express it.", de: "Drei Zweige: `a > b`, `b > a`, und alles Uebrige ist der Gleichstand. Mit zwei Zweigen ist das nicht ausdrueckbar." }, { en: "`summarize_all` joins with `\\n` and gives the empty string for an empty slice - collecting into a `Vec<String>` and calling `join` does both.", de: "`summarize_all` verbindet mit `\\n` und liefert bei leerem Slice die leere Zeichenkette - in einen `Vec<String>` zu sammeln und `join` aufzurufen erledigt beides." }, { en: "`longest_summary` compares the summaries, not the items, and keeps the earlier one on a tie.", de: "`longest_summary` vergleicht die Zusammenfassungen, nicht die Elemente, und behaelt bei Gleichstand die fruehere." } ] }
misconceptions:
  - { pattern: "error\\[E0277\\]: `.*` doesn't implement `std::fmt::Display`", question: { en: "You are printing a value whose type has no Display. Is the bound missing from the signature, or is Debug what you actually want here?", de: "Du gibst einen Wert aus, dessen Typ kein Display hat. Fehlt die Schranke in der Signatur, oder willst du hier eigentlich Debug?" }, hints: [ { en: "`{}` needs `Display`; `{:?}` needs `Debug`. The bound in the signature has to match the placeholder you used.", de: "`{}` braucht `Display`, `{:?}` braucht `Debug`. Die Schranke in der Signatur muss zum verwendeten Platzhalter passen." }, { en: "Two bounds are joined with `+`: `T: Display + PartialOrd`.", de: "Zwei Schranken werden mit `+` verbunden: `T: Display + PartialOrd`." }, { en: "`describe_pair` prints and compares, so it needs both.", de: "`describe_pair` gibt aus und vergleicht, braucht also beide." } ] }
  - { pattern: "error\\[E0282\\]|type annotations needed", question: { en: "The compiler cannot pin down a generic parameter. Is it a call on an empty collection, where nothing tells it what T is?", de: "Der Compiler kann einen generischen Parameter nicht festlegen. Ist es ein Aufruf auf einer leeren Sammlung, bei dem nichts sagt, was T ist?" }, hints: [ { en: "`summarize_all(&[])` gives no element to infer from; the test writes `summarize_all::<Tweet>(&[])` for that reason.", de: "`summarize_all(&[])` bietet kein Element zum Herleiten; der Test schreibt deshalb `summarize_all::<Tweet>(&[])`." }, { en: "The turbofish `::<Type>` names the parameter explicitly at the call site.", de: "Der Turbofish `::<Type>` benennt den Parameter an der Aufrufstelle ausdruecklich." }, { en: "This is one thing `impl Trait` cannot do: an anonymous parameter has no name to give.", de: "Das ist eines, was `impl Trait` nicht kann: ein anonymer Parameter hat keinen Namen, den man angeben koennte." } ] }
---
## Learning goal

Write the three forms of a trait bound, combine two bounds, and choose the form that says what you mean.

## Three spellings, one idea

```rust
pub fn notify(item: &impl Summary) -> String { … }

pub fn summarize_all<T: Summary>(items: &[T]) -> String { … }

pub fn longest_summary<T>(items: &[T]) -> Option<String>
where
    T: Summary,
{ … }
```

All three say "any type that implements `Summary`". `impl Trait` is sugar for the second; the `where` clause is the second moved below the signature, which is where long lists of bounds belong before they push the return type off the line.

## What `impl Trait` cannot do

`&impl Summary` introduces a **fresh anonymous parameter each time it appears**. So this:

```rust
fn compare(a: &impl Summary, b: &impl Summary)
```

accepts an `Article` and a `Tweet` together. If you need both arguments to be the *same* type, you must name it:

```rust
fn compare<T: Summary>(a: &T, b: &T)
```

The same applies to a slice: `&[T]` needs the name, so `summarize_all` and `longest_summary` cannot use the short form at all. And an anonymous parameter has no name to give at the call site, so `summarize_all::<Tweet>(&[])` - which the test needs, because an empty slice gives the compiler nothing to infer from - is only possible with the explicit form.

Rule of thumb: use `impl Trait` for a single argument used once; name the parameter as soon as it appears more than once.

## Combining bounds

```rust
pub fn describe_pair<T: Display + PartialOrd>(a: T, b: T) -> String
```

`+` means "and". The body prints, which needs `Display`, and compares, which needs `PartialOrd`. Ask for exactly what the body uses: an unnecessary bound turns away callers for no benefit, and a missing one is `error[E0277]`.

Note that `{}` needs `Display` while `{:?}` needs `Debug` - two different traits, and the bound has to match the placeholder you wrote.

## The static-dispatch guarantee

Every form here is monomorphised: the compiler generates one copy per concrete type, resolves the calls at compile time and can inline them. There is no vtable and no runtime lookup. (`&dyn Summary` is the other choice, with one copy of the code and a runtime lookup - outside this course's grounded material, but worth knowing the name of.)

## Your task

Implement the four functions - watching the three-way comparison in `describe_pair`, where the equality case needs its own branch - then name a signature that `impl Trait` cannot express. One step left before the project: lifetimes.
