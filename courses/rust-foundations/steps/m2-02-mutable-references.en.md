---
id: m2-02-mutable-references
title: "Mutable references"
bloom: apply
objectives: [ "rust-ch04-02-references-and-borrowing" ]
requires: [ "m2-01-shared-references" ]
estimatedMinutes: 20
scaffold: faded
recallFrom: [ "m1-04-ownership-and-functions", "m1-03-copy-types" ]
links:
  - { step: "m2-03-aliasing-rule" }
  - { file: "src/m2/m2_02_mutable_refs.rs" }
  - { file: "tests/m2-02-mutable-references.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html", title: "The Book, 4.2: Mutable References" }
sources: [ "src/m2/m2_02_mutable_refs.rs", "tests/m2-02-mutable-references.rs" ]
tasks:
  - id: mutate
    title: "change, append_twice and swap_ends pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-02-mutable-references", expectPass: [ "m2_02_mutable_references::change_appends_world", "m2_02_mutable_references::append_twice_appends_twice", "m2_02_mutable_references::swap_ends_swaps", "m2_02_mutable_references::swap_ends_short_vectors" ], minPass: 4, timeoutMs: 180000 }
  - id: swap-why
    title: "You can explain why Vec::swap exists"
    check: { type: "question", prompt: { en: "Writing swap_ends with two &mut into the same vector is rejected with E0499. Explain why the standard library offers Vec::swap(i, j) taking two indices instead, and what that changes about who holds the mutable borrow.", de: "swap_ends mit zwei &mut in denselben Vektor zu schreiben wird mit E0499 abgelehnt. Erkläre, warum die Standardbibliothek stattdessen Vec::swap(i, j) mit zwei Indizes anbietet, und was das daran ändert, wer die veränderliche Leihe hält." }, rubric: "States that two simultaneous &mut to the same vector violate the exclusivity rule, and that swap takes indices so there is exactly one mutable borrow - the &mut self of the method - inside which the two elements are exchanged, keeping the exclusivity invariant while still doing the job. Credit for noting that copying through a temporary works too because i32 is Copy.", bloom: "analyze", minChars: 50 }
socratic:
  - { trigger: "task:mutate:failed", question: { en: "Is this a compile error or a failing assertion? If `swap_ends` will not compile, how many mutable borrows of the vector are alive at the same time in your version?", de: "Ist das ein Übersetzungsfehler oder eine fehlgeschlagene Zusicherung? Lässt sich `swap_ends` nicht übersetzen: wie viele veränderliche Leihen des Vektors leben in deiner Fassung gleichzeitig?" }, hints: [ { en: "`v.swap(0, last)` does the whole job with a single borrow.", de: "`v.swap(0, last)` erledigt alles mit einer einzigen Leihe." }, { en: "Compute `v.len() - 1` before you touch anything, and guard the case of fewer than two elements - `0 - 1` on a usize panics.", de: "Berechne `v.len() - 1` vor allem anderen und sichere den Fall von weniger als zwei Elementen ab - `0 - 1` auf einem usize stürzt ab." }, { en: "In `change` and `append_twice` you may call `push_str` directly on the `&mut String`; no dereference is needed.", de: "In `change` und `append_twice` darfst du `push_str` direkt auf dem `&mut String` aufrufen; ein Dereferenzieren ist nicht nötig." } ] }
misconceptions:
  - { pattern: "error\\[E0499\\]: cannot borrow `\\w+` as mutable more than once", question: { en: "Two mutable borrows of the same value are alive at once. Which two, and does the second one really need to exist while the first is still in use?", de: "Zwei veränderliche Leihen desselben Werts leben gleichzeitig. Welche zwei, und muss die zweite wirklich existieren, solange die erste noch benutzt wird?" }, hints: [ { en: "The diagnostic labels `first mutable borrow occurs here` and `second mutable borrow occurs here` - the fix is almost always to end the first one earlier.", de: "Die Diagnose beschriftet `first mutable borrow occurs here` und `second mutable borrow occurs here` - die Lösung ist fast immer, die erste früher enden zu lassen." }, { en: "A borrow ends after its last use, not at the closing brace, so moving the last use up can be enough.", de: "Eine Leihe endet nach ihrer letzten Verwendung, nicht an der schließenden Klammer; die letzte Verwendung nach oben zu ziehen kann genügen." }, { en: "For two elements of one collection, use the method that takes indices instead of two references.", de: "Für zwei Elemente einer Sammlung nutze die Methode, die Indizes nimmt, statt zweier Referenzen." } ] }
  - { pattern: "error\\[E0596\\]: cannot borrow", question: { en: "Something is being changed through a shared reference, or through a binding that is not `mut`. Which of the two is it here?", de: "Etwas wird über eine geteilte Referenz oder über eine nicht-`mut`-Bindung geändert. Welches von beidem ist es hier?" }, hints: [ { en: "A `&mut` may only be taken from a binding that is itself declared `mut`.", de: "Ein `&mut` darf nur von einer Bindung genommen werden, die selbst `mut` deklariert ist." }, { en: "The call site needs `&mut s`, not `&s` - the ampersand alone is the shared kind.", de: "Die Aufrufstelle braucht `&mut s`, nicht `&s` - das Kaufmanns-Und allein ist die geteilte Form." }, { en: "The parameter type has to say `&mut` too; both sides must agree.", de: "Auch der Parametertyp muss `&mut` lauten; beide Seiten müssen übereinstimmen." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Lend a value out for writing, and see the one restriction that comes with it.

## Three places the `mut` has to appear

```rust
let mut s = String::from("hello");
change(&mut s);

fn change(some_string: &mut String) {
    some_string.push_str(", world");
}
```

The binding must be `mut`, the call site must say `&mut s`, and the parameter type must be `&mut String`. Miss any one of them and you get E0596. This is verbose on purpose: at every call site you can see that this function may change your value.

Note that you call `push_str` directly on the reference. Rust dereferences automatically for method calls, so `(*some_string).push_str(...)` is never needed.

## The one restriction

If you have a mutable reference to a value, you may have no other reference to that value at the same time - mutable or shared. This code is rejected:

```rust
let r1 = &mut s;
let r2 = &mut s;
println!("{r1}, {r2}");
```

```text
error[E0499]: cannot borrow `s` as mutable more than once at a time
```

The benefit is stated plainly in ch. 4.2: data races cannot occur, because a data race needs two pointers to the same data with at least one of them writing. Rust does not detect the race at runtime; it refuses to compile the shape that permits one.

The restriction is narrower than it looks, because a borrow ends after its **last use**, not at the end of the block:

```rust
let r1 = &mut s;
r1.push_str(" world");   // last use of r1
let r2 = &mut s;         // fine: r1 is over
```

## The exercise

`change` and `append_twice` are direct: take the `&mut String`, call the method.

`swap_ends` is where the rule bites. The obvious idea - grab `&mut v[0]` and `&mut v[last]` and exchange them - is E0499. There are two honest ways out, and both are worth knowing:

- `v.swap(0, last)`: the standard library's method takes two *indices*, so the only mutable borrow is the `&mut self` of the call itself.
- Copy the two values through temporaries and write them back. `i32` is `Copy`, so reading `v[0]` produces an independent value and no borrow survives it - the M1 material paying off.

Guard the short cases: `v.len() - 1` on an empty vector underflows and panics, because `usize` cannot be negative.

## Your task

Implement the three functions and then explain why `Vec::swap` is shaped the way it is. The next step generalises the restriction into the aliasing rule.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo test --test m2-02-mutable-references
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 4 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
