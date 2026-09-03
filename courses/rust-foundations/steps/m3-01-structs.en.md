---
id: m3-01-structs
title: "Structs: values that belong together"
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
    title: "All six struct functions pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-01-structs", expectPass: [ "m3_01_structs::new_rectangle_sets_both_fields", "m3_01_structs::area_multiplies_and_borrows", "m3_01_structs::square_has_equal_sides", "m3_01_structs::widened_changes_only_the_width", "m3_01_structs::enrol_starts_active", "m3_01_structs::deactivate_changes_only_active" ], minPass: 6, timeoutMs: 180000 }
  - id: update-syntax
    title: "You can explain why ..s consumes and ..*r does not"
    check: { type: "question", prompt: { en: "deactivate uses `..s` on a Student taken by value and consumes it, while widened uses `..*r` on a &Rectangle and leaves the caller's rectangle intact. Explain the difference in terms of the field types, and say what error you would get if Student's remaining fields were copied out of a shared reference.", de: "deactivate nutzt `..s` an einem per Wert genommenen Student und verbraucht ihn, während widened `..*r` an einem &Rectangle nutzt und das Rechteck des Aufrufers unangetastet lässt. Erkläre den Unterschied über die Feldtypen und nenne den Fehler, den du erhieltest, wenn Students restliche Felder aus einer geteilten Referenz kopiert würden." }, rubric: "States that struct update syntax moves the remaining fields, that u32/bool are Copy so ..*r copies them and the borrow ends, and that Student's String field is not Copy so it must be moved out of an owned value; taking it out of a &Student would be error E0507, cannot move out of a shared reference.", bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:structs:failed", question: { en: "Which function fails? For `widened`, is the height in your result the original one, or has it been scaled too?", de: "Welche Funktion scheitert? Ist bei `widened` die Höhe im Ergebnis die ursprüngliche, oder wurde sie mitskaliert?" }, hints: [ { en: "`widened` changes only `width`; `..*r` supplies the rest, so `height` must not appear in the literal.", de: "`widened` ändert nur `width`; `..*r` liefert den Rest, `height` darf also nicht im Literal stehen." }, { en: "In `new_rectangle` and `enrol` the parameters already carry the field names, so the shorthand `Rectangle { width, height }` applies.", de: "In `new_rectangle` und `enrol` tragen die Parameter bereits die Feldnamen, die Kurzform `Rectangle { width, height }` gilt also." }, { en: "`area` takes `&Rectangle`; read the fields through the reference, no dereference operator needed.", de: "`area` nimmt `&Rectangle`; lies die Felder über die Referenz, ein Dereferenzierungsoperator ist nicht nötig." } ] }
misconceptions:
  - { pattern: "error\\[E0507\\]: cannot move out of", question: { en: "You are taking an owned field out of something you only borrowed. Does the function need to own that field, or would a clone or a reference do?", de: "Du entnimmst ein besitzendes Feld aus etwas, das du nur geliehen hast. Muss die Funktion dieses Feld besitzen, oder täte es ein Klon oder eine Referenz?" }, hints: [ { en: "Struct update syntax moves every field it fills in; `..*r` on a reference only works when those fields are `Copy`.", de: "Die Struct-Update-Syntax verschiebt jedes Feld, das sie füllt; `..*r` an einer Referenz geht nur, wenn diese Felder `Copy` sind." }, { en: "Change the parameter to take the struct by value if the function is meant to consume it.", de: "Nimm die Struktur per Wert, wenn die Funktion sie verbrauchen soll." }, { en: "`.clone()` on the single field is the local fix when the caller must keep its value.", de: "`.clone()` auf dem einzelnen Feld ist die lokale Lösung, wenn der Aufrufer seinen Wert behalten muss." } ] }
  - { pattern: "error\\[E0063\\]: missing field", question: { en: "A struct literal is incomplete. Which field did you leave out, and did you mean to supply it from another instance?", de: "Ein Struct-Literal ist unvollständig. Welches Feld fehlt, und wolltest du es aus einer anderen Instanz übernehmen?" }, hints: [ { en: "Every field must be given a value; there are no defaults unless you implement `Default`.", de: "Jedes Feld braucht einen Wert; Vorgaben gibt es nur, wenn du `Default` implementierst." }, { en: "`..other` at the end of the literal fills in every field you did not name.", de: "`..other` am Ende des Literals füllt jedes nicht genannte Feld." }, { en: "The `..` entry must come last and needs no trailing comma.", de: "Der `..`-Eintrag muss zuletzt stehen und braucht kein nachgestelltes Komma." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Define a struct, instantiate it three different ways, and predict which of those ways consumes the value it copies from.

## Why a struct rather than a tuple

`(30, 50)` and `Rectangle { width: 30, height: 50 }` hold the same two numbers. The difference is that the second one cannot be got backwards. A function taking a tuple has to document which element is which and trust the caller; a function taking a `Rectangle` cannot be called wrongly in that way at all. Chapter 5.1 makes the same argument by refactoring an `area` function through both forms.

## Defining and instantiating

```rust
#[derive(Debug, Clone, PartialEq)]
pub struct Rectangle {
    pub width: u32,
    pub height: u32,
}
```

`derive` generates trait implementations mechanically: `Debug` enables `{:?}` printing, `Clone` gives you `.clone()`, `PartialEq` gives you `==`. The tests need all three. `pub` on the struct and on each field controls visibility separately - a field without `pub` would be invisible to the test.

Instantiating names every field. There are no defaults; leave one out and you get `error[E0063]: missing field`.

## Field init shorthand

When a variable already has the field's name, write it once:

```rust
pub fn new_rectangle(width: u32, height: u32) -> Rectangle {
    Rectangle { width, height }
}
```

Not a special case for constructors - it works anywhere the names line up.

## Struct update syntax, and its ownership catch

`..other` fills in every field you did not name, and it must come last:

```rust
pub fn widened(r: &Rectangle, factor: u32) -> Rectangle {
    Rectangle { width: r.width * factor, ..*r }
}
```

This is the part worth slowing down for. `..` **moves** the fields it takes. Here both remaining fields are `u32`, which is `Copy`, so nothing is moved out of `*r` and the caller's rectangle is untouched.

Compare with `Student`, which owns a `String`:

```rust
pub fn deactivate(s: Student) -> Student {
    Student { active: false, ..s }
}
```

`name` is a `String` and is genuinely moved out of `s`, so `s` is consumed - which is why the parameter is by value. Writing this against a `&Student` would be `error[E0507]: cannot move out of a shared reference`, and the fix would be either taking ownership or cloning that one field. The M1 distinction between `Copy` and non-`Copy` is doing all the work here.

## Your task

Implement the six functions and then explain the difference between `..s` and `..*r`. Next: enums, for data that is one of several shapes rather than all of several fields.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo test --test m3-01-structs
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 6 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
