---
id: m1-02-move-vs-clone
title: "Move oder Clone: was du wirklich brauchst"
bloom: apply
objectives: [ "rust-ch04-01-what-is-ownership" ]
requires: [ "m1-01-scope-and-move" ]
estimatedMinutes: 20
scaffold: faded
links:
  - { step: "m1-03-copy-types" }
  - { file: "src/m1/m1_02_move_vs_clone.rs" }
  - { file: "tests/m1-02-move-vs-clone.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html", title: "The Book, 4.1: What Is Ownership?" }
sources: [ "src/m1/m1_02_move_vs_clone.rs", "tests/m1-02-move-vs-clone.rs" ]
tasks:
  - id: clone
    title: "Alle vier Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m1-02-move-vs-clone", expectPass: [ "m1_02_move_vs_clone::duplicate_returns_two_equal_strings", "m1_02_move_vs_clone::duplicates_are_independent", "m1_02_move_vs_clone::length_and_back_returns_ownership", "m1_02_move_vs_clone::with_suffix_appends" ], minPass: 4, timeoutMs: 180000 }
  - id: cost
    title: "Du kannst die Kosten von clone benennen"
    check: { type: "question", prompt: { en: "The test duplicates_are_independent pushes onto the first returned string and then checks the second is unchanged. Why does that test rule out a solution without clone, and what does the clone actually cost at runtime?", de: "Der Test duplicates_are_independent hängt an die erste zurückgegebene Zeichenkette etwas an und prüft dann, dass die zweite unverändert ist. Warum schließt dieser Test eine Lösung ohne clone aus, und was kostet der clone zur Laufzeit tatsächlich?" }, rubric: "States that two independently mutable Strings require two separate heap buffers, which only clone produces - a move would leave one value, and a shared buffer is impossible because only one owner may exist. Names the cost as a heap allocation plus a copy of the bytes, proportional to the length.", bloom: "analyze", minChars: 50 }
socratic:
  - { trigger: "task:clone:failed", question: { en: "Which of the four is failing? If it is `with_suffix`, look at the parameter: can you call a mutating method on a binding that is not `mut`?", de: "Welche der vier scheitert? Ist es `with_suffix`, sieh dir den Parameter an: kannst du eine verändernde Methode auf einer Bindung aufrufen, die nicht `mut` ist?" }, hints: [ { en: "A by-value parameter may be declared `mut`: `pub fn with_suffix(mut s: String, …)`. That mutability belongs to the function's own copy of the binding, and it changes nothing for the caller.", de: "Ein Wert-Parameter darf `mut` deklariert werden: `pub fn with_suffix(mut s: String, …)`. Diese Veränderlichkeit gehört der eigenen Bindung der Funktion und ändert für den Aufrufer nichts." }, { en: "`duplicate` must produce two buffers; compute the clone first, then return the tuple, so the move of `s` happens last.", de: "`duplicate` muss zwei Puffer erzeugen; berechne zuerst den Klon und liefere dann das Tupel, damit der Move von `s` zuletzt passiert." }, { en: "In `length_and_back`, read the length before you move the string into the tuple - afterwards `s` is gone.", de: "Lies in `length_and_back` die Länge, bevor du die Zeichenkette in das Tupel verschiebst - danach ist `s` weg." } ] }
