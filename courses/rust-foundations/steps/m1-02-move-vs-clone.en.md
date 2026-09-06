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
    check: { type: "question", prompt: { en: "A reviewer calls the clone in duplicate wasteful. Two sentences: one caller for whom they are right, and why the test still forbids removing it.", de: "Ein Reviewer nennt den clone in duplicate verschwenderisch. Zwei Sätze: ein Aufrufer, für den er recht hat, und warum der Test das Entfernen dennoch verbietet." }, rubric: "First sentence names a caller for whom the copy is waste - one that only reads both results, one that discards the second, or one holding a very large string where the byte copy dominates. Second sentence: the test mutates the first result and asserts the second is unchanged, which needs two independent buffers, and only clone produces those. Does not pass: reciting the cost of clone without naming a caller, or claiming the clone can be removed as the code stands.", bloom: "analyze", minChars: 50 }
socratic:
  - { trigger: "task:cost:failed", question: { en: "Name a caller first, then argue. For which caller would a second buffer never be written to?", de: "Nenne zuerst einen Aufrufer, dann argumentiere. Bei welchem Aufrufer würde in einen zweiten Puffer nie geschrieben?" }, hints: [ { en: "A caller that only prints both results never writes to either one.", de: "Ein Aufrufer, der beide Ergebnisse nur ausgibt, schreibt in keines von beiden." }, { en: "The test is the counter-argument: look at which of the two returned values it changes, and what it then asserts about the other.", de: "Der Test ist das Gegenargument: sieh, welchen der beiden zurückgegebenen Werte er ändert und was er danach über den anderen zusichert." }, { en: "Two names for one buffer is the one arrangement the ownership rules forbid, whatever the caller does with them.", de: "Zwei Namen für einen Puffer ist die eine Anordnung, die die Ownership-Regeln verbieten, unabhängig davon, was der Aufrufer damit tut." } ] }
  - { trigger: "task:clone:failed", question: { en: "Which of the four is failing? If it is `with_suffix`, look at the parameter: can you call a mutating method on a binding that is not `mut`?", de: "Welche der vier scheitert? Ist es `with_suffix`, sieh dir den Parameter an: kannst du eine verändernde Methode auf einer Bindung aufrufen, die nicht `mut` ist?" }, hints: [ { en: "A by-value parameter may be declared `mut`: `pub fn with_suffix(mut s: String, …)`. That mutability belongs to the function's own copy of the binding, and it changes nothing for the caller.", de: "Ein Wert-Parameter darf `mut` deklariert werden: `pub fn with_suffix(mut s: String, …)`. Diese Veränderlichkeit gehört der eigenen Bindung der Funktion und ändert für den Aufrufer nichts." }, { en: "`duplicate` must produce two buffers; compute the clone first, then return the tuple, so the move of `s` happens last.", de: "`duplicate` muss zwei Puffer erzeugen; berechne zuerst den Klon und liefere dann das Tupel, damit der Move von `s` zuletzt passiert." }, { en: "In `length_and_back`, read the length before you move the string into the tuple - afterwards `s` is gone.", de: "Lies in `length_and_back` die Länge, bevor du die Zeichenkette in das Tupel verschiebst - danach ist `s` weg." } ] }
