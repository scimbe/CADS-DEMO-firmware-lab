---
id: m6-01-generics
title: "Generics: one function, many types"
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
    title: "The generic functions and structs pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-01-generics", expectPass: [ "m6_01_generics::largest_works_for_numbers_and_chars", "m6_01_generics::largest_returns_a_reference_into_the_slice", "m6_01_generics::swap_exchanges_both_values", "m6_01_generics::first_of_clones", "m6_01_generics::label_mixes_two_type_parameters" ], minPass: 5, timeoutMs: 180000 }
  - id: bounds-why
    title: "You can explain why largest needs a bound"
    check: { type: "question", prompt: { en: "swap<T> needs no trait bound at all, while largest<T> needs T: PartialOrd. Explain what the compiler knows about an unbounded T, and why returning &T rather than T in largest avoids a second bound.", de: "swap<T> braucht gar keine Trait-Schranke, largest<T> aber T: PartialOrd. Erkläre, was der Compiler über ein ungebundenes T weiß, und warum die Rückgabe von &T statt T in largest eine zweite Schranke erspart." }, rubric: "States that an unbounded T supports only what every type supports - being moved and dropped - which is enough for swap because it only moves values around, while largest compares with > and comparison is exactly what PartialOrd provides. The second half should note that returning an owned T would require copying or cloning the element out of the slice, hence Copy or Clone, whereas returning a reference borrows it and needs nothing. Does not pass: saying an unbounded T can do nothing at all, or explaining the &T return purely as a performance choice rather than as the bound it avoids.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:bounds-why:failed", question: { en: "Read each body and list the operations it performs on a value of type T.", de: "Lies jeden Rumpf und liste die Operationen auf, die er an einem Wert vom Typ T ausführt." }, hints: [ { en: "`swap` moves two values into a new struct. Ask which types can be moved - the answer is all of them.", de: "`swap` verschiebt zwei Werte in eine neue Struktur. Frage, welche Typen verschoben werden können - die Antwort ist: alle." }, { en: "`largest` uses `>`. Comparison is not something every type offers, so it must be requested by name.", de: "`largest` nutzt `>`. Vergleichen bietet nicht jeder Typ, es muss also namentlich verlangt werden." }, { en: "Then ask what returning T rather than &T would additionally require of the caller's slice, and which two traits could supply it.", de: "Frage dann, was die Rückgabe von T statt &T zusätzlich vom Slice des Aufrufers verlangte und welche zwei Traits das liefern könnten." } ] }
  - { trigger: "task:generics:failed", question: { en: "Which one fails? For `largest`, are you comparing the items themselves or the references to them - and does the result borrow from the slice?", de: "Welche scheitert? Vergleichst du in `largest` die Elemente selbst oder die Referenzen darauf - und leiht das Ergebnis aus dem Slice?" }, hints: [ { en: "Start with `let mut largest = &list[0];` and compare `item > largest`; both sides are then `&T` and `PartialOrd` applies through the reference.", de: "Beginne mit `let mut largest = &list[0];` und vergleiche `item > largest`; beide Seiten sind dann `&T`, und `PartialOrd` gilt durch die Referenz hindurch." }, { en: "`first_of` has a `Clone` bound because it hands back an owned value: `list.first().cloned()`.", de: "`first_of` hat eine `Clone`-Schranke, weil es einen besitzenden Wert zurückgibt: `list.first().cloned()`." }, { en: "`label` has two independent parameters; the function body just builds the struct from them.", de: "`label` hat zwei unabhängige Parameter; der Rumpf baut daraus lediglich die Struktur." } ] }
