---
id: m3-02-enums
title: "Enums: one of several shapes"
bloom: understand
objectives: [ "rust-ch06-01-defining-an-enum" ]
requires: [ "m3-01-structs" ]
estimatedMinutes: 20
scaffold: faded
recallFrom: [ "m3-01-structs" ]
links:
  - { step: "m3-03-match" }
  - { file: "src/m3/m3_02_enums.rs" }
  - { file: "tests/m3-02-enums.rs" }
  - { url: "https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html", title: "The Book, 6.1: Defining an Enum" }
sources: [ "src/m3/m3_02_enums.rs", "tests/m3-02-enums.rs" ]
tasks:
  - id: enums
    title: "The four constructors pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-02-enums", expectPass: [ "m3_02_enums::make_move_carries_both_coordinates", "m3_02_enums::make_write_owns_its_text", "m3_02_enums::first_char_is_optional", "m3_02_enums::safe_div_never_panics" ], minPass: 4, timeoutMs: 180000 }
  - id: vs-struct
    title: "You can argü enum against struct"
    check: { type: "question", prompt: { en: "Model Command as a struct instead: one kind field plus x, y, text and three colour components, all optional. Name two concrete defects of that design that the enum does not have, and one situation in which the struct would nevertheless be the better choice.", de: "Modelliere Command stattdessen als Struktur: ein Feld kind plus x, y, text und drei Farbkomponenten, alle optional. Nenne zwei konkrete Mängel dieses Entwurfs, die das Enum nicht hat, und eine Situation, in der die Struktur dennoch die bessere Wahl wäre." }, rubric: "Two defects, each one a consequence a reader or a caller would feel: invalid states become representable (a Quit carrying text, a Move with no coordinates), every consumer must handle a None that cannot legitimately occur, memory is spent on fields most variants never use, or the compiler can no longer check that every case is handled. The third part names a case where the struct wins - all variants genuinely share the same fields, or the record maps onto an external format or a database row. Does not pass: two restatements of the same defect in different words, or a third part that only repeats that the enum is better.", bloom: "evaluate", minChars: 80 }
socratic:
  - { trigger: "task:vs-struct:failed", question: { en: "Write the struct version out with its optional fields. Which combinations does it allow that no command should have?", de: "Schreibe die Struktur-Fassung mit ihren optionalen Feldern aus. Welche Kombinationen erlaubt sie, die kein Kommando haben sollte?" }, hints: [ { en: "Set kind to Quit and fill in the text and the coordinates anyway. Nothing stops you - that is the first defect.", de: "Setze kind auf Quit und fülle Text und Koordinaten trotzdem aus. Nichts hindert dich - das ist der erste Mangel." }, { en: "Now write the reader: for a Move you know x exists, but the field is an Option, so ask what that forces every reader to write.", de: "Schreibe nun den Leser: bei einem Move weißt du, dass x existiert, aber das Feld ist ein Option - frage, was das jeden Leser zu schreiben zwingt." }, { en: "For the third part, think of data where every case really does carry the same fields; a fixed-layout record from a file or a table row is the usual example.", de: "Denke beim dritten Teil an Daten, bei denen wirklich jeder Fall dieselben Felder trägt; ein Datensatz mit festem Aufbau aus einer Datei oder eine Tabellenzeile ist das übliche Beispiel." } ] }
  - { trigger: "task:enums:failed", question: { en: "Which constructor fails? For `make_write`, what type does the variant hold, and what type is the parameter?", de: "Welcher Konstruktor scheitert? Welchen Typ hält die Variante bei `make_write`, und welchen Typ hat der Parameter?" }, hints: [ { en: "`Command::Write` holds a `String`; the parameter is a `&str`, so it needs `String::from(text)` or `text.to_string()`.", de: "`Command::Write` hält einen `String`; der Parameter ist ein `&str`, es braucht also `String::from(text)` oder `text.to_string()`." }, { en: "A variant with named fields is built like a struct literal: `Command::Move { x, y }`.", de: "Eine Variante mit benannten Feldern wird wie ein Struct-Literal gebaut: `Command::Move { x, y }`." }, { en: "`s.chars().next()` already returns exactly the `Option<char>` that `first_char` promises.", de: "`s.chars().next()` liefert bereits genau das `Option<char>`, das `first_char` verspricht." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Which side is an Option and which is a bare value? Wrapping and unwrapping are explicit in Rust.", de: "Welche Seite ist ein Option und welche ein blanker Wert? Ein- und Auspacken sind in Rust ausdrücklich." }, hints: [ { en: "A function returning `Option<i32>` must return `Some(v)` or `None`, never a plain `v`.", de: "Eine Funktion mit Rückgabetyp `Option<i32>` muss `Some(v)` oder `None` liefern, nie ein blankes `v`." }, { en: "There is no implicit null: `None` is a value of the same enum, not the absence of one.", de: "Es gibt kein implizites Null: `None` ist ein Wert desselben Enums, nicht das Fehlen eines Werts." }, { en: "`String::from(text)` converts a `&str` into the owned `String` a variant may require.", de: "`String::from(text)` wandelt ein `&str` in den besitzenden `String`, den eine Variante verlangen kann." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Decide when a set of alternatives is the right model, and build values of an enum whose variants carry different data.

## The idea

A struct says *and*: a rectangle has a width **and** a height. An enum says *or*: a command is a quit **or** a move **or** a write. The two compose, and choosing the wrong one is one of the more expensive design mistakes in a codebase.

Each variant may carry its own data, in its own shape:

```rust
pub enum Command {
    Quit,                                // no data
    Move { x: i32, y: i32 },             // named fields, like a struct
    Write(String),                       // one unnamed field
    ChangeColor(i32, i32, i32),          // three unnamed fields
}
```

This is Listing 6-2 of the book. Its argument is worth restating: modelling the same thing as four separate structs would lose the common type - you could not put them in one `Vec` or write one function that takes any of them. Modelling it as one struct with a `kind` field and six optional fields keeps the common type but makes invalid states representable: nothing stops a `Quit` from carrying text, and every reader has to handle a `None` in `x` that can never legitimately occur.

## Option is not special

```rust
enum Option<T> {
    None,
    Some(T),
}
```

That is the whole definition, from the standard library, and it is in scope everywhere without an import. There is no null in Rust; a value that may be absent has type `Option<T>`, and the type system then forces every reader to say what happens when it is absent. A `String` is a string. An `Option<String>` may be nothing. The two are different types and cannot be confused.

`first_char` and `safe_div` both return one. `safe_div` is the interesting one: division by zero is a real possibility, and returning `None` hands the decision to the caller instead of panicking inside a function that cannot know what the right answer is.

## Building values

`Command::Move { x, y }` uses the field init shorthand from the last step. `Command::Write(String::from(text))` converts, because the variant owns its text while the parameter only borrows it. `s.chars().next()` already has the type `first_char` promises.

Notice what you cannot do yet: read the data back out. That needs `match`, which is the next step, and it is deliberately separated - constructing and destructuring are different skills, and mixing them is why enums feel hard at first.

## Your task

Implement the four functions, then argü the enum against the struct-with-a-kind-field design.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo test --test m3-02-enums
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 4 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
