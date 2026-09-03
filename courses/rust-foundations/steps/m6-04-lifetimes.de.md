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
    check: { type: "predict", prompt: { en: "snippets/m6_04_missing_lifetime.rs - the read-only twin of the file you will repair - declares a struct holding a &str and a longest function returning a &str. Before you compile it: how many errors do you expect, which error code, and which lines carry them?", de: "snippets/m6_04_missing_lifetime.rs - der schreibgeschützte Zwilling der Datei, die du reparieren wirst - deklariert eine Struktur mit einem &str und eine Funktion longest, die einen &str liefert. Bevor du übersetzt: wie viele Fehler erwartest du, welcher Fehlercode, und an welchen Zeilen stehen sie?" }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m6_04_missing_lifetime.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0106\\]: missing lifetime specifier", timeoutMs: 120000 }, rubric: "Predicts two E0106 errors: one on the struct field `part: &str` and one on the return type of `longest`. Predicting one error only misses that a struct holding a reference needs a lifetime parameter too, which is the point of the second half of the chapter.", bloom: "evaluate" }
  - id: repair
    title: "Die reparierte Datei kompiliert und läuft"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 -o target/check/m6_04 repair/m6_04_missing_lifetime.rs && target/check/m6_04", expectExitCode: 0, expectStdout: "Call me Ishmael", timeoutMs: 120000 }
  - id: lifetimes
    title: "Die Lifetime-Übungen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-04-lifetimes", expectPass: [ "m6_04_lifetimes::longest_picks_the_longer_string", "m6_04_lifetimes::longest_borrows_from_both_inputs", "m6_04_lifetimes::first_sentence_keeps_the_full_stop", "m6_04_lifetimes::announcement_is_returned_alongside_the_winner", "m6_04_lifetimes::first_word_needs_no_annotation" ], minPass: 5, timeoutMs: 180000 }
socratic:
  - { trigger: "task:repair:failed", question: { en: "How many E0106 errors are left? The struct and the function each need one, and the struct's is easy to overlook.", de: "Wie viele E0106-Fehler sind noch da? Struktur und Funktion brauchen je einen, und der der Struktur wird leicht übersehen." }, hints: [ { en: "A struct that holds a reference declares its lifetime like a type parameter: `struct Excerpt<'a> { part: &'a str }`.", de: "Eine Struktur, die eine Referenz hält, deklariert ihre Lifetime wie einen Typparameter: `struct Excerpt<'a> { part: &'a str }`." }, { en: "`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str` - the same name on both inputs and the output.", de: "`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str` - derselbe Name an beiden Eingaben und an der Ausgabe." }, { en: "rustc's help block for E0106 prints the corrected signature; compare it with what you wrote.", de: "Der help-Block von rustc zu E0106 gibt die korrigierte Signatur aus; vergleiche sie mit dem, was du geschrieben hast." } ] }
  - { trigger: "task:lifetimes:failed", question: { en: "Which test fails? For `first_sentence`, does your slice include the full stop itself?", de: "Welcher Test scheitert? Schließt dein Slice in `first_sentence` den Punkt selbst ein?" }, hints: [ { en: "`&text[..=i]` is inclusive of index i; `&text[..i]` stops before it.", de: "`&text[..=i]` schließt den Index i ein; `&text[..i]` hält davor an." }, { en: "`longest_with_announcement` returns a tuple: the announcement string first, then the winning slice.", de: "`longest_with_announcement` liefert ein Tupel: zuerst die Ankündigungszeichenkette, dann den siegreichen Slice." }, { en: "`longest` returns `x` on a tie, so compare with `y.len() > x.len()`.", de: "`longest` liefert bei Gleichstand `x`, vergleiche also mit `y.len() > x.len()`." } ] }
