---
id: m6-01-generics
title: "Generics: eine Funktion, viele Typen"
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
    title: "Die generischen Funktionen und Strukturen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-01-generics", expectPass: [ "m6_01_generics::largest_works_for_numbers_and_chars", "m6_01_generics::largest_returns_a_reference_into_the_slice", "m6_01_generics::swap_exchanges_both_values", "m6_01_generics::first_of_clones", "m6_01_generics::label_mixes_two_type_parameters" ], minPass: 5, timeoutMs: 180000 }
  - id: bounds-why
    title: "Du kannst erklären, warum largest eine Schranke braucht"
    check: { type: "question", prompt: { en: "swap<T> needs no trait bound at all, while largest<T> needs T: PartialOrd. Explain what the compiler knows about an unbounded T, and why returning &T rather than T in largest avoids a second bound.", de: "swap<T> braucht gar keine Trait-Schranke, largest<T> aber T: PartialOrd. Erkläre, was der Compiler über ein ungebundenes T weiß, und warum die Rückgabe von &T statt T in largest eine zweite Schranke erspart." }, rubric: "States that an unbounded T supports only what every type supports - being moved and dropped - which is enough for swap because it only moves values around, while largest compares with > and comparison is exactly what PartialOrd provides. The second half should note that returning an owned T would require copying or cloning the element out of the slice, hence Copy or Clone, whereas returning a reference borrows it and needs nothing.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:generics:failed", question: { en: "Which one fails? For `largest`, are you comparing the items themselves or the references to them - and does the result borrow from the slice?", de: "Welche scheitert? Vergleichst du in `largest` die Elemente selbst oder die Referenzen darauf - und leiht das Ergebnis aus dem Slice?" }, hints: [ { en: "Start with `let mut largest = &list[0];` and compare `item > largest`; both sides are then `&T` and `PartialOrd` applies through the reference.", de: "Beginne mit `let mut largest = &list[0];` und vergleiche `item > largest`; beide Seiten sind dann `&T`, und `PartialOrd` gilt durch die Referenz hindurch." }, { en: "`first_of` has a `Clone` bound because it hands back an owned value: `list.first().cloned()`.", de: "`first_of` hat eine `Clone`-Schranke, weil es einen besitzenden Wert zurückgibt: `list.first().cloned()`." }, { en: "`label` has two independent parameters; the function body just builds the struct from them.", de: "`label` hat zwei unabhängige Parameter; der Rumpf baut daraus lediglich die Struktur." } ] }
misconceptions:
  - { pattern: "error\\[E0369\\]: binary operation `>` cannot be applied to type", question: { en: "You compared two values of a generic type with no bound. Which trait provides comparison, and where does it belong in the signature?", de: "Du hast zwei Werte eines generischen Typs ohne Schranke verglichen. Welches Trait liefert den Vergleich, und wohin gehört es in der Signatur?" }, hints: [ { en: "`T: PartialOrd` after the type parameter is what makes `<` and `>` legal in the body.", de: "`T: PartialOrd` hinter dem Typparameter macht `<` und `>` im Rumpf zulässig." }, { en: "The diagnostic usually suggests the exact bound to add - check it against what the body actually needs.", de: "Die Diagnose schlägt meist genau die fehlende Schranke vor - prüfe sie an dem, was der Rumpf wirklich braucht." }, { en: "A generic parameter with no bound supports only moving and dropping; every operation has to be justified by a bound.", de: "Ein generischer Parameter ohne Schranke unterstützt nur Verschieben und Aufräumen; jede Operation muss durch eine Schranke begründet sein." } ] }
  - { pattern: "error\\[E0507\\]: cannot move out of", question: { en: "You tried to take an owned value out of a slice you only borrowed. Does the caller keep its data - and if so, is a reference or a clone the right answer?", de: "Du wolltest einen besitzenden Wert aus einem nur geliehenen Slice nehmen. Behält der Aufrufer seine Daten - und ist dann eine Referenz oder ein Klon die richtige Antwort?" }, hints: [ { en: "`largest` returns `&T`, so nothing needs to be moved out at all.", de: "`largest` liefert `&T`, es muss also gar nichts herausbewegt werden." }, { en: "`first_of` really does hand back a value, which is why it carries the `Clone` bound and uses `.cloned()`.", de: "`first_of` gibt tatsächlich einen Wert heraus, deshalb trägt es die `Clone`-Schranke und nutzt `.cloned()`." }, { en: "Indexing a slice of a non-Copy type gives a place, not a value; `&list[0]` borrows it instead.", de: "Ein Slice eines Nicht-Copy-Typs zu indizieren liefert einen Ort, keinen Wert; `&list[0]` leiht ihn stattdessen." } ] }
