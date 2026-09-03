---
id: m3-01-structs
title: "Structs: Werte, die zusammengehören"
bloom: apply
objectives: [ "rust-ch05-01-defining-structs" ]
requires: [ "m2-04-slices" ]
estimatedMinutes: 20
scaffold: worked
recallFrom: [ "m1-03-copy-types" ]
links:
  - { step: "m3-02-enums" }
  - { file: "src/m3/m3_01_structs.rs" }
  - { file: "tests/m3-01-structs.rs" }
  - { url: "https://doc.rust-lang.org/book/ch05-01-defining-structs.html", title: "The Book, 5.1: Defining and Instantiating Structs" }
sources: [ "src/m3/m3_01_structs.rs", "tests/m3-01-structs.rs" ]
tasks:
  - id: structs
    title: "Alle sechs Struct-Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-01-structs", expectPass: [ "m3_01_structs::new_rectangle_sets_both_fields", "m3_01_structs::area_multiplies_and_borrows", "m3_01_structs::square_has_equal_sides", "m3_01_structs::widened_changes_only_the_width", "m3_01_structs::enrol_starts_active", "m3_01_structs::deactivate_changes_only_active" ], minPass: 6, timeoutMs: 180000 }
  - id: update-syntax
    title: "Du kannst erklären, warum ..s verbraucht und ..*r nicht"
    check: { type: "question", prompt: { en: "deactivate uses `..s` on a Student taken by value and consumes it, while widened uses `..*r` on a &Rectangle and leaves the caller's rectangle intact. Explain the difference in terms of the field types, and say what error you would get if Student's remaining fields were copied out of a shared reference.", de: "deactivate nutzt `..s` an einem per Wert genommenen Student und verbraucht ihn, während widened `..*r` an einem &Rectangle nutzt und das Rechteck des Aufrufers unangetastet lässt. Erkläre den Unterschied über die Feldtypen und nenne den Fehler, den du erhieltest, wenn Students restliche Felder aus einer geteilten Referenz kopiert würden." }, rubric: "States that struct update syntax moves the remaining fields, that u32/bool are Copy so ..*r copies them and the borrow ends, and that Student's String field is not Copy so it must be moved out of an owned value; taking it out of a &Student would be error E0507, cannot move out of a shared reference.", bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:structs:failed", question: { en: "Which function fails? For `widened`, is the height in your result the original one, or has it been scaled too?", de: "Welche Funktion scheitert? Ist bei `widened` die Höhe im Ergebnis die ursprüngliche, oder wurde sie mitskaliert?" }, hints: [ { en: "`widened` changes only `width`; `..*r` supplies the rest, so `height` must not appear in the literal.", de: "`widened` ändert nur `width`; `..*r` liefert den Rest, `height` darf also nicht im Literal stehen." }, { en: "In `new_rectangle` and `enrol` the parameters already carry the field names, so the shorthand `Rectangle { width, height }` applies.", de: "In `new_rectangle` und `enrol` tragen die Parameter bereits die Feldnamen, die Kurzform `Rectangle { width, height }` gilt also." }, { en: "`area` takes `&Rectangle`; read the fields through the reference, no dereference operator needed.", de: "`area` nimmt `&Rectangle`; lies die Felder über die Referenz, ein Dereferenzierungsoperator ist nicht nötig." } ] }
misconceptions:
  - { pattern: "error\\[E0507\\]: cannot move out of", question: { en: "You are taking an owned field out of something you only borrowed. Does the function need to own that field, or would a clone or a reference do?", de: "Du entnimmst ein besitzendes Feld aus etwas, das du nur geliehen hast. Muss die Funktion dieses Feld besitzen, oder täte es ein Klon oder eine Referenz?" }, hints: [ { en: "Struct update syntax moves every field it fills in; `..*r` on a reference only works when those fields are `Copy`.", de: "Die Struct-Update-Syntax verschiebt jedes Feld, das sie füllt; `..*r` an einer Referenz geht nur, wenn diese Felder `Copy` sind." }, { en: "Change the parameter to take the struct by value if the function is meant to consume it.", de: "Nimm die Struktur per Wert, wenn die Funktion sie verbrauchen soll." }, { en: "`.clone()` on the single field is the local fix when the caller must keep its value.", de: "`.clone()` auf dem einzelnen Feld ist die lokale Lösung, wenn der Aufrufer seinen Wert behalten muss." } ] }
  - { pattern: "error\\[E0063\\]: missing field", question: { en: "A struct literal is incomplete. Which field did you leave out, and did you mean to supply it from another instance?", de: "Ein Struct-Literal ist unvollständig. Welches Feld fehlt, und wolltest du es aus einer anderen Instanz übernehmen?" }, hints: [ { en: "Every field must be given a value; there are no defaults unless you implement `Default`.", de: "Jedes Feld braucht einen Wert; Vorgaben gibt es nur, wenn du `Default` implementierst." }, { en: "`..other` at the end of the literal fills in every field you did not name.", de: "`..other` am Ende des Literals füllt jedes nicht genannte Feld." }, { en: "The `..` entry must come last and needs no trailing comma.", de: "Der `..`-Eintrag muss zuletzt stehen und braucht kein nachgestelltes Komma." } ] }
---
## Lernziel

Definiere eine Struktur, instanziiere sie auf drei Arten und sage vorher, welche dieser Arten den Wert verbraucht, aus dem sie kopiert.

## Warum eine Struktur statt eines Tupels

`(30, 50)` und `Rectangle { width: 30, height: 50 }` enthalten dieselben zwei Zahlen. Der Unterschied ist, dass die zweite Form nicht verdreht werden kann. Eine Funktion mit Tupelparameter muss dokumentieren, welches Element was ist, und dem Aufrufer vertrauen; eine Funktion mit `Rectangle` kann auf diese Weise gar nicht falsch aufgerufen werden. Kapitel 5.1 führt dasselbe Argument, indem es eine `area`-Funktion durch beide Formen refaktoriert.

## Definieren und instanziieren

```rust
#[derive(Debug, Clone, PartialEq)]
pub struct Rectangle {
    pub width: u32,
    pub height: u32,
}
```

`derive` erzeugt Trait-Implementierungen mechanisch: `Debug` ermöglicht die Ausgabe mit `{:?}`, `Clone` liefert `.clone()`, `PartialEq` liefert `==`. Die Tests brauchen alle drei. `pub` an der Struktur und an jedem Feld steuert die Sichtbarkeit getrennt - ein Feld ohne `pub` wäre für den Test unsichtbar.

Beim Instanziieren wird jedes Feld genannt. Vorgaben gibt es nicht; lässt du eines weg, erhältst du `error[E0063]: missing field`.

## Kurzform der Feldinitialisierung

Trägt eine Variable bereits den Feldnamen, schreibe ihn einmal:

```rust
pub fn new_rectangle(width: u32, height: u32) -> Rectangle {
    Rectangle { width, height }
}
```

Kein Sonderfall für Konstruktoren - das gilt überall, wo die Namen übereinstimmen.

## Struct-Update-Syntax und ihr Ownership-Haken

`..other` füllt jedes nicht genannte Feld und muss zuletzt stehen:

```rust
pub fn widened(r: &Rectangle, factor: u32) -> Rectangle {
    Rectangle { width: r.width * factor, ..*r }
}
```

Hier lohnt es sich, langsamer zu lesen. `..` **verschiebt** die Felder, die es übernimmt. Hier sind beide verbleibenden Felder `u32` und damit `Copy`, es wird also nichts aus `*r` herausbewegt und das Rechteck des Aufrufers bleibt unberührt.

Vergleiche `Student`, der einen `String` besitzt:

```rust
pub fn deactivate(s: Student) -> Student {
    Student { active: false, ..s }
}
```

`name` ist ein `String` und wird tatsächlich aus `s` herausbewegt, `s` wird also verbraucht - deshalb steht der Parameter per Wert da. Dasselbe an einem `&Student` wäre `error[E0507]: cannot move out of a shared reference`, und die Lösung wäre entweder Ownership zu nehmen oder dieses eine Feld zu klonen. Die Unterscheidung zwischen `Copy` und Nicht-`Copy` aus M1 leistet hier die ganze Arbeit.

## Deine Aufgabe

Implementiere die sechs Funktionen und erkläre dann den Unterschied zwischen `..s` und `..*r`. Als Nächstes: Enums, für Daten, die eine von mehreren Formen sind statt alle von mehreren Feldern.
