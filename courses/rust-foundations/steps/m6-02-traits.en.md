---
id: m6-02-traits
title: "Traits: shared behaviour with a name"
bloom: apply
objectives: [ "rust-ch10-02-traits" ]
requires: [ "m6-01-generics" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m6-01-generics", "m5-04-custom-error" ]
links:
  - { step: "m6-03-trait-bounds" }
  - { file: "src/m6/m6_02_traits.rs" }
  - { file: "tests/m6-02-traits.rs" }
  - { url: "https://doc.rust-lang.org/book/ch10-02-traits.html", title: "The Book, 10.2: Traits: Defining Shared Behavior" }
sources: [ "src/m6/m6_02_traits.rs", "tests/m6-02-traits.rs", "src/m5/m5_04_custom_error.rs" ]
tasks:
  - id: traits
    title: "Article overrides, Tweet uses the default"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-02-traits", expectPass: [ "m6_02_traits::article_reports_its_author", "m6_02_traits::article_overrides_the_default_summary", "m6_02_traits::tweet_prefixes_the_username", "m6_02_traits::tweet_uses_the_default_summary" ], minPass: 4, timeoutMs: 180000 }
  - id: default-method
    title: "You can explain the default method"
    check: { type: "question", prompt: { en: "Tweet implements only author() yet Summary::summarize() works on it, and Article's own summarize() never calls the default. Explain how the compiler decides which body runs, and what the default method's call to self.author() means for a type that has not been written yet.", de: "Tweet implementiert nur author(), und dennoch funktioniert Summary::summarize() darauf, waehrend Articles eigenes summarize() die Vorgabe nie aufruft. Erklaere, wie der Compiler entscheidet, welcher Rumpf laeuft, und was der Aufruf self.author() in der Vorgabemethode fuer einen noch nicht geschriebenen Typ bedeutet." }, rubric: "States that an impl block's method replaces the trait's default for that type, and that a type providing no body gets the default - the choice is made per type at compile time, statically, not by any runtime lookup. The second half should note that the default calls the required method through the trait, so it works for any future implementor that supplies author(), which is what makes a default method a reusable behaviour rather than a copy.", bloom: "understand", minChars: 70 }
socratic:
  - { trigger: "task:traits:failed", question: { en: "Which one fails? Did you add a summarize() to Tweet - and if so, what happens to the default the test expects?", de: "Welche scheitert? Hast du ein summarize() zu Tweet hinzugefuegt - und was geschieht dann mit der Vorgabe, die der Test erwartet?" }, hints: [ { en: "`Tweet` must implement only `author`; adding `summarize` would override exactly the default the test checks.", de: "`Tweet` darf nur `author` implementieren; ein `summarize` ueberschriebe genau die Vorgabe, die der Test prueft." }, { en: "`Tweet::author` returns `format!(\"@{}\", self.username)`, with the at sign in the method, not in the field.", de: "`Tweet::author` liefert `format!(\"@{}\", self.username)`, mit dem At-Zeichen in der Methode und nicht im Feld." }, { en: "`Article::summarize` is `format!(\"{}, by {}\", self.headline, self.author)` - the comma and the word `by` are part of the expected string.", de: "`Article::summarize` ist `format!(\"{}, by {}\", self.headline, self.author)` - Komma und das Wort `by` gehoeren zur erwarteten Zeichenkette." } ] }
misconceptions:
  - { pattern: "error\\[E0046\\]: not all trait items implemented", question: { en: "The impl block is missing a method the trait requires. Which one, and does the trait offer a default for it or not?", de: "Dem impl-Block fehlt eine vom Trait geforderte Methode. Welche, und bietet das Trait dafuer eine Vorgabe an oder nicht?" }, hints: [ { en: "A trait method with a body is optional to implement; one without a body is required.", de: "Eine Trait-Methode mit Rumpf ist optional zu implementieren; eine ohne Rumpf ist verpflichtend." }, { en: "`author` has no default here, so every implementor must supply it.", de: "`author` hat hier keine Vorgabe, jeder Implementierer muss sie also liefern." }, { en: "The diagnostic lists the missing items by name and shows their signatures.", de: "Die Diagnose listet die fehlenden Elemente namentlich auf und zeigt ihre Signaturen." } ] }
  - { pattern: "error\\[E0599\\]: no method named `\\w+` found", question: { en: "A method exists on the trait but not, apparently, on your value. Is the trait in scope at the call site?", de: "Eine Methode gibt es am Trait, aber offenbar nicht an deinem Wert. Ist das Trait an der Aufrufstelle sichtbar?" }, hints: [ { en: "A trait's methods are callable only where the trait itself is imported: `use ...::Summary;`.", de: "Die Methoden eines Traits sind nur dort aufrufbar, wo das Trait selbst importiert ist: `use ...::Summary;`." }, { en: "The test file imports `Summary` for exactly this reason; your own code needs the same import.", de: "Die Testdatei importiert `Summary` genau deshalb; dein eigener Code braucht denselben Import." }, { en: "Check the spelling against the trait: the compiler suggests near matches when there is one.", de: "Pruefe die Schreibweise gegen das Trait: der Compiler schlaegt aehnliche Namen vor, wenn es welche gibt." } ] }
---
## Learning goal

Define a trait, implement it for two types, and use a default method so one of them needs no code at all.

## A trait is a named set of methods

```rust
pub trait Summary {
    fn author(&self) -> String;

    fn summarize(&self) -> String {
        format!("(Read more from {}...)", self.author())
    }
}
```

`author` has no body: every implementor must supply one. `summarize` has a body: implementors may take it as it is. That is the whole distinction, and it is the trait-definition half of chapter 10.2.

You have already used traits without defining any. `Display` in m5-04 is a trait, and writing `impl fmt::Display for ConfigError` is the same act as what follows here. So is `Debug`, which `derive` writes for you, and `PartialOrd`, which m6-01 used as a bound.

## Implementing

```rust
impl Summary for Article {
    fn author(&self) -> String { self.author.clone() }
    fn summarize(&self) -> String { format!("{}, by {}", self.headline, self.author) }
}

impl Summary for Tweet {
    fn author(&self) -> String { format!("@{}", self.username) }
}
```

`Article` overrides `summarize`; `Tweet` does not and inherits the trait's version. The choice is made per type at compile time - the impl block's method simply replaces the default for that type. Nothing is looked up at runtime.

Leave out `author` and you get `error[E0046]: not all trait items implemented`. Leave out `summarize` and nothing happens, because there is a default.

## Why a default method is worth more than a copy

The default calls `self.author()` - a method the trait *requires*. That is what makes it reusable: it works for any type anyone implements in future, as long as they supply `author`. A copied helper function would not; it would have to be written again per type.

## The scope rule

A trait's methods are callable only where the trait is in scope:

```rust
use rust_foundations::m6::m6_02_traits::{Summary, Tweet};
```

Without the `use Summary`, `tweet.summarize()` is `error[E0599]: no method named summarize found`, even though the implementation exists. The test file imports it for exactly this reason.

There is also a coherence rule: you may implement a trait for a type only if you own the trait or the type. That is why nobody but the standard library can implement `Display` for `Vec<T>`, and why the compiler can guarantee there is never more than one implementation to choose from.

## Your task

Implement `Summary` for both types - remembering that `Tweet` must *not* define `summarize` - then explain how the compiler picks between the default and the override. The next step uses these traits as bounds.
