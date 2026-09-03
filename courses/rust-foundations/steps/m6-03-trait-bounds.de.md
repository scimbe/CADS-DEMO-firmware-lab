---
id: m6-03-trait-bounds
title: "Trait-Schranken: genau das verlangen, was du brauchst"
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
    title: "Die vier beschränkten Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-03-trait-bounds", expectPass: [ "m6_03_trait_bounds::notify_accepts_any_summary", "m6_03_trait_bounds::summarize_all_joins_with_newlines", "m6_03_trait_bounds::longest_summary_picks_the_longest", "m6_03_trait_bounds::describe_pair_needs_two_bounds" ], minPass: 4, timeoutMs: 180000 }
  - id: impl-vs-generic
    title: "Du kannst sagen, wann &impl Trait nicht genügt"
    check: { type: "question", prompt: { en: "notify takes &impl Summary and summarize_all takes <T: Summary>. Name a signature that can only be written with the explicit generic form and not with impl Trait, and explain what the explicit form guarantees that the short form does not.", de: "notify nimmt &impl Summary, summarize_all nimmt <T: Summary>. Nenne eine Signatur, die sich nur mit der ausdrücklichen generischen Form schreiben lässt und nicht mit impl Trait, und erkläre, was die ausdrückliche Form zusichert, was die Kurzform nicht zusichert." }, rubric: "Names a case where the same type parameter must appear more than once - two parameters of the same type such as fn compare<T: Summary>(a: &T, b: &T), a slice &[T] as in summarize_all, or a return type tied to the argument - and explains that impl Trait introduces a fresh anonymous parameter per use, so two impl Trait arguments may be different types, while <T> forces them to be the same and can be named with a turbofish.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:bounds:failed", question: { en: "Which one fails? For `describe_pair`, check the equality case - does your code reach the tie branch when a and b compare equal?", de: "Welche scheitert? Prüfe bei `describe_pair` den Gleichheitsfall - erreicht dein Code den Gleichstandszweig, wenn a und b gleich sind?" }, hints: [ { en: "Three branches: `a > b`, `b > a`, and everything else is the tie. Two branches cannot express it.", de: "Drei Zweige: `a > b`, `b > a`, und alles Übrige ist der Gleichstand. Mit zwei Zweigen ist das nicht ausdrückbar." }, { en: "`summarize_all` joins with `\\n` and gives the empty string for an empty slice - collecting into a `Vec<String>` and calling `join` does both.", de: "`summarize_all` verbindet mit `\\n` und liefert bei leerem Slice die leere Zeichenkette - in einen `Vec<String>` zu sammeln und `join` aufzurufen erledigt beides." }, { en: "`longest_summary` compares the summaries, not the items, and keeps the earlier one on a tie.", de: "`longest_summary` vergleicht die Zusammenfassungen, nicht die Elemente, und behält bei Gleichstand die frühere." } ] }
misconceptions:
  - { pattern: "error\\[E0277\\]: `.*` doesn't implement `std::fmt::Display`", question: { en: "You are printing a value whose type has no Display. Is the bound missing from the signature, or is Debug what you actually want here?", de: "Du gibst einen Wert aus, dessen Typ kein Display hat. Fehlt die Schranke in der Signatur, oder willst du hier eigentlich Debug?" }, hints: [ { en: "`{}` needs `Display`; `{:?}` needs `Debug`. The bound in the signature has to match the placeholder you used.", de: "`{}` braucht `Display`, `{:?}` braucht `Debug`. Die Schranke in der Signatur muss zum verwendeten Platzhalter passen." }, { en: "Two bounds are joined with `+`: `T: Display + PartialOrd`.", de: "Zwei Schranken werden mit `+` verbunden: `T: Display + PartialOrd`." }, { en: "`describe_pair` prints and compares, so it needs both.", de: "`describe_pair` gibt aus und vergleicht, braucht also beide." } ] }
  - { pattern: "error\\[E0282\\]|type annotations needed", question: { en: "The compiler cannot pin down a generic parameter. Is it a call on an empty collection, where nothing tells it what T is?", de: "Der Compiler kann einen generischen Parameter nicht festlegen. Ist es ein Aufruf auf einer leeren Sammlung, bei dem nichts sagt, was T ist?" }, hints: [ { en: "`summarize_all(&[])` gives no element to infer from; the test writes `summarize_all::<Tweet>(&[])` for that reason.", de: "`summarize_all(&[])` bietet kein Element zum Herleiten; der Test schreibt deshalb `summarize_all::<Tweet>(&[])`." }, { en: "The turbofish `::<Type>` names the parameter explicitly at the call site.", de: "Der Turbofish `::<Type>` benennt den Parameter an der Aufrufstelle ausdrücklich." }, { en: "This is one thing `impl Trait` cannot do: an anonymous parameter has no name to give.", de: "Das ist eines, was `impl Trait` nicht kann: ein anonymer Parameter hat keinen Namen, den man angeben könnte." } ] }