---
## Lernziel

Lies und schreibe eine generische Signatur und sage, was der Compiler über einen Typparameter annehmen darf.

## Die Verdopplung, die Generics beseitigen

Zwei Funktionen, die das größte Element finden - eine für `i32`, eine für `char` - unterscheiden sich nur in einem Typnamen. Kapitel 10.1 führt diese Umformung vor; das Ergebnis ist:

```rust
pub fn largest<T: PartialOrd>(list: &[T]) -> &T
```

`<T>` hinter dem Namen deklariert den Parameter. Er ist ein Platzhalter, der an jeder Aufrufstelle gefüllt wird, und der Compiler erzeugt je konkretem Typ eine spezialisierte Kopie der Funktion - *Monomorphisierung*. Es entstehen weder Laufzeitkosten noch dynamische Dispatch-Aufrufe; die generische Fassung ist genau so schnell wie die beiden handgeschriebenen.

## Was ein ungebundenes T kann

Sehr wenig. `T` ohne Schranke unterstützt nur, was jeder Typ unterstützt: verschoben und aufgeräumt zu werden. Für `swap` genügt das:

```rust
pub fn swap<T>(p: Pair<T>) -> Pair<T> {
    Pair { first: p.second, second: p.first }
}
```

Es verschiebt lediglich Werte von einem Feld ins andere, und Verschieben funktioniert für jeden Typ.

`largest` vergleicht, und Vergleichen ist nicht allgemein, es muss also fragen:

```text
error[E0369]: binary operation `>` cannot be applied to type `&T`
```

`T: PartialOrd` ist die Antwort. Lies eine Schranke als Versprechen, das der Aufrufer halten muss und auf das sich der Rumpf stützen darf - nicht mehr und nicht weniger.

## Warum `&T` und nicht `T`

`T` zurückzugeben hieße, ein Element aus einem Slice zu nehmen, den der Aufrufer noch besitzt - das ist `error[E0507]: cannot move out of`. Du bräuchtest dann `T: Copy` oder `T: Clone` zusätzlich zu `PartialOrd` und schränktest ein, wer die Funktion aufrufen darf. `&T` zurückzugeben leiht stattdessen und braucht nichts weiter. Der Test zeigt den Unterschied: `largest(&words)` funktioniert an einem `Vec<String>`, der weder `Copy` noch billig zu klonen ist, und der Vektor besitzt seine Zeichenketten danach weiterhin.

`first_of` ist der bewusste Gegensatz: es gibt einen besitzenden Wert heraus, trägt also `T: Clone` und nutzt `.cloned()`. Zwei Funktionen, zwei Verträge, und jede Schranke steht dort, weil der Rumpf sie braucht.

## Generische Strukturen

```rust
pub struct Pair<T> { pub first: T, pub second: T }
pub struct Labelled<L, V> { pub label: L, pub value: V }
```

Ein Parameter heißt, dass beide Felder *denselben* Typ haben; `Pair { first: 1, second: "x" }` übersetzt nicht. Zwei Parameter erlauben Unterschiede - so sind `Option<T>`, `Result<T, E>` und `HashMap<K, V>` deklariert. Nimm so viele, wie du brauchst, und nicht mehr: jeder zusätzliche Parameter ist etwas, das der Leser mitführen muss.

## Deine Aufgabe

Implementiere die vier Elemente und erkläre dann, warum `swap` keine Schranke braucht und `largest` schon. Der nächste Step behandelt, wie man das Verhalten definiert, auf das sich eine Schranke bezieht.