misconceptions:
  - { pattern: "error\\[E0382\\]: borrow of moved value", question: { en: "The compiler says a value was moved. Which line moved it, and does the code after that line still need the old owner - or would the new one do?", de: "Der Compiler sagt, ein Wert wurde verschoben. Welche Zeile hat ihn verschoben, und braucht der Code danach wirklich noch den alten Eigentümer - oder täte es auch der neue?" }, hints: [ { en: "The diagnostic marks three places: where the value was created, `value moved here`, and `value borrowed here after move`. Read them in that order.", de: "Die Diagnose markiert drei Stellen: wo der Wert entstand, `value moved here` und `value borrowed here after move`. Lies sie in dieser Reihenfolge." }, { en: "Assigning a `String` to a second name, or passing it to a function by value, moves it; the old name is unusable afterwards.", de: "Ein `String` an einen zweiten Namen zu binden oder ihn per Wert an eine Funktion zu übergeben verschiebt ihn; der alte Name ist danach unbrauchbar." }, { en: "`clone()` is the honest fix only when you genuinely need two independent values; if you only need to read, a reference is what you want - and that is the next module.", de: "`clone()` ist nur dann die ehrliche Lösung, wenn du wirklich zwei unabhängige Werte brauchst; willst du nur lesen, ist eine Referenz das Richtige - und die kommt im nächsten Modul." } ] }
  - { pattern: "error\\[E0596\\]: cannot borrow `\\w+` as mutable", question: { en: "You are calling a method that changes the value, on a binding that was not declared mutable. Whose binding is it - yours, or the caller's?", de: "Du rufst eine verändernde Methode auf einer Bindung auf, die nicht als veränderlich deklariert wurde. Wessen Bindung ist das - deine oder die des Aufrufers?" }, hints: [ { en: "For a by-value parameter the binding is yours: write `mut s: String` in the signature.", de: "Bei einem Wert-Parameter gehört die Bindung dir: schreibe `mut s: String` in die Signatur." }, { en: "`mut` on a parameter is not part of the function's type; callers neither see nor care about it.", de: "`mut` an einem Parameter gehört nicht zum Typ der Funktion; Aufrufer sehen es nicht und es stört sie nicht." }, { en: "The alternative is not to mutate at all: `format!(\"{s}{suffix}\")` builds a new String instead.", de: "Die Alternative ist, gar nicht zu verändern: `format!(\"{s}{suffix}\")` baut stattdessen einen neuen String." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
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

The test that pins this down is `duplicates_are_independent`. Read it before you answer the question below: what it does to the first result, and what it then demands of the second, is the whole of that question's second half.

## What clone actually costs

An allocation plus a byte copy, linear in the length. For a five-character string in a test that is nothing. In a loop over a large document it is the difference between a program that is fast and one that is not - and the reason `clone()` is a deliberate call in Rust rather than something that happens silently.

The trap is using `clone()` as a reflex to silence E0382. Ask first: do I need two values, or do I only need to *look* at one? If it is the second, the answer is a reference, and that is the next module. Cloning to avoid learning borrowing produces code that works and that a reviewer will send back.

## Your task

Implement `duplicate`, `length_and_back` and `with_suffix`, run this step's tests from the block below, and then answer why the independence test rules out a clone-free solution.

## Running it

::: do palette="> Terminal: Create New Terminal"
Open a terminal: press **F1**, type the entry with its leading `>`, press Enter. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.
> expect: The panel opens at the bottom on its **Terminal** tab, and the prompt ends in `~/workspace`.
> recover: If the palette says *No matching results*, the `>` is missing and it is searching for a file of that name - type it in front and repeat. The menu does the same: **Terminal → New Terminal**.
:::

The terminal starts in `~/workspace`, the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate once per terminal:

```bash
cd ~/workspace/rust-foundations
```

::: do command="cargo test --test m1-02-move-vs-clone" cwd="."
Run this step's tests. The same command sits behind the **Check** button on the *All four functions pass* task.
> expect: One line per test, `test … ok` or `… FAILED`, then the summary `test result: ok. 4 passed; 0 failed` once all 4 pass. The first run takes a few seconds while the crate compiles once; every run after that stays well under a second.
> recover: If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - do it now. If it says `no test target named`, the name after `--test` is wrong; `ls tests/` lists the valid ones.
:::

![A terminal in the bottom panel: the prompt reads coder@…:~/workspace/rust-foundations, with the cargo command and its output below it.](terminal-run-a-step.png)

The **Check** button on the task runs the same command and shows the same output in the tutor panel; it always uses the right folder, so it never needs the `cd`. The terminal is there so you can see it yourself and repeat it. The output appears on the **Terminal** tab, not in **Problems** and not in **Output** - those two show other things and are the usual reason for "nothing happens".
