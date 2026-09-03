---
id: m4-02-strings
title: "Strings are UTF-8, and that changes things"
bloom: analyze
objectives: [ "rust-ch08-02-strings" ]
requires: [ "m4-01-vectors" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m4-01-vectors", "m2-03-aliasing-rule" ]
links:
  - { step: "m4-03-hash-maps" }
  - { file: "src/m4/m4_02_strings.rs" }
  - { file: "examples/m4_string_bytes.rs" }
  - { url: "https://doc.rust-lang.org/book/ch08-02-strings.html", title: "The Book, 8.2: Storing UTF-8 Encoded Text with Strings" }
sources: [ "src/m4/m4_02_strings.rs", "tests/m4-02-strings.rs", "examples/m4_string_bytes.rs", "snippets/m4_02_string_index.rs" ]
tasks:
  - id: guess
    title: "Predict the byte and character counts"
    check: { type: "predict", prompt: { en: "examples/m4_string_bytes.rs prints the byte length and the character count of \"hello\", \"Zdravstvuyte\" written in Cyrillic, and a Devanagari greeting, then slices the first four bytes of the Cyrillic string. Write down all the numbers and what that four-byte slice prints.", de: "examples/m4_string_bytes.rs gibt Bytelaenge und Zeichenzahl von \"hello\", eines kyrillisch geschriebenen Grusses und eines Devanagari-Grusses aus und schneidet dann die ersten vier Bytes des kyrillischen Strings heraus. Notiere alle Zahlen und was dieser Vier-Byte-Slice ausgibt." }, then: { type: "command", command: "cargo run --quiet --example m4_string_bytes", seedMustFail: false, expectExitCode: 0, expectStdout: "24 bytes, 12 chars", timeoutMs: 120000 }, rubric: "The prediction has 5/5 for hello, 24 bytes and 12 chars for the Cyrillic string (two bytes per letter), and 18 bytes for the Devanagari one against a smaller character count - it renders as four visible glyphs but counts as 6 chars, which is the point. The four-byte slice must be predicted as two Cyrillic letters, not four. Predicting 12 bytes for the Cyrillic string is the one-byte-per-character model and worth naming.", bloom: "evaluate" }
  - id: strings
    title: "The five string functions pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m4-02-strings", expectPass: [ "m4_02_strings::shout_upcases_and_appends", "m4_02_strings::join_with_separator", "m4_02_strings::chars_and_bytes_differ", "m4_02_strings::first_n_chars_counts_characters" ], minPass: 4, timeoutMs: 180000 }
  - id: no-index
    title: "Confirm that a String cannot be indexed"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m4_02_string_index.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "the type `str` cannot be indexed by `\\{integer\\}`", timeoutMs: 120000 }
socratic:
  - { trigger: "task:strings:failed", question: { en: "Which one fails? For `first_n_chars`, are you taking characters or bytes - and what happens when n is larger than the string?", de: "Welche scheitert? Nimmst du bei `first_n_chars` Zeichen oder Bytes - und was passiert, wenn n groesser ist als die Zeichenkette?" }, hints: [ { en: "`s.chars().take(n).collect()` handles both the multi-byte case and the too-large `n` without a single explicit check.", de: "`s.chars().take(n).collect()` behandelt sowohl mehrbyteige Zeichen als auch ein zu grosses `n` ohne eine einzige ausdrueckliche Pruefung." }, { en: "`parts.join(sep)` already exists on a slice of string slices; no manual loop is needed.", de: "`parts.join(sep)` gibt es bereits auf einem Slice aus String-Slices; eine eigene Schleife ist unnoetig." }, { en: "`char_count` is `chars().count()`, `byte_len` is `len()` - the whole distinction in two method names.", de: "`char_count` ist `chars().count()`, `byte_len` ist `len()` - die ganze Unterscheidung in zwei Methodennamen." } ] }
