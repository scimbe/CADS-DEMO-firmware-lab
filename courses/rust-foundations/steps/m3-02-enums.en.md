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
    title: "You can argue enum against struct"
    check: { type: "question", prompt: { en: "Model Command as a struct instead: one kind field plus x, y, text and three colour components, all optional. Name two concrete defects of that design that the enum does not have, and one situation in which the struct would nevertheless be the better choice.", de: "Modelliere Command stattdessen als Struktur: ein Feld kind plus x, y, text und drei Farbkomponenten, alle optional. Nenne zwei konkrete Maengel dieses Entwurfs, die das Enum nicht hat, und eine Situation, in der die Struktur dennoch die bessere Wahl waere." }, rubric: "Names at least two of: invalid states are representable (kind=Quit with a text set, or kind=Move with no coordinates), every consumer must handle None for fields that are always present for its variant, memory is wasted on fields unused by most variants, and the compiler cannot check exhaustiveness. The 'nevertheless' half should name a case where all variants really do share the same fields, or where a fixed record maps onto an external format or database row.", bloom: "evaluate", minChars: 80 }
socratic:
  - { trigger: "task:enums:failed", question: { en: "Which constructor fails? For `make_write`, what type does the variant hold, and what type is the parameter?", de: "Welcher Konstruktor scheitert? Welchen Typ haelt die Variante bei `make_write`, und welchen Typ hat der Parameter?" }, hints: [ { en: "`Command::Write` holds a `String`; the parameter is a `&str`, so it needs `String::from(text)` or `text.to_string()`.", de: "`Command::Write` haelt einen `String`; der Parameter ist ein `&str`, es braucht also `String::from(text)` oder `text.to_string()`." }, { en: "A variant with named fields is built like a struct literal: `Command::Move { x, y }`.", de: "Eine Variante mit benannten Feldern wird wie ein Struct-Literal gebaut: `Command::Move { x, y }`." }, { en: "`s.chars().next()` already returns exactly the `Option<char>` that `first_char` promises.", de: "`s.chars().next()` liefert bereits genau das `Option<char>`, das `first_char` verspricht." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Which side is an Option and which is a bare value? Wrapping and unwrapping are explicit in Rust.", de: "Welche Seite ist ein Option und welche ein blanker Wert? Ein- und Auspacken sind in Rust ausdruecklich." }, hints: [ { en: "A function returning `Option<i32>` must return `Some(v)` or `None`, never a plain `v`.", de: "Eine Funktion mit Rueckgabetyp `Option<i32>` muss `Some(v)` oder `None` liefern, nie ein blankes `v`." }, { en: "There is no implicit null: `None` is a value of the same enum, not the absence of one.", de: "Es gibt kein implizites Null: `None` ist ein Wert desselben Enums, nicht das Fehlen eines Werts." }, { en: "`String::from(text)` converts a `&str` into the owned `String` a variant may require.", de: "`String::from(text)` wandelt ein `&str` in den besitzenden `String`, den eine Variante verlangen kann." } ] }
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

Implement the four functions, then argue the enum against the struct-with-a-kind-field design.