---
## Lernziel

Schreibe die drei Formen einer Trait-Schranke, kombiniere zwei Schranken und wähle die Form, die sagt, was du meinst.

## Drei Schreibweisen, eine Idee

```rust
pub fn notify(item: &impl Summary) -> String { … }

pub fn summarize_all<T: Summary>(items: &[T]) -> String { … }

pub fn longest_summary<T>(items: &[T]) -> Option<String>
where
    T: Summary,
{ … }
```

Alle drei sagen "irgendein Typ, der `Summary` implementiert". `impl Trait` ist Zucker für die zweite; die `where`-Klausel ist die zweite unter die Signatur verschoben - dorthin gehören lange Schrankenlisten, bevor sie den Rückgabetyp aus der Zeile drängen.

## Was `impl Trait` nicht kann

`&impl Summary` führt **bei jedem Auftreten einen neuen anonymen Parameter** ein. Damit akzeptiert dies:

```rust
fn compare(a: &impl Summary, b: &impl Summary)
```

ein `Article` und ein `Tweet` gemeinsam. Sollen beide Argumente *denselben* Typ haben, musst du ihn benennen:

```rust
fn compare<T: Summary>(a: &T, b: &T)
```

Dasselbe gilt für einen Slice: `&[T]` braucht den Namen, `summarize_all` und `longest_summary` können die Kurzform also gar nicht nutzen. Und ein anonymer Parameter hat keinen Namen, den man an der Aufrufstelle angeben könnte, `summarize_all::<Tweet>(&[])` - was der Test braucht, weil ein leerer Slice dem Compiler nichts zum Herleiten bietet - ist also nur mit der ausdrücklichen Form möglich.

Faustregel: nimm `impl Trait` für ein einzelnes, einmal verwendetes Argument; benenne den Parameter, sobald er mehr als einmal auftritt.

## Schranken kombinieren

```rust
pub fn describe_pair<T: Display + PartialOrd>(a: T, b: T) -> String
```

`+` heißt "und". Der Rumpf gibt aus, was `Display` braucht, und vergleicht, was `PartialOrd` braucht. Verlange genau das, was der Rumpf nutzt: eine unnötige Schranke weist Aufrufer ohne Gegenwert ab, und eine fehlende ist `error[E0277]`.

Beachte, dass `{}` `Display` braucht und `{:?}` `Debug` - zwei verschiedene Traits, und die Schranke muss zum geschriebenen Platzhalter passen.

## Die Zusage der statischen Bindung

Jede Form hier wird monomorphisiert: der Compiler erzeugt je konkretem Typ eine Kopie, löst die Aufrufe zur Übersetzungszeit auf und kann sie einbetten. Es gibt keine vtable und kein Nachschlagen zur Laufzeit. (`&dyn Summary` ist die andere Wahl, mit einer Kopie des Codes und einem Nachschlagen zur Laufzeit - außerhalb des belegten Materials dieses Kurses, aber den Namen wert.)

## Deine Aufgabe

Implementiere die vier Funktionen - achte auf den dreiwertigen Vergleich in `describe_pair`, wo der Gleichheitsfall einen eigenen Zweig braucht - und nenne dann eine Signatur, die `impl Trait` nicht ausdrücken kann. Ein Step bleibt vor dem Projekt: Lifetimes.
