---
id: m1-01-scope-and-move
title: "Scope, owner, move"
bloom: understand
objectives: [ "rust-ch04-01-what-is-ownership" ]
requires: [ "m0-04-compiler-errors" ]
estimatedMinutes: 20
scaffold: worked
links:
  - { step: "m1-02-move-vs-clone" }
  - { file: "src/m1/m1_01_scope.rs" }
  - { file: "snippets/m1_01_move_error.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html", title: "The Book, 4.1: What Is Ownership?" }
sources: [ "src/m1/m1_01_scope.rs", "tests/m1-01-scope-and-move.rs", "snippets/m1_01_move_error.rs" ]
tasks:
  - id: guess
    title: "Predict whether the move snippet compiles"
    check: { type: "predict", prompt: { en: "snippets/m1_01_move_error.rs assigns a String to a second variable and then prints both. Does it compile? If not, write the error code you expect and which of the two println! lines the compiler will point at.", de: "snippets/m1_01_move_error.rs bindet einen String an eine zweite Variable und gibt dann beide aus. Kompiliert das? Wenn nein, notiere den erwarteten Fehlercode und welche der beiden println!-Zeilen der Compiler markieren wird." }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m1_01_move_error.rs", expectExitCode: 1, expectStderr: "error\\[E0382\\]: borrow of moved value: `s1`", timeoutMs: 120000 }, rubric: "Predicts that it does not compile, with E0382, and points at the first println! - the one printing s1, the moved-from variable - not the second. A prediction of 'compiles, prints hello twice' is the common wrong model and worth naming as such.", bloom: "evaluate" }
  - id: ownership
    title: "takes_ownership and gives_ownership pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m1-01-scope-and-move", expectPass: [ "m1_01_scope_and_move::takes_ownership_returns_length", "m1_01_scope_and_move::empty_string_has_length_zero", "m1_01_scope_and_move::gives_ownership_returns_yours" ], minPass: 3, timeoutMs: 180000 }
socratic:
  - { trigger: "task:ownership:failed", question: { en: "Both functions are two lines long. Which one panics - and does the panic say `not yet implemented`, or does an assertion compare the wrong value?", de: "Beide Funktionen sind zwei Zeilen lang. Welche stuerzt ab - und meldet die Panic `not yet implemented`, oder vergleicht eine Zusicherung den falschen Wert?" }, hints: [ { en: "`takes_ownership` owns `s`, so it may call any method on it, including `len()`.", de: "`takes_ownership` besitzt `s` und darf daher jede Methode darauf aufrufen, auch `len()`." }, { en: "`gives_ownership` has to create the `String` itself: `String::from(\"yours\")` allocates and hands the result to the caller.", de: "`gives_ownership` muss den `String` selbst erzeugen: `String::from(\"yours\")` alloziert und uebergibt das Ergebnis an den Aufrufer." }, { en: "`len()` counts bytes, and for these ASCII test strings that is the same as characters.", de: "`len()` zaehlt Bytes, was bei diesen ASCII-Testzeichenketten dasselbe ist wie Zeichen." } ] }
misconceptions:
  - { pattern: "error\\[E0382\\]: borrow of moved value", question: { en: "The compiler says a value was moved. Which line moved it, and does the code after that line still need the old owner - or would the new one do?", de: "Der Compiler sagt, ein Wert wurde verschoben. Welche Zeile hat ihn verschoben, und braucht der Code danach wirklich noch den alten Eigentuemer - oder taete es auch der neue?" }, hints: [ { en: "The diagnostic marks three places: where the value was created, `value moved here`, and `value borrowed here after move`. Read them in that order.", de: "Die Diagnose markiert drei Stellen: wo der Wert entstand, `value moved here` und `value borrowed here after move`. Lies sie in dieser Reihenfolge." }, { en: "Assigning a `String` to a second name, or passing it to a function by value, moves it; the old name is unusable afterwards.", de: "Ein `String` an einen zweiten Namen zu binden oder ihn per Wert an eine Funktion zu uebergeben verschiebt ihn; der alte Name ist danach unbrauchbar." }, { en: "`clone()` is the honest fix only when you genuinely need two independent values; if you only need to read, a reference is what you want - and that is the next module.", de: "`clone()` ist nur dann die ehrliche Loesung, wenn du wirklich zwei unabhaengige Werte brauchst; willst du nur lesen, ist eine Referenz das Richtige - und die kommt im naechsten Modul." } ] }
---
## Learning goal

State the three ownership rules and recognise, in a diagnostic, the moment a value stopped belonging to a variable.

## The three rules

From ch. 4.1, unchanged:

1. Each value in Rust has an *owner*.
2. There can only be one owner at a time.
3. When the owner goes out of scope, the value is dropped.

The third rule is what replaces both garbage collection and manual `free`. At the closing brace of the scope that owns a `String`, Rust calls `drop` and the heap allocation is returned. No runtime is involved and nothing is scanned; the compiler simply knows where the brace is.

## Why `String` and not `&str`

A string literal is baked into the binary, has a fixed size and is never freed, so it can be copied freely. A `String` is different: a pointer, a length and a capacity on the stack, and a buffer on the heap whose size is only known at runtime. That heap buffer is the thing ownership is about.

## What a move is

```rust
let s1 = String::from("hello");
let s2 = s1;
```

Rust copies the three stack words into `s2` and does **not** copy the heap buffer - so both would point at the same allocation. Two owners means a double free at the end of the scope, so rule 2 forbids it: `s1` is *moved* into `s2` and is no longer valid. Not a shallow copy, not a deep copy - a move.

Try using `s1` afterwards and you get:

```text
error[E0382]: borrow of moved value: `s1`
5 |     let s2 = s1;
  |              -- value moved here
7 |     println!("{s1}, world!");
  |                ^^ value borrowed here after move
```

That is `snippets/m1_01_move_error.rs`. Predict its outcome before you compile it; the check runs `rustc` on it and expects exactly this failure.

## Moving into and out of functions

Passing by value moves, exactly like assignment - and returning moves the value back out. `src/m1/m1_01_scope.rs` has one of each:

```rust
pub fn takes_ownership(s: String) -> usize { … }
pub fn gives_ownership() -> String { … }
```

The test after the first call is the interesting line:

```rust
let s = String::from("hello");
assert_eq!(takes_ownership(s), 5);
// `s` is gone here: using it would be error E0382.
```

The caller gave the string away. `takes_ownership` drops it when it returns. This is a real constraint, and the next two steps show the two honest ways around it: hand the value back, or clone. The way you will actually use most - borrowing - is module M2.

## Your task

Predict the snippet's outcome, then implement both functions and run `cargo test --test m1-01-scope-and-move`.
