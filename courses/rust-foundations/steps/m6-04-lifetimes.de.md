---
id: m6-04-lifetimes
title: "Lifetimes: wie lange eine Leihe gilt"
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
    title: "Sage die zwei Fehler der Reparaturdatei vorher"
    check: { type: "predict", prompt: { en: "snippets/m6_04_missing_lifetime.rs - the read-only twin of the file you will repair - declares a struct holding a &str and a longest function returning a &str. Before you compile it: how many errors do you expect, which error code, and which lines carry them?", de: "snippets/m6_04_missing_lifetime.rs - der schreibgeschuetzte Zwilling der Datei, die du reparieren wirst - deklariert eine Struktur mit einem &str und eine Funktion longest, die einen &str liefert. Bevor du uebersetzt: wie viele Fehler erwartest du, welcher Fehlercode, und an welchen Zeilen stehen sie?" }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m6_04_missing_lifetime.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0106\\]: missing lifetime specifier", timeoutMs: 120000 }, rubric: "Predicts two E0106 errors: one on the struct field `part: &str` and one on the return type of `longest`. Predicting one error only misses that a struct holding a reference needs a lifetime parameter too, which is the point of the second half of the chapter.", bloom: "evaluate" }
  - id: repair
    title: "Die reparierte Datei kompiliert und laeuft"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 -o target/check/m6_04 repair/m6_04_missing_lifetime.rs && target/check/m6_04", expectExitCode: 0, expectStdout: "Call me Ishmael", timeoutMs: 120000 }
  - id: lifetimes
    title: "Die Lifetime-Uebungen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-04-lifetimes", expectPass: [ "m6_04_lifetimes::longest_picks_the_longer_string", "m6_04_lifetimes::longest_borrows_from_both_inputs", "m6_04_lifetimes::first_sentence_keeps_the_full_stop", "m6_04_lifetimes::announcement_is_returned_alongside_the_winner", "m6_04_lifetimes::first_word_needs_no_annotation" ], minPass: 5, timeoutMs: 180000 }
socratic:
  - { trigger: "task:repair:failed", question: { en: "How many E0106 errors are left? The struct and the function each need one, and the struct's is easy to overlook.", de: "Wie viele E0106-Fehler sind noch da? Struktur und Funktion brauchen je einen, und der der Struktur wird leicht uebersehen." }, hints: [ { en: "A struct that holds a reference declares its lifetime like a type parameter: `struct Excerpt<'a> { part: &'a str }`.", de: "Eine Struktur, die eine Referenz haelt, deklariert ihre Lifetime wie einen Typparameter: `struct Excerpt<'a> { part: &'a str }`." }, { en: "`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str` - the same name on both inputs and the output.", de: "`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str` - derselbe Name an beiden Eingaben und an der Ausgabe." }, { en: "rustc's help block for E0106 prints the corrected signature; compare it with what you wrote.", de: "Der help-Block von rustc zu E0106 gibt die korrigierte Signatur aus; vergleiche sie mit dem, was du geschrieben hast." } ] }
  - { trigger: "task:lifetimes:failed", question: { en: "Which test fails? For `first_sentence`, does your slice include the full stop itself?", de: "Welcher Test scheitert? Schliesst dein Slice in `first_sentence` den Punkt selbst ein?" }, hints: [ { en: "`&text[..=i]` is inclusive of index i; `&text[..i]` stops before it.", de: "`&text[..=i]` schliesst den Index i ein; `&text[..i]` haelt davor an." }, { en: "`longest_with_announcement` returns a tuple: the announcement string first, then the winning slice.", de: "`longest_with_announcement` liefert ein Tupel: zuerst die Ankuendigungszeichenkette, dann den siegreichen Slice." }, { en: "`longest` returns `x` on a tie, so compare with `y.len() > x.len()`.", de: "`longest` liefert bei Gleichstand `x`, vergleiche also mit `y.len() > x.len()`." } ] }
