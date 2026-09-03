---
id: m1-02-move-vs-clone
title: "Move or clone: which one you actually need"
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
    title: "All four functions pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m1-02-move-vs-clone", expectPass: [ "m1_02_move_vs_clone::duplicate_returns_two_equal_strings", "m1_02_move_vs_clone::duplicates_are_independent", "m1_02_move_vs_clone::length_and_back_returns_ownership", "m1_02_move_vs_clone::with_suffix_appends" ], minPass: 4, timeoutMs: 180000 }
  - id: cost
    title: "You can name the cost of clone"
    check: { type: "question", prompt: { en: "The test duplicates_are_independent pushes onto the first returned string and then checks the second is unchanged. Why does that test rule out a solution without clone, and what does the clone actually cost at runtime?", de: "Der Test duplicates_are_independent hängt an die erste zurückgegebene Zeichenkette etwas an und prüft dann, dass die zweite unverändert ist. Warum schließt dieser Test eine Lösung ohne clone aus, und was kostet der clone zur Laufzeit tatsächlich?" }, rubric: "States that two independently mutable Strings require two separate heap buffers, which only clone produces - a move would leave one value, and a shared buffer is impossible because only one owner may exist. Names the cost as a heap allocation plus a copy of the bytes, proportional to the length.", bloom: "analyze", minChars: 50 }
socratic:
  - { trigger: "task:clone:failed", question: { en: "Which of the four is failing? If it is `with_suffix`, look at the parameter: can you call a mutating method on a binding that is not `mut`?", de: "Welche der vier scheitert? Ist es `with_suffix`, sieh dir den Parameter an: kannst du eine verändernde Methode auf einer Bindung aufrufen, die nicht `mut` ist?" }, hints: [ { en: "A by-value parameter may be declared `mut`: `pub fn with_suffix(mut s: String, …)`. That mutability belongs to the function's own copy of the binding, and it changes nothing for the caller.", de: "Ein Wert-Parameter darf `mut` deklariert werden: `pub fn with_suffix(mut s: String, …)`. Diese Veränderlichkeit gehört der eigenen Bindung der Funktion und ändert für den Aufrufer nichts." }, { en: "`duplicate` must produce two buffers; compute the clone first, then return the tuple, so the move of `s` happens last.", de: "`duplicate` muss zwei Puffer erzeugen; berechne zuerst den Klon und liefere dann das Tupel, damit der Move von `s` zuletzt passiert." }, { en: "In `length_and_back`, read the length before you move the string into the tuple - afterwards `s` is gone.", de: "Lies in `length_and_back` die Länge, bevor du die Zeichenkette in das Tupel verschiebst - danach ist `s` weg." } ] }
misconceptions:
  - { pattern: "error\\[E0382\\]: borrow of moved value", question: { en: "The compiler says a value was moved. Which line moved it, and does the code after that line still need the old owner - or would the new one do?", de: "Der Compiler sagt, ein Wert wurde verschoben. Welche Zeile hat ihn verschoben, und braucht der Code danach wirklich noch den alten Eigentümer - oder täte es auch der neue?" }, hints: [ { en: "The diagnostic marks three places: where the value was created, `value moved here`, and `value borrowed here after move`. Read them in that order.", de: "Die Diagnose markiert drei Stellen: wo der Wert entstand, `value moved here` und `value borrowed here after move`. Lies sie in dieser Reihenfolge." }, { en: "Assigning a `String` to a second name, or passing it to a function by value, moves it; the old name is unusable afterwards.", de: "Ein `String` an einen zweiten Namen zu binden oder ihn per Wert an eine Funktion zu übergeben verschiebt ihn; der alte Name ist danach unbrauchbar." }, { en: "`clone()` is the honest fix only when you genuinely need two independent values; if you only need to read, a reference is what you want - and that is the next module.", de: "`clone()` ist nur dann die ehrliche Lösung, wenn du wirklich zwei unabhängige Werte brauchst; willst du nur lesen, ist eine Referenz das Richtige - und die kommt im nächsten Modul." } ] }
  - { pattern: "error\\[E0596\\]: cannot borrow `\\w+` as mutable", question: { en: "You are calling a method that changes the value, on a binding that was not declared mutable. Whose binding is it - yours, or the caller's?", de: "Du rufst eine verändernde Methode auf einer Bindung auf, die nicht als veränderlich deklariert wurde. Wessen Bindung ist das - deine oder die des Aufrufers?" }, hints: [ { en: "For a by-value parameter the binding is yours: write `mut s: String` in the signature.", de: "Bei einem Wert-Parameter gehört die Bindung dir: schreibe `mut s: String` in die Signatur." }, { en: "`mut` on a parameter is not part of the function's type; callers neither see nor care about it.", de: "`mut` an einem Parameter gehört nicht zum Typ der Funktion; Aufrufer sehen es nicht und es stört sie nicht." }, { en: "The alternative is not to mutate at all: `format!(\"{s}{suffix}\")` builds a new String instead.", de: "Die Alternative ist, gar nicht zu verändern: `format!(\"{s}{suffix}\")` baut stattdessen einen neuen String." } ] }
---
## Learning goal

Choose deliberately between moving a value, handing it back, and cloning it - and be able to say what the clone costs.

## Three ways to keep using a value

The move rule leaves you three options, and this step exercises all of them.

**Hand it back.** The book's Listing 4-5 returns the value together with whatever the function computed:

```rust
pub fn length_and_back(s: String) -> (String, usize) { … }
```

Clumsy, and the reason references exist - but it is honest and costs nothing. Read the length *before* you build the tuple; after `(s, …)` the string has moved.

**Take it and give a new one.** `with_suffix` consumes the string and returns the extended one. To mutate the value you own, declare the parameter mutable:

```rust
pub fn with_suffix(mut s: String, suffix: &str) -> String {
```

`mut` on a by-value parameter is not part of the signature's type. Callers do not see it and are not affected; it only says *this function may change its own copy of the binding*. Without it you get `error[E0596]: cannot borrow s as mutable`.

**Clone.** When you genuinely need two independent values, `clone()` allocates a second heap buffer and copies the bytes:

```rust
pub fn duplicate(s: String) -> (String, String) { … }
```

The test that pins this down is `duplicates_are_independent`: it pushes onto the first result and asserts the second did not change. No arrangement of moves can satisfy that - one owner, one buffer.

## What clone actually costs

An allocation plus a byte copy, linear in the length. For a five-character string in a test that is nothing. In a loop over a large document it is the difference between a program that is fast and one that is not - and the reason `clone()` is a deliberate call in Rust rather than something that happens silently.

The trap is using `clone()` as a reflex to silence E0382. Ask first: do I need two values, or do I only need to *look* at one? If it is the second, the answer is a reference, and that is the next module. Cloning to avoid learning borrowing produces code that works and that a reviewer will send back.

## Your task

Implement `duplicate`, `length_and_back` and `with_suffix`, run `cargo test --test m1-02-move-vs-clone`, and then answer why the independence test rules out a clone-free solution.