misconceptions:
  - { pattern: "error\\[E0382\\]: borrow of moved value", question: { en: "The compiler says a value was moved. Which line moved it, and does the code after that line still need the old owner - or would the new one do?", de: "Der Compiler sagt, ein Wert wurde verschoben. Welche Zeile hat ihn verschoben, und braucht der Code danach wirklich noch den alten Eigentümer - oder täte es auch der neue?" }, hints: [ { en: "The diagnostic marks three places: where the value was created, `value moved here`, and `value borrowed here after move`. Read them in that order.", de: "Die Diagnose markiert drei Stellen: wo der Wert entstand, `value moved here` und `value borrowed here after move`. Lies sie in dieser Reihenfolge." }, { en: "Assigning a `String` to a second name, or passing it to a function by value, moves it; the old name is unusable afterwards.", de: "Ein `String` an einen zweiten Namen zu binden oder ihn per Wert an eine Funktion zu übergeben verschiebt ihn; der alte Name ist danach unbrauchbar." }, { en: "`clone()` is the honest fix only when you genuinely need two independent values; if you only need to read, a reference is what you want - and that is the next module.", de: "`clone()` ist nur dann die ehrliche Lösung, wenn du wirklich zwei unabhängige Werte brauchst; willst du nur lesen, ist eine Referenz das Richtige - und die kommt im nächsten Modul." } ] }
  - { pattern: "error\\[E0596\\]: cannot borrow `\\w+` as mutable", question: { en: "You are calling a method that changes the value, on a binding that was not declared mutable. Whose binding is it - yours, or the caller's?", de: "Du rufst eine verändernde Methode auf einer Bindung auf, die nicht als veränderlich deklariert wurde. Wessen Bindung ist das - deine oder die des Aufrufers?" }, hints: [ { en: "For a by-value parameter the binding is yours: write `mut s: String` in the signature.", de: "Bei einem Wert-Parameter gehört die Bindung dir: schreibe `mut s: String` in die Signatur." }, { en: "`mut` on a parameter is not part of the function's type; callers neither see nor care about it.", de: "`mut` an einem Parameter gehört nicht zum Typ der Funktion; Aufrufer sehen es nicht und es stört sie nicht." }, { en: "The alternative is not to mutate at all: `format!(\"{s}{suffix}\")` builds a new String instead.", de: "Die Alternative ist, gar nicht zu verändern: `format!(\"{s}{suffix}\")` baut stattdessen einen neuen String." } ] }
---
## Lernziel

Wähle bewusst zwischen Verschieben, Zurückgeben und Klonen eines Werts - und benenne, was der Klon kostet.

## Drei Wege, einen Wert weiter zu nutzen

Die Move-Regel lässt drei Möglichkeiten, und dieser Step übt alle drei.

**Zurückgeben.** Listing 4-5 des Buchs liefert den Wert zusammen mit dem Berechneten zurück:

```rust
pub fn length_and_back(s: String) -> (String, usize) { … }
```

Umständlich, und genau der Grund, warum es Referenzen gibt - aber ehrlich und ohne Kosten. Lies die Länge, *bevor* du das Tupel baust; nach `(s, …)` ist die Zeichenkette verschoben.

**Nehmen und eine neue geben.** `with_suffix` verbraucht die Zeichenkette und liefert die verlängerte zurück. Um den Wert zu verändern, den du besitzt, deklariere den Parameter veränderlich:

```rust
pub fn with_suffix(mut s: String, suffix: &str) -> String {
```

`mut` an einem Wert-Parameter gehört nicht zum Typ der Signatur. Aufrufer sehen es nicht und es betrifft sie nicht; es sagt nur: *diese Funktion darf ihre eigene Bindung verändern*. Ohne es erhältst du `error[E0596]: cannot borrow s as mutable`.

**Klonen.** Wenn du wirklich zwei unabhängige Werte brauchst, alloziert `clone()` einen zweiten Heap-Puffer und kopiert die Bytes:

```rust
pub fn duplicate(s: String) -> (String, String) { … }
```

Der Test, der das festnagelt, ist `duplicates_are_independent`: er hängt an das erste Ergebnis an und verlangt, dass das zweite unverändert bleibt. Keine Anordnung von Moves erfüllt das - ein Eigentümer, ein Puffer.

## Was ein clone tatsächlich kostet

Eine Allokation und eine Bytekopie, linear in der Länge. Bei einer fünf Zeichen langen Testzeichenkette ist das nichts. In einer Schleife über ein großes Dokument ist es der Unterschied zwischen einem schnellen und einem langsamen Programm - und der Grund, warum `clone()` in Rust ein bewusster Aufruf ist und nichts, was stillschweigend geschieht.

Die Falle ist, `clone()` reflexhaft einzusetzen, um E0382 loszuwerden. Frage zuerst: brauche ich zwei Werte, oder will ich nur *hinsehen*? Ist es das Zweite, lautet die Antwort Referenz, und das ist das nächste Modul. Klonen, um Borrowing nicht lernen zu müssen, ergibt Code, der funktioniert und den ein Reviewer zurückschickt.

## Deine Aufgabe

Implementiere `duplicate`, `length_and_back` und `with_suffix`, führe `cargo test --test m1-02-move-vs-clone` aus und beantworte dann, warum der Unabhängigkeitstest eine Lösung ohne clone ausschließt.