misconceptions:
  - { pattern: "error\\[E0106\\]: missing lifetime specifier", question: { en: "The compiler cannot tell where a returned reference borrows from. How many input references are there, and does the elision rule apply?", de: "Der Compiler kann nicht erkennen, woher eine zurueckgegebene Referenz leiht. Wie viele Eingabereferenzen gibt es, und greift die Elisionsregel?" }, hints: [ { en: "With one input reference the lifetime is inferred; with two the compiler needs you to say which one the result comes from.", de: "Bei einer Eingabereferenz wird die Lifetime hergeleitet; bei zweien musst du sagen, aus welcher das Ergebnis stammt." }, { en: "Give both inputs and the output the same name `'a` when the result may come from either.", de: "Gib beiden Eingaben und der Ausgabe denselben Namen `'a`, wenn das Ergebnis aus beiden stammen kann." }, { en: "A struct field of reference type always needs a declared lifetime on the struct.", de: "Ein Strukturfeld vom Referenztyp braucht stets eine an der Struktur deklarierte Lifetime." } ] }
  - { pattern: "error\\[E0597\\]: `\\w+` does not live long enough", question: { en: "A reference outlives what it points at. Which value is dropped first, and does the result really need to be used after that point?", de: "Eine Referenz ueberlebt das, worauf sie zeigt. Welcher Wert wird zuerst aufgeraeumt, und muss das Ergebnis wirklich danach noch benutzt werden?" }, hints: [ { en: "The annotation did not make anything shorter-lived; it revealed a use that was already invalid.", de: "Die Annotation hat nichts kurzlebiger gemacht; sie hat eine bereits ungueltige Verwendung sichtbar gemacht." }, { en: "With `'a` shared by both inputs, the result may be used only while the shorter-lived input is alive.", de: "Teilen sich beide Eingaben `'a`, darf das Ergebnis nur benutzt werden, solange die kurzlebigere Eingabe lebt." }, { en: "Move the use inside the inner scope, or make the result owned with `.to_string()` if it must outlive the input.", de: "Ziehe die Verwendung in den inneren Bereich, oder mache das Ergebnis mit `.to_string()` besitzend, wenn es die Eingabe ueberleben muss." } ] }
---
## Lernziel

Lies `'a` in einer Signatur als Beziehung zwischen Referenzen, ergaenze die Annotationen, die der Compiler verlangt, und wisse, wann er nicht verlangt.

## Was eine Lifetime-Annotation nicht ist

Sie aendert nicht, wie lange etwas lebt. Nichts wird laenger am Leben gehalten, nichts frueher aufgeraeumt, und es wird kein Code dafuer erzeugt. Eine Annotation *beschreibt* eine Beziehung, die der Compiler nicht herleiten kann, damit er die Aufrufe pruefen kann.

## Die Lage, die eine braucht

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

Der Compiler prueft jede Funktion allein an ihrer Signatur, nie durch Hineinsehen. Hier sagt die Signatur nicht, woher das Ergebnis stammt, also kann er keinen Aufruf pruefen. Die Loesung benennt die Beziehung:

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str
```

Lies das als: *fuer eine Region `'a`, in der beide Eingaben gueltig sind, ist auch das Ergebnis gueltig*. `'a` ist keine Dauer, sondern die Ueberlappung der beiden Eingaben. Das Ergebnis darf also nur benutzt werden, solange **beide** leben - was der innere Bereich des Tests vorfuehrt und weshalb Listing 10-24 des Buchs, das die Verwendung aus diesem Bereich herauszieht, nicht uebersetzt.

## Strukturen, die Referenzen halten

```rust
pub struct Excerpt<'a> {
    pub part: &'a str,
}
```

Eine Struktur mit einer Referenz braucht einen Lifetime-Parameter, deklariert wie ein Typparameter. Er bedeutet: ein `Excerpt` darf den Text, in den es zeigt, nicht ueberleben. Das ist die Haelfte der Reparaturdatei, die leicht uebersehen wird - sage *zwei* E0106-Fehler vorher, nicht einen.

## Elision: warum du bisher fast keine geschrieben hast

`first_word(text: &str) -> &str` uebersetzt ohne Annotation, und so tat es jede leihende Funktion seit M2. Drei Regeln lassen den Compiler sie ergaenzen:

1. Jede Eingabereferenz erhaelt ihre eigene Lifetime.
2. Gibt es genau **eine** Eingabe-Lifetime, wird sie jeder Ausgabe zugewiesen.
3. Ist eine der Eingaben `&self`, wird deren Lifetime jeder Ausgabe zugewiesen.

Regel 2 deckt `first_word` und, zurueck in m5-02, `first_line` ab. `longest` hat zwei Eingabereferenzen und kein `self`, keine Regel greift also und du musst es selbst sagen.

`'_` in `first_sentence(text: &str) -> Excerpt<'_>` ist die anonyme Lifetime: sie sagt *dies leiht aus der Eingabe* und laesst die Elision waehlen, welche - der Umstand bleibt sichtbar, ohne benannt zu werden.

## Alle drei auf einmal

```rust
pub fn longest_with_announcement<'a, T: Display>(x: &'a str, y: &'a str, announcement: T)
```

Lifetime-Parameter stehen in den spitzen Klammern zuerst, dann Typparameter, dann die Schranken. Es sieht dicht aus und ist nur drei unabhaengige Ideen in einer Zeile - deshalb steht es am Ende des Moduls.

## Deine Aufgabe

Sage die Fehler der Reparaturdatei vorher, repariere sie und implementiere dann die vier Funktionen. Als Naechstes: das Projekt.
