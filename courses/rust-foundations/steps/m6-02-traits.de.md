---
id: m6-02-traits
title: "Traits: gemeinsames Verhalten mit Namen"
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
    title: "Article ueberschreibt, Tweet nutzt die Vorgabe"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-02-traits", expectPass: [ "m6_02_traits::article_reports_its_author", "m6_02_traits::article_overrides_the_default_summary", "m6_02_traits::tweet_prefixes_the_username", "m6_02_traits::tweet_uses_the_default_summary" ], minPass: 4, timeoutMs: 180000 }
  - id: default-method
    title: "Du kannst die Vorgabemethode erklaeren"
    check: { type: "question", prompt: { en: "Tweet implements only author() yet Summary::summarize() works on it, and Article's own summarize() never calls the default. Explain how the compiler decides which body runs, and what the default method's call to self.author() means for a type that has not been written yet.", de: "Tweet implementiert nur author(), und dennoch funktioniert Summary::summarize() darauf, waehrend Articles eigenes summarize() die Vorgabe nie aufruft. Erklaere, wie der Compiler entscheidet, welcher Rumpf laeuft, und was der Aufruf self.author() in der Vorgabemethode fuer einen noch nicht geschriebenen Typ bedeutet." }, rubric: "States that an impl block's method replaces the trait's default for that type, and that a type providing no body gets the default - the choice is made per type at compile time, statically, not by any runtime lookup. The second half should note that the default calls the required method through the trait, so it works for any future implementor that supplies author(), which is what makes a default method a reusable behaviour rather than a copy.", bloom: "understand", minChars: 70 }
socratic:
  - { trigger: "task:traits:failed", question: { en: "Which one fails? Did you add a summarize() to Tweet - and if so, what happens to the default the test expects?", de: "Welche scheitert? Hast du ein summarize() zu Tweet hinzugefuegt - und was geschieht dann mit der Vorgabe, die der Test erwartet?" }, hints: [ { en: "`Tweet` must implement only `author`; adding `summarize` would override exactly the default the test checks.", de: "`Tweet` darf nur `author` implementieren; ein `summarize` ueberschriebe genau die Vorgabe, die der Test prueft." }, { en: "`Tweet::author` returns `format!(\"@{}\", self.username)`, with the at sign in the method, not in the field.", de: "`Tweet::author` liefert `format!(\"@{}\", self.username)`, mit dem At-Zeichen in der Methode und nicht im Feld." }, { en: "`Article::summarize` is `format!(\"{}, by {}\", self.headline, self.author)` - the comma and the word `by` are part of the expected string.", de: "`Article::summarize` ist `format!(\"{}, by {}\", self.headline, self.author)` - Komma und das Wort `by` gehoeren zur erwarteten Zeichenkette." } ] }
misconceptions:
  - { pattern: "error\\[E0046\\]: not all trait items implemented", question: { en: "The impl block is missing a method the trait requires. Which one, and does the trait offer a default for it or not?", de: "Dem impl-Block fehlt eine vom Trait geforderte Methode. Welche, und bietet das Trait dafuer eine Vorgabe an oder nicht?" }, hints: [ { en: "A trait method with a body is optional to implement; one without a body is required.", de: "Eine Trait-Methode mit Rumpf ist optional zu implementieren; eine ohne Rumpf ist verpflichtend." }, { en: "`author` has no default here, so every implementor must supply it.", de: "`author` hat hier keine Vorgabe, jeder Implementierer muss sie also liefern." }, { en: "The diagnostic lists the missing items by name and shows their signatures.", de: "Die Diagnose listet die fehlenden Elemente namentlich auf und zeigt ihre Signaturen." } ] }
  - { pattern: "error\\[E0599\\]: no method named `\\w+` found", question: { en: "A method exists on the trait but not, apparently, on your value. Is the trait in scope at the call site?", de: "Eine Methode gibt es am Trait, aber offenbar nicht an deinem Wert. Ist das Trait an der Aufrufstelle sichtbar?" }, hints: [ { en: "A trait's methods are callable only where the trait itself is imported: `use ...::Summary;`.", de: "Die Methoden eines Traits sind nur dort aufrufbar, wo das Trait selbst importiert ist: `use ...::Summary;`." }, { en: "The test file imports `Summary` for exactly this reason; your own code needs the same import.", de: "Die Testdatei importiert `Summary` genau deshalb; dein eigener Code braucht denselben Import." }, { en: "Check the spelling against the trait: the compiler suggests near matches when there is one.", de: "Pruefe die Schreibweise gegen das Trait: der Compiler schlaegt aehnliche Namen vor, wenn es welche gibt." } ] }
