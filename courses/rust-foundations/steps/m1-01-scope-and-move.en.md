---
id: m1-01-scope-and-move
title: "Scope, owner, move"
bloom: understand
objectives: [ "rust-ch04-01-what-is-ownership" ]
requires: [ "m0-05-compiler-errors" ]
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
    check: { type: "predict", prompt: { en: "snippets/m1_01_move_error.rs assigns a String to a second variable and then prints both. Does it compile? If not, write the error code you expect and which of the two println! lines the compiler will point at.", de: "snippets/m1_01_move_error.rs bindet einen String an eine zweite Variable und gibt dann beide aus. Kompiliert das? Wenn nein, notiere den erwarteten Fehlercode und welche der beiden println!-Zeilen der Compiler markieren wird." }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m1_01_move_error.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0382\\]: borrow of moved value: `s1`", timeoutMs: 120000 }, rubric: "Predicts that it does not compile, with E0382, and points at the first println! - the one printing s1, the moved-from variable - not the second. A prediction of 'compiles, prints hello twice' is the common wrong model and worth naming as such.", bloom: "evaluate" }
  - id: ownership
    title: "takes_ownership and gives_ownership pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m1-01-scope-and-move", expectPass: [ "m1_01_scope_and_move::takes_ownership_returns_length", "m1_01_scope_and_move::empty_string_has_length_zero", "m1_01_scope_and_move::gives_ownership_returns_yours" ], minPass: 3, timeoutMs: 180000 }
socratic:
  - { trigger: "task:ownership:failed", question: { en: "Both functions are two lines long. Which one panics - and does the panic say `not yet implemented`, or does an assertion compare the wrong value?", de: "Beide Funktionen sind zwei Zeilen lang. Welche stürzt ab - und meldet die Panic `not yet implemented`, oder vergleicht eine Zusicherung den falschen Wert?" }, hints: [ { en: "`takes_ownership` owns `s`, so it may call any method on it, including `len()`.", de: "`takes_ownership` besitzt `s` und darf daher jede Methode darauf aufrufen, auch `len()`." }, { en: "`gives_ownership` has to create the `String` itself: `String::from(\"yours\")` allocates and hands the result to the caller.", de: "`gives_ownership` muss den `String` selbst erzeugen: `String::from(\"yours\")` alloziert und übergibt das Ergebnis an den Aufrufer." }, { en: "`len()` counts bytes, and for these ASCII test strings that is the same as characters.", de: "`len()` zählt Bytes, was bei diesen ASCII-Testzeichenketten dasselbe ist wie Zeichen." } ] }
misconceptions:
  - { pattern: "error\\[E0382\\]: borrow of moved value", question: { en: "The compiler says a value was moved. Which line moved it, and does the code after that line still need the old owner - or would the new one do?", de: "Der Compiler sagt, ein Wert wurde verschoben. Welche Zeile hat ihn verschoben, und braucht der Code danach wirklich noch den alten Eigentümer - oder täte es auch der neue?" }, hints: [ { en: "The diagnostic marks three places: where the value was created, `value moved here`, and `value borrowed here after move`. Read them in that order.", de: "Die Diagnose markiert drei Stellen: wo der Wert entstand, `value moved here` und `value borrowed here after move`. Lies sie in dieser Reihenfolge." }, { en: "Assigning a `String` to a second name, or passing it to a function by value, moves it; the old name is unusable afterwards.", de: "Ein `String` an einen zweiten Namen zu binden oder ihn per Wert an eine Funktion zu übergeben verschiebt ihn; der alte Name ist danach unbrauchbar." }, { en: "`clone()` is the honest fix only when you genuinely need two independent values; if you only need to read, a reference is what you want - and that is the next module.", de: "`clone()` ist nur dann die ehrliche Lösung, wenn du wirklich zwei unabhängige Werte brauchst; willst du nur lesen, ist eine Referenz das Richtige - und die kommt im nächsten Modul." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

State the three ownership rules and recognise, in a diagnostic, the moment a value stopped belonging to a variable.

## The three rules

From ch. 4.1, unchanged:

1. Each value in Rust has an *owner*.
2. There can only be one owner at a time.
3. When the owner gös out of scope, the value is dropped.

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

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m1_01_move_error.rs
cargo test --test m1-01-scope-and-move
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** a compiler diagnostic and nothing else - this file is *meant* not to compile, so the error is the expected result, not your mistake.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
