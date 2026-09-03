---
id: m2-01-shared-references
title: "Borrow instead of taking"
bloom: apply
objectives: [ "rust-ch04-02-references-and-borrowing" ]
requires: [ "m1-04-ownership-and-functions" ]
estimatedMinutes: 20
scaffold: worked
recallFrom: [ "m1-02-move-vs-clone" ]
links:
  - { step: "m2-02-mutable-references" }
  - { file: "src/m2/m2_01_shared_refs.rs" }
  - { file: "snippets/m2_01_mutate_through_shared_ref.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html", title: "The Book, 4.2: References and Borrowing" }
sources: [ "src/m2/m2_01_shared_refs.rs", "tests/m2-01-shared-references.rs", "snippets/m2_01_mutate_through_shared_ref.rs" ]
tasks:
  - id: guess
    title: "Predict whether you can change a value through &"
    check: { type: "predict", prompt: { en: "snippets/m2_01_mutate_through_shared_ref.rs passes a String to a function as &String and calls push_str on it. Does it compile? Name the error code if not, and say which line the compiler will underline.", de: "snippets/m2_01_mutate_through_shared_ref.rs übergibt einen String als &String an eine Funktion und ruft push_str darauf auf. Kompiliert das? Nenne andernfalls den Fehlercode und sage, welche Zeile der Compiler unterstreichen wird." }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_01_mutate_through_shared_ref.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0596\\]: cannot borrow `\\*some_string` as mutable", timeoutMs: 120000 }, rubric: "Predicts that it does not compile and names E0596 (or describes it as 'cannot borrow as mutable behind a & reference'), pointing at the push_str line inside change, not the call site. Predicting E0502 or E0499 shows the aliasing rule is being confused with plain immutability.", bloom: "evaluate" }
  - id: borrow
    title: "The three borrowing functions pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-01-shared-references", expectPass: [ "m2_01_shared_references::calculate_length_borrows", "m2_01_shared_references::count_char_counts", "m2_01_shared_references::same_length_compares_lengths" ], minPass: 3, timeoutMs: 180000 }
socratic:
  - { trigger: "task:borrow:failed", question: { en: "Which function fails? For `count_char`, are you comparing characters or bytes - and does the closure receive a `char` or a `&char`?", de: "Welche Funktion scheitert? Vergleichst du bei `count_char` Zeichen oder Bytes - und bekommt der Closure ein `char` oder ein `&char`?" }, hints: [ { en: "`s.chars()` yields `char` values; a `filter` closure then receives `&char`, so compare with `*c == needle`.", de: "`s.chars()` liefert `char`-Werte; ein `filter`-Closure erhält dann `&char`, vergleiche also mit `*c == needle`." }, { en: "A plain loop is just as good: `for c in s.chars() { if c == needle { n += 1; } }`.", de: "Eine gewöhnliche Schleife tut es genauso: `for c in s.chars() { if c == needle { n += 1; } }`." }, { en: "`calculate_length` needs one method call; the reference gives you read access to everything a `String` can tell you.", de: "`calculate_length` braucht einen Methodenaufruf; die Referenz gibt dir Lesezugriff auf alles, was ein `String` mitteilen kann." } ] }
misconceptions:
  - { pattern: "error\\[E0596\\]: cannot borrow", question: { en: "You are trying to change something through a shared reference. Should this function be allowed to change the caller's value at all - and if so, what has to change in the signature?", de: "Du versuchst, über eine geteilte Referenz etwas zu ändern. Soll diese Funktion den Wert des Aufrufers überhaupt ändern dürfen - und wenn ja, was muss sich an der Signatur ändern?" }, hints: [ { en: "`&T` grants read access only. Mutation needs `&mut T`, on the parameter and at the call site.", de: "`&T` gewährt nur Lesezugriff. Veränderung braucht `&mut T`, am Parameter und an der Aufrufstelle." }, { en: "None of this step's three functions is meant to change anything: if you reach for mutation here, re-read what the function should return.", de: "Keine der drei Funktionen dieses Steps soll etwas ändern: greifst du hier zur Veränderung, lies erneut, was die Funktion liefern soll." }, { en: "Building a new value and returning it is usually better than mutating through a reference.", de: "Einen neuen Wert zu bauen und zurückzugeben ist meist besser, als über eine Referenz zu verändern." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Pass a value to a function without giving it away, and know exactly what the borrow allows.

## The problem borrowing solves

Last module's `length_and_back` had to return the string alongside the length, purely so the caller could keep using it. A reference removes that:

```rust
let s1 = String::from("hello");
let len = calculate_length(&s1);
println!("The length of '{s1}' is {len}.");
```

`&s1` creates a *reference*: a value that points at `s1` without owning it. `s1` is untouched and usable afterwards. The parameter is written the same way:

```rust
pub fn calculate_length(s: &String) -> usize {
    s.len()
}
```

Creating a reference is called *borrowing*. When the reference gös out of scope, nothing is dropped - the reference never owned anything.

## A borrow is read-only

`&T` grants read access and nothing else. `snippets/m2_01_mutate_through_shared_ref.rs` tries to break that:

```rust
fn change(some_string: &String) {
    some_string.push_str(", world");
}
```

Predict the result before you compile it. The answer is:

```text
error[E0596]: cannot borrow `*some_string` as mutable, as it is behind a `&` reference
```

Note *which* line is underlined: the `push_str` inside `change`, not the call. The contract was broken where it was violated, not where it was signed.

## `&str` is the better parameter

`calculate_length` takes `&String` because that is Listing 4-5 of the book, and it is kept here to be compared against the next function:

```rust
pub fn count_char(haystack: &str, needle: char) -> usize
```

`&str` accepts a string literal, a `&String` (Rust converts automatically) and a slice of either. `&String` accepts only the first of those. Any function that just reads text should take `&str`; clippy will tell you so, and in the workspace `calculate_length` carries an `#[allow]` with that explanation.

The default is deliberately shared and read-only, which is why the rest of this module is about the one thing that follows from it: what happens when someone does need to write.

## Your task

Predict the snippet's error, then implement `calculate_length`, `count_char` and `same_length`. `count_char` counts characters, so iterate with `chars()`, not over bytes. The next step lends out a value that may be changed.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_01_mutate_through_shared_ref.rs
cargo test --test m2-01-shared-references
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** a compiler diagnostic and nothing else - this file is *meant* not to compile, so the error is the expected result, not your mistake.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