misconceptions:
  - { pattern: "the type `str` cannot be indexed by `\\{integer\\}`", question: { en: "You asked for a single byte position of a string. What would that byte be for text where one character needs several bytes?", de: "Du hast nach einer einzelnen Byteposition einer Zeichenkette gefragt. Was waere dieses Byte bei Text, dessen Zeichen mehrere Bytes brauchen?" }, hints: [ { en: "Rust refuses because the answer would be half a character, and returning half a character is not useful.", de: "Rust verweigert es, weil die Antwort ein halbes Zeichen waere, und ein halbes Zeichen zurueckzugeben nuetzt nichts." }, { en: "`s.chars().nth(i)` gives the i-th character as an `Option<char>`.", de: "`s.chars().nth(i)` liefert das i-te Zeichen als `Option<char>`." }, { en: "`s.bytes().nth(i)` gives the i-th byte, when a byte really is what you want.", de: "`s.bytes().nth(i)` liefert das i-te Byte, wenn du wirklich ein Byte willst." } ] }
  - { pattern: "byte index \\d+ is not a char boundary", question: { en: "A slice cut through the middle of a character. Where did that byte offset come from - a search, or arithmetic of your own?", de: "Ein Slice hat mitten durch ein Zeichen geschnitten. Woher stammt dieser Byte-Offset - aus einer Suche oder aus eigener Rechnung?" }, hints: [ { en: "Offsets returned by `find`, `rfind` and `char_indices` are always valid boundaries.", de: "Offsets aus `find`, `rfind` und `char_indices` sind stets gueltige Grenzen." }, { en: "`n` characters is not `n` bytes; use `chars().take(n)` when you mean characters.", de: "`n` Zeichen sind nicht `n` Bytes; nutze `chars().take(n)`, wenn du Zeichen meinst." }, { en: "The panic message prints the character the boundary falls inside, which tells you how far off you were.", de: "Die Panic-Meldung nennt das Zeichen, in das die Grenze faellt, und damit, wie weit du daneben lagst." } ] }
---
## Learning goal

Explain why `s[0]` is not allowed on a `String`, and write string code that stays correct for text that is not ASCII.

## Two types, one job

`String` owns growable UTF-8 text on the heap. `&str` borrows a slice of UTF-8 text, wherever it lives - in a `String`, in the binary, in a buffer. Almost every method you want is on `str`, and `String` gets them all through deref, which is why `&str` is the parameter type and `String` the storage type.

Building:

```rust
let mut s = String::from("tic");
s.push_str("-tac");     // a &str
s.push('-');            // a single char
s += "toe";             // add-assign takes a &str
```

## The counting problem

```text
hello:        5 bytes,  5 chars
Cyrillic:    24 bytes, 12 chars
Devanagari:  18 bytes,  6 chars
```

`len()` counts **bytes**. `chars().count()` counts **Unicode scalar values**. For ASCII they agree; for anything else they do not, and the Devanagari case shows a third number - what a reader would call four letters is six scalar values, because two of them are combining marks. The book's position is worth taking seriously: there is no single correct answer to "how long is this string", so Rust makes you say which one you mean.

`examples/m4_string_bytes.rs` prints exactly this. Predict all of it first.

## Why indexing is refused

```rust
let s = String::from("hello");
let first = s[0];
```

```text
error[E0277]: the type `str` cannot be indexed by `{integer}`
```

The third check compiles that snippet and expects this message, so you meet it directly. The reason is that `s[0]` would have to be a byte, and a byte is not a character. Rather than return something that is right for ASCII and wrong for everything else, Rust does not offer the operation. `s.chars().nth(0)` and `s.bytes().nth(0)` are both available, and you have to choose.

## Range slicing works, and can panic

`&s[0..4]` is allowed, in **bytes**, and panics at runtime if either end falls inside a character:

```text
byte index 1 is not a char boundary; it is inside 'З' (bytes 0..2)
```

Offsets from `find`, `rfind` and `char_indices` are always safe; offsets you compute are not. `first_n_chars` is the exercise for this: `n` characters is not `n` bytes, so `&s[..n]` is wrong. `s.chars().take(n).collect()` is right, and it handles `n` larger than the string without a special case.

## Your task

Predict the example, implement the five functions, and run the indexing snippet. Next: the third collection, and the `entry` idiom that makes counting one line.