misconceptions:
  - { pattern: "error\\[E0369\\]: binary operation `>` cannot be applied to type", question: { en: "You compared two values of a generic type with no bound. Which trait provides comparison, and where does it belong in the signature?", de: "Du hast zwei Werte eines generischen Typs ohne Schranke verglichen. Welches Trait liefert den Vergleich, und wohin gehört es in der Signatur?" }, hints: [ { en: "`T: PartialOrd` after the type parameter is what makes `<` and `>` legal in the body.", de: "`T: PartialOrd` hinter dem Typparameter macht `<` und `>` im Rumpf zulässig." }, { en: "The diagnostic usually suggests the exact bound to add - check it against what the body actually needs.", de: "Die Diagnose schlägt meist genau die fehlende Schranke vor - prüfe sie an dem, was der Rumpf wirklich braucht." }, { en: "A generic parameter with no bound supports only moving and dropping; every operation has to be justified by a bound.", de: "Ein generischer Parameter ohne Schranke unterstützt nur Verschieben und Aufräumen; jede Operation muss durch eine Schranke begründet sein." } ] }
  - { pattern: "error\\[E0507\\]: cannot move out of", question: { en: "You tried to take an owned value out of a slice you only borrowed. Does the caller keep its data - and if so, is a reference or a clone the right answer?", de: "Du wolltest einen besitzenden Wert aus einem nur geliehenen Slice nehmen. Behält der Aufrufer seine Daten - und ist dann eine Referenz oder ein Klon die richtige Antwort?" }, hints: [ { en: "`largest` returns `&T`, so nothing needs to be moved out at all.", de: "`largest` liefert `&T`, es muss also gar nichts herausbewegt werden." }, { en: "`first_of` really does hand back a value, which is why it carries the `Clone` bound and uses `.cloned()`.", de: "`first_of` gibt tatsächlich einen Wert heraus, deshalb trägt es die `Clone`-Schranke und nutzt `.cloned()`." }, { en: "Indexing a slice of a non-Copy type gives a place, not a value; `&list[0]` borrows it instead.", de: "Ein Slice eines Nicht-Copy-Typs zu indizieren liefert einen Ort, keinen Wert; `&list[0]` leiht ihn stattdessen." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Read and write a generic signature, and say what the compiler is allowed to assume about a type parameter.

## The duplication generics remove

Two functions that find the largest element - one for `i32`, one for `char` - differ only in a type name. Chapter 10.1 walks that refactor; the result is:

```rust
pub fn largest<T: PartialOrd>(list: &[T]) -> &T
```

`<T>` after the name declares the parameter. It is a placeholder filled in at each call site, and the compiler generates a specialised copy of the function per concrete type - *monomorphisation*. There is no runtime cost and no dynamic dispatch; the generic version is exactly as fast as the two hand-written ones.

## What an unbounded T can do

Less than you might expect. Read the two bodies below and work out which operations each one actually performs on a `T` - that is what this step's question asks for:

```rust
pub fn swap<T>(p: Pair<T>) -> Pair<T> {
    Pair { first: p.second, second: p.first }
}
```

It only moves values from one field to another, and moving works for any type.

`largest` compares, and comparison is not universal, so it must ask:

```text
error[E0369]: binary operation `>` cannot be applied to type `&T`
```

`T: PartialOrd` is the answer. Read a bound as a promise the caller must keep and the body may rely on - nothing more and nothing less.

## Why `&T` and not `T`

Returning `T` would mean taking an element out of a slice the caller still owns. Try writing it that way and read what the compiler asks you to add. The test shows what the choice buys: `largest(&words)` works on a `Vec<String>`, which is neither `Copy` nor cheap to clone, and the vector still owns its strings afterwards.

`first_of` is the deliberate contrast: it hands back an owned value, so it carries `T: Clone` and uses `.cloned()`. Two functions, two contracts, and each bound is there because the body needs it.

## Generic structs

```rust
pub struct Pair<T> { pub first: T, pub second: T }
pub struct Labelled<L, V> { pub label: L, pub value: V }
```

One parameter means both fields have the *same* type; `Pair { first: 1, second: "x" }` does not compile. Two parameters let them differ, which is how `Option<T>`, `Result<T, E>` and `HashMap<K, V>` are declared. Use as many as you need and no more - every extra parameter is something the reader has to track.

## Your task

Implement the four items, then explain why `swap` needs no bound and `largest` does. The next step is about defining the behaviour a bound refers to.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo test --test m6-01-generics
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 5 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