---
## Lernziel

Definiere ein Trait, implementiere es fuer zwei Typen und nutze eine Vorgabemethode, sodass einer davon gar keinen Code braucht.

## Ein Trait ist eine benannte Menge von Methoden

```rust
pub trait Summary {
    fn author(&self) -> String;

    fn summarize(&self) -> String {
        format!("(Read more from {}...)", self.author())
    }
}
```

`author` hat keinen Rumpf: jeder Implementierer muss einen liefern. `summarize` hat einen Rumpf: Implementierer duerfen ihn uebernehmen. Das ist die ganze Unterscheidung, und es ist die Trait-Definitionshaelfte von Kapitel 10.2.

Du hast Traits bereits benutzt, ohne eines zu definieren. `Display` in m5-04 ist ein Trait, und `impl fmt::Display for ConfigError` zu schreiben ist dieselbe Handlung wie die folgende. Ebenso `Debug`, das `derive` fuer dich schreibt, und `PartialOrd`, das m6-01 als Schranke nutzte.

## Implementieren

```rust
impl Summary for Article {
    fn author(&self) -> String { self.author.clone() }
    fn summarize(&self) -> String { format!("{}, by {}", self.headline, self.author) }
}

impl Summary for Tweet {
    fn author(&self) -> String { format!("@{}", self.username) }
}
```

`Article` ueberschreibt `summarize`; `Tweet` nicht und erbt die Fassung des Traits. Die Wahl faellt je Typ zur Uebersetzungszeit - die Methode des impl-Blocks ersetzt schlicht die Vorgabe fuer diesen Typ. Zur Laufzeit wird nichts nachgeschlagen.

Laesst du `author` weg, erhaeltst du `error[E0046]: not all trait items implemented`. Laesst du `summarize` weg, geschieht nichts, denn es gibt eine Vorgabe.

## Warum eine Vorgabemethode mehr wert ist als eine Kopie

Die Vorgabe ruft `self.author()` auf - eine Methode, die das Trait *fordert*. Genau das macht sie wiederverwendbar: sie funktioniert fuer jeden Typ, den irgendwer kuenftig implementiert, solange er `author` liefert. Eine kopierte Hilfsfunktion taete das nicht; sie muesste je Typ erneut geschrieben werden.

## Die Sichtbarkeitsregel

Die Methoden eines Traits sind nur dort aufrufbar, wo das Trait sichtbar ist:

```rust
use rust_foundations::m6::m6_02_traits::{Summary, Tweet};
```

Ohne das `use Summary` ist `tweet.summarize()` ein `error[E0599]: no method named summarize found`, obwohl die Implementierung existiert. Die Testdatei importiert es genau deswegen.

Es gibt ausserdem eine Kohaerenzregel: du darfst ein Trait fuer einen Typ nur implementieren, wenn dir das Trait oder der Typ gehoert. Deshalb kann niemand ausser der Standardbibliothek `Display` fuer `Vec<T>` implementieren, und deshalb kann der Compiler garantieren, dass es nie mehr als eine Implementierung zur Auswahl gibt.

## Deine Aufgabe

Implementiere `Summary` fuer beide Typen - und denke daran, dass `Tweet` `summarize` *nicht* definieren darf - und erklaere dann, wie der Compiler zwischen Vorgabe und Ueberschreibung waehlt. Der naechste Step nutzt diese Traits als Schranken.
