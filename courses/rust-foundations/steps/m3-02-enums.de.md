---
id: m3-02-enums
title: "Enums: eine von mehreren Formen"
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
    title: "Die vier Konstruktoren bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-02-enums", expectPass: [ "m3_02_enums::make_move_carries_both_coordinates", "m3_02_enums::make_write_owns_its_text", "m3_02_enums::first_char_is_optional", "m3_02_enums::safe_div_never_panics" ], minPass: 4, timeoutMs: 180000 }
  - id: vs-struct
    title: "Du kannst Enum gegen Struct abwaegen"
    check: { type: "question", prompt: { en: "Model Command as a struct instead: one kind field plus x, y, text and three colour components, all optional. Name two concrete defects of that design that the enum does not have, and one situation in which the struct would nevertheless be the better choice.", de: "Modelliere Command stattdessen als Struktur: ein Feld kind plus x, y, text und drei Farbkomponenten, alle optional. Nenne zwei konkrete Maengel dieses Entwurfs, die das Enum nicht hat, und eine Situation, in der die Struktur dennoch die bessere Wahl waere." }, rubric: "Names at least two of: invalid states are representable (kind=Quit with a text set, or kind=Move with no coordinates), every consumer must handle None for fields that are always present for its variant, memory is wasted on fields unused by most variants, and the compiler cannot check exhaustiveness. The 'nevertheless' half should name a case where all variants really do share the same fields, or where a fixed record maps onto an external format or database row.", bloom: "evaluate", minChars: 80 }
socratic:
  - { trigger: "task:enums:failed", question: { en: "Which constructor fails? For `make_write`, what type does the variant hold, and what type is the parameter?", de: "Welcher Konstruktor scheitert? Welchen Typ haelt die Variante bei `make_write`, und welchen Typ hat der Parameter?" }, hints: [ { en: "`Command::Write` holds a `String`; the parameter is a `&str`, so it needs `String::from(text)` or `text.to_string()`.", de: "`Command::Write` haelt einen `String`; der Parameter ist ein `&str`, es braucht also `String::from(text)` oder `text.to_string()`." }, { en: "A variant with named fields is built like a struct literal: `Command::Move { x, y }`.", de: "Eine Variante mit benannten Feldern wird wie ein Struct-Literal gebaut: `Command::Move { x, y }`." }, { en: "`s.chars().next()` already returns exactly the `Option<char>` that `first_char` promises.", de: "`s.chars().next()` liefert bereits genau das `Option<char>`, das `first_char` verspricht." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Which side is an Option and which is a bare value? Wrapping and unwrapping are explicit in Rust.", de: "Welche Seite ist ein Option und welche ein blanker Wert? Ein- und Auspacken sind in Rust ausdruecklich." }, hints: [ { en: "A function returning `Option<i32>` must return `Some(v)` or `None`, never a plain `v`.", de: "Eine Funktion mit Rueckgabetyp `Option<i32>` muss `Some(v)` oder `None` liefern, nie ein blankes `v`." }, { en: "There is no implicit null: `None` is a value of the same enum, not the absence of one.", de: "Es gibt kein implizites Null: `None` ist ein Wert desselben Enums, nicht das Fehlen eines Werts." }, { en: "`String::from(text)` converts a `&str` into the owned `String` a variant may require.", de: "`String::from(text)` wandelt ein `&str` in den besitzenden `String`, den eine Variante verlangen kann." } ] }
---
## Lernziel

Entscheide, wann eine Menge von Alternativen das richtige Modell ist, und baue Werte eines Enums, dessen Varianten unterschiedliche Daten tragen.

## Die Idee

Eine Struktur sagt *und*: ein Rechteck hat eine Breite **und** eine Hoehe. Ein Enum sagt *oder*: ein Kommando ist ein Quit **oder** ein Move **oder** ein Write. Beide lassen sich kombinieren, und das falsche zu waehlen gehoert zu den teureren Entwurfsfehlern in einer Codebasis.

Jede Variante darf eigene Daten in eigener Form tragen:

```rust
pub enum Command {
    Quit,                                // keine Daten
    Move { x: i32, y: i32 },             // benannte Felder, wie eine Struktur
    Write(String),                       // ein unbenanntes Feld
    ChangeColor(i32, i32, i32),          // drei unbenannte Felder
}
```

Das ist Listing 6-2 des Buchs. Sein Argument lohnt die Wiederholung: dasselbe als vier getrennte Strukturen zu modellieren verloere den gemeinsamen Typ - du koenntest sie nicht in einen `Vec` legen und keine Funktion schreiben, die eine beliebige davon nimmt. Es als eine Struktur mit einem `kind`-Feld und sechs optionalen Feldern zu modellieren behaelt den gemeinsamen Typ, macht aber ungueltige Zustaende darstellbar: nichts hindert ein `Quit` daran, Text zu tragen, und jeder Leser muss ein `None` in `x` behandeln, das legitim nie vorkommen kann.

## Option ist nichts Besonderes

```rust
enum Option<T> {
    None,
    Some(T),
}
```

Das ist die vollstaendige Definition aus der Standardbibliothek, und sie ist ueberall ohne Import sichtbar. In Rust gibt es kein Null; ein moeglicherweise fehlender Wert hat den Typ `Option<T>`, und das Typsystem zwingt dann jeden Leser zu sagen, was bei Abwesenheit geschieht. Ein `String` ist eine Zeichenkette. Ein `Option<String>` kann nichts sein. Das sind verschiedene Typen und lassen sich nicht verwechseln.

`first_char` und `safe_div` liefern beide eines. `safe_div` ist der interessante Fall: Division durch null ist eine echte Moeglichkeit, und `None` zurueckzugeben uebergibt die Entscheidung dem Aufrufer, statt in einer Funktion abzustuerzen, die die richtige Antwort nicht kennen kann.

## Werte bauen

`Command::Move { x, y }` nutzt die Kurzform aus dem letzten Step. `Command::Write(String::from(text))` konvertiert, weil die Variante ihren Text besitzt, waehrend der Parameter ihn nur leiht. `s.chars().next()` hat bereits den Typ, den `first_char` verspricht.

Beachte, was du noch nicht kannst: die Daten wieder herauslesen. Dafuer braucht es `match`, den naechsten Step, und die Trennung ist Absicht - Konstruieren und Destrukturieren sind verschiedene Faehigkeiten, und sie zu vermischen ist der Grund, warum sich Enums zunaechst schwer anfuehlen.

## Deine Aufgabe

Implementiere die vier Funktionen und argumentiere dann das Enum gegen den Entwurf mit Struktur und kind-Feld.
