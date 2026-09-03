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
    check: { type: "question", prompt: { en: "The test duplicates_are_independent pushes onto the first returned string and then checks the second is unchanged. Why does that test rule out a solution without clone, and what does the clone actually cost at runtime?", de: "Der Test duplicates_are_independent haengt an die erste zurueckgegebene Zeichenkette etwas an und prueft dann, dass die zweite unveraendert ist. Warum schliesst dieser Test eine Loesung ohne clone aus, und was kostet der clone zur Laufzeit tatsaechlich?" }, rubric: "States that two independently mutable Strings require two separate heap buffers, which only clone produces - a move would leave one value, and a shared buffer is impossible because only one owner may exist. Names the cost as a heap allocation plus a copy of the bytes, proportional to the length.", bloom: "analyze", minChars: 50 }
socratic:
  - { trigger: "task:clone:failed", question: { en: "Which of the four is failing? If it is `with_suffix`, look at the parameter: can you call a mutating method on a binding that is not `mut`?", de: "Welche der vier scheitert? Ist es `with_suffix`, sieh dir den Parameter an: kannst du eine veraendernde Methode auf einer Bindung aufrufen, die nicht `mut` ist?" }, hints: [ { en: "A by-value parameter may be declared `mut`: `pub fn with_suffix(mut s: String, …)`. That mutability belongs to the function's own copy of the binding, and it changes nothing for the caller.", de: "Ein Wert-Parameter darf `mut` deklariert werden: `pub fn with_suffix(mut s: String, …)`. Diese Veraenderlichkeit gehoert der eigenen Bindung der Funktion und aendert fuer den Aufrufer nichts." }, { en: "`duplicate` must produce two buffers; compute the clone first, then return the tuple, so the move of `s` happens last.", de: "`duplicate` muss zwei Puffer erzeugen; berechne zuerst den Klon und liefere dann das Tupel, damit der Move von `s` zuletzt passiert." }, { en: "In `length_and_back`, read the length before you move the string into the tuple - afterwards `s` is gone.", de: "Lies in `length_and_back` die Laenge, bevor du die Zeichenkette in das Tupel verschiebst - danach ist `s` weg." } ] }
misconceptions:
  - { pattern: "error\\[E0382\\]: borrow of moved value", question: { en: "The compiler says a value was moved. Which line moved it, and does the code after that line still need the old owner - or would the new one do?", de: "Der Compiler sagt, ein Wert wurde verschoben. Welche Zeile hat ihn verschoben, und braucht der Code danach wirklich noch den alten Eigentuemer - oder taete es auch der neue?" }, hints: [ { en: "The diagnostic marks three places: where the value was created, `value moved here`, and `value borrowed here after move`. Read them in that order.", de: "Die Diagnose markiert drei Stellen: wo der Wert entstand, `value moved here` und `value borrowed here after move`. Lies sie in dieser Reihenfolge." }, { en: "Assigning a `String` to a second name, or passing it to a function by value, moves it; the old name is unusable afterwards.", de: "Ein `String` an einen zweiten Namen zu binden oder ihn per Wert an eine Funktion zu uebergeben verschiebt ihn; der alte Name ist danach unbrauchbar." }, { en: "`clone()` is the honest fix only when you genuinely need two independent values; if you only need to read, a reference is what you want - and that is the next module.", de: "`clone()` ist nur dann die ehrliche Loesung, wenn du wirklich zwei unabhaengige Werte brauchst; willst du nur lesen, ist eine Referenz das Richtige - und die kommt im naechsten Modul." } ] }
  - { pattern: "error\\[E0596\\]: cannot borrow `\\w+` as mutable", question: { en: "You are calling a method that changes the value, on a binding that was not declared mutable. Whose binding is it - yours, or the caller's?", de: "Du rufst eine veraendernde Methode auf einer Bindung auf, die nicht als veraenderlich deklariert wurde. Wessen Bindung ist das - deine oder die des Aufrufers?" }, hints: [ { en: "For a by-value parameter the binding is yours: write `mut s: String` in the signature.", de: "Bei einem Wert-Parameter gehoert die Bindung dir: schreibe `mut s: String` in die Signatur." }, { en: "`mut` on a parameter is not part of the function's type; callers neither see nor care about it.", de: "`mut` an einem Parameter gehoert nicht zum Typ der Funktion; Aufrufer sehen es nicht und es stoert sie nicht." }, { en: "The alternative is not to mutate at all: `format!(\"{s}{suffix}\")` builds a new String instead.", de: "Die Alternative ist, gar nicht zu veraendern: `format!(\"{s}{suffix}\")` baut stattdessen einen neuen String." } ] }
---
## Lernziel

Waehle bewusst zwischen Verschieben, Zurueckgeben und Klonen eines Werts - und benenne, was der Klon kostet.

## Drei Wege, einen Wert weiter zu nutzen

Die Move-Regel laesst drei Moeglichkeiten, und dieser Step uebt alle drei.

**Zurueckgeben.** Listing 4-5 des Buchs liefert den Wert zusammen mit dem Berechneten zurueck:

```rust
pub fn length_and_back(s: String) -> (String, usize) { … }
```

Umstaendlich, und genau der Grund, warum es Referenzen gibt - aber ehrlich und ohne Kosten. Lies die Laenge, *bevor* du das Tupel baust; nach `(s, …)` ist die Zeichenkette verschoben.

**Nehmen und eine neue geben.** `with_suffix` verbraucht die Zeichenkette und liefert die verlaengerte zurueck. Um den Wert zu veraendern, den du besitzt, deklariere den Parameter veraenderlich:

```rust
pub fn with_suffix(mut s: String, suffix: &str) -> String {
```

`mut` an einem Wert-Parameter gehoert nicht zum Typ der Signatur. Aufrufer sehen es nicht und es betrifft sie nicht; es sagt nur: *diese Funktion darf ihre eigene Bindung veraendern*. Ohne es erhaeltst du `error[E0596]: cannot borrow s as mutable`.

**Klonen.** Wenn du wirklich zwei unabhaengige Werte brauchst, alloziert `clone()` einen zweiten Heap-Puffer und kopiert die Bytes:

```rust
pub fn duplicate(s: String) -> (String, String) { … }
```

Der Test, der das festnagelt, ist `duplicates_are_independent`: er haengt an das erste Ergebnis an und verlangt, dass das zweite unveraendert bleibt. Keine Anordnung von Moves erfuellt das - ein Eigentuemer, ein Puffer.

## Was ein clone tatsaechlich kostet

Eine Allokation und eine Bytekopie, linear in der Laenge. Bei einer fuenf Zeichen langen Testzeichenkette ist das nichts. In einer Schleife ueber ein grosses Dokument ist es der Unterschied zwischen einem schnellen und einem langsamen Programm - und der Grund, warum `clone()` in Rust ein bewusster Aufruf ist und nichts, was stillschweigend geschieht.

Die Falle ist, `clone()` reflexhaft einzusetzen, um E0382 loszuwerden. Frage zuerst: brauche ich zwei Werte, oder will ich nur *hinsehen*? Ist es das Zweite, lautet die Antwort Referenz, und das ist das naechste Modul. Klonen, um Borrowing nicht lernen zu muessen, ergibt Code, der funktioniert und den ein Reviewer zurueckschickt.

## Deine Aufgabe

Implementiere `duplicate`, `length_and_back` und `with_suffix`, fuehre `cargo test --test m1-02-move-vs-clone` aus und beantworte dann, warum der Unabhaengigkeitstest eine Loesung ohne clone ausschliesst.