misconceptions:
  - { pattern: "error\\[E0106\\]: missing lifetime specifier", question: { en: "The compiler cannot tell where a returned reference borrows from. How many input references are there, and does the elision rule apply?", de: "Der Compiler kann nicht erkennen, woher eine zurückgegebene Referenz leiht. Wie viele Eingabereferenzen gibt es, und greift die Elisionsregel?" }, hints: [ { en: "With one input reference the lifetime is inferred; with two the compiler needs you to say which one the result comes from.", de: "Bei einer Eingabereferenz wird die Lifetime hergeleitet; bei zweien musst du sagen, aus welcher das Ergebnis stammt." }, { en: "Give both inputs and the output the same name `'a` when the result may come from either.", de: "Gib beiden Eingaben und der Ausgabe denselben Namen `'a`, wenn das Ergebnis aus beiden stammen kann." }, { en: "A struct field of reference type always needs a declared lifetime on the struct.", de: "Ein Strukturfeld vom Referenztyp braucht stets eine an der Struktur deklarierte Lifetime." } ] }
  - { pattern: "error\\[E0597\\]: `\\w+` does not live long enough", question: { en: "A reference outlives what it points at. Which value is dropped first, and does the result really need to be used after that point?", de: "Eine Referenz überlebt das, worauf sie zeigt. Welcher Wert wird zuerst aufgeräumt, und muss das Ergebnis wirklich danach noch benutzt werden?" }, hints: [ { en: "The annotation did not make anything shorter-lived; it revealed a use that was already invalid.", de: "Die Annotation hat nichts kurzlebiger gemacht; sie hat eine bereits ungültige Verwendung sichtbar gemacht." }, { en: "With `'a` shared by both inputs, the result may be used only while the shorter-lived input is alive.", de: "Teilen sich beide Eingaben `'a`, darf das Ergebnis nur benutzt werden, solange die kurzlebigere Eingabe lebt." }, { en: "Move the use inside the inner scope, or make the result owned with `.to_string()` if it must outlive the input.", de: "Ziehe die Verwendung in den inneren Bereich, oder mache das Ergebnis mit `.to_string()` besitzend, wenn es die Eingabe überleben muss." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`pwd` prints the current folder; it has to be the rust-foundations workspace, the one holding Cargo.toml.", de: "`pwd` gibt den aktuellen Ordner aus; er muss der rust-foundations-Workspace sein, in dem die Cargo.toml liegt." }, { en: "A terminal opened with Terminal → New Terminal starts in the workspace folder; one you navigated away from does not.", de: "Ein über Terminal → Neues Terminal geöffnetes Terminal startet im Workspace-Ordner; eines, aus dem du herausnavigiert bist, nicht." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Lies `'a` in einer Signatur als Beziehung zwischen Referenzen, ergänze die Annotationen, die der Compiler verlangt, und wisse, wann er nicht verlangt.

## Was eine Lifetime-Annotation nicht ist

Sie ändert nicht, wie lange etwas lebt. Nichts wird länger am Leben gehalten, nichts früher aufgeräumt, und es wird kein Code dafür erzeugt. Eine Annotation *beschreibt* eine Beziehung, die der Compiler nicht herleiten kann, damit er die Aufrufe prüfen kann.

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

Der Compiler prüft jede Funktion allein an ihrer Signatur, nie durch Hineinsehen. Hier sagt die Signatur nicht, woher das Ergebnis stammt, also kann er keinen Aufruf prüfen. Die Lösung benennt die Beziehung:

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str
```

Lies das als: *für eine Region `'a`, in der beide Eingaben gültig sind, ist auch das Ergebnis gültig*. `'a` ist keine Dauer, sondern die Überlappung der beiden Eingaben. Das Ergebnis darf also nur benutzt werden, solange **beide** leben - was der innere Bereich des Tests vorführt und weshalb Listing 10-24 des Buchs, das die Verwendung aus diesem Bereich herauszieht, nicht übersetzt.

## Strukturen, die Referenzen halten

```rust
pub struct Excerpt<'a> {
    pub part: &'a str,
}
```

Eine Struktur mit einer Referenz braucht einen Lifetime-Parameter, deklariert wie ein Typparameter. Er bedeutet: ein `Excerpt` darf den Text, in den es zeigt, nicht überleben. Das ist die Hälfte der Reparaturdatei, die leicht übersehen wird - sage *zwei* E0106-Fehler vorher, nicht einen.

## Elision: warum du bisher fast keine geschrieben hast

`first_word(text: &str) -> &str` übersetzt ohne Annotation, und so tat es jede leihende Funktion seit M2. Drei Regeln lassen den Compiler sie ergänzen:

1. Jede Eingabereferenz erhält ihre eigene Lifetime.
2. Gibt es genau **eine** Eingabe-Lifetime, wird sie jeder Ausgabe zugewiesen.
3. Ist eine der Eingaben `&self`, wird deren Lifetime jeder Ausgabe zugewiesen.

Regel 2 deckt `first_word` und, zurück in m5-02, `first_line` ab. `longest` hat zwei Eingabereferenzen und kein `self`, keine Regel greift also und du musst es selbst sagen.

`'_` in `first_sentence(text: &str) -> Excerpt<'_>` ist die anonyme Lifetime: sie sagt *dies leiht aus der Eingabe* und lässt die Elision wählen, welche - der Umstand bleibt sichtbar, ohne benannt zu werden.

## Alle drei auf einmal

```rust
pub fn longest_with_announcement<'a, T: Display>(x: &'a str, y: &'a str, announcement: T)
```

Lifetime-Parameter stehen in den spitzen Klammern zuerst, dann Typparameter, dann die Schranken. Es sieht dicht aus und ist nur drei unabhängige Ideen in einer Zeile - deshalb steht es am Ende des Moduls.

## Deine Aufgabe

Sage die Fehler der Reparaturdatei vorher, repariere sie und implementiere dann die vier Funktionen. Als Nächstes: das Projekt.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1** (im Browser zuverlässiger als Strg+Umschalt+P), tippe `Terminal: Create New Terminal` und drücke die Eingabetaste. Das Terminal öffnet sich im Bereich unten, bereits im Workspace-Ordner. Führe dann aus:

```bash
mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m6_04_missing_lifetime.rs
mkdir -p target/check && rustc --edition 2024 -o target/check/m6_04 repair/m6_04_missing_lifetime.rs && target/check/m6_04
cargo test --test m6-04-lifetimes
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** eine Compilerdiagnose und sonst nichts - diese Datei soll *nicht* übersetzen, der Fehler ist also das erwartete Ergebnis und nicht dein Fehler.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, steht das Terminal im falschen Ordner - wechsle mit `cd` zurück in den Workspace-Ordner.
