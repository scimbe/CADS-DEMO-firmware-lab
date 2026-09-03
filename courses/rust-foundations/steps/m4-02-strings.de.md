---
id: m4-02-strings
title: "Strings sind UTF-8, und das aendert einiges"
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
    title: "Sage Byte- und Zeichenzahlen vorher"
    check: { type: "predict", prompt: { en: "examples/m4_string_bytes.rs prints the byte length and the character count of \"hello\", \"Zdravstvuyte\" written in Cyrillic, and a Devanagari greeting, then slices the first four bytes of the Cyrillic string. Write down all the numbers and what that four-byte slice prints.", de: "examples/m4_string_bytes.rs gibt Bytelaenge und Zeichenzahl von \"hello\", eines kyrillisch geschriebenen Grusses und eines Devanagari-Grusses aus und schneidet dann die ersten vier Bytes des kyrillischen Strings heraus. Notiere alle Zahlen und was dieser Vier-Byte-Slice ausgibt." }, then: { type: "command", command: "cargo run --quiet --example m4_string_bytes", seedMustFail: false, expectExitCode: 0, expectStdout: "24 bytes, 12 chars", timeoutMs: 120000 }, rubric: "The prediction has 5/5 for hello, 24 bytes and 12 chars for the Cyrillic string (two bytes per letter), and 18 bytes for the Devanagari one against a smaller character count - it renders as four visible glyphs but counts as 6 chars, which is the point. The four-byte slice must be predicted as two Cyrillic letters, not four. Predicting 12 bytes for the Cyrillic string is the one-byte-per-character model and worth naming.", bloom: "evaluate" }
  - id: strings
    title: "Die fuenf String-Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m4-02-strings", expectPass: [ "m4_02_strings::shout_upcases_and_appends", "m4_02_strings::join_with_separator", "m4_02_strings::chars_and_bytes_differ", "m4_02_strings::first_n_chars_counts_characters" ], minPass: 4, timeoutMs: 180000 }
  - id: no-index
    title: "Bestaetige, dass ein String nicht indizierbar ist"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m4_02_string_index.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "the type `str` cannot be indexed by `\\{integer\\}`", timeoutMs: 120000 }
socratic:
  - { trigger: "task:strings:failed", question: { en: "Which one fails? For `first_n_chars`, are you taking characters or bytes - and what happens when n is larger than the string?", de: "Welche scheitert? Nimmst du bei `first_n_chars` Zeichen oder Bytes - und was passiert, wenn n groesser ist als die Zeichenkette?" }, hints: [ { en: "`s.chars().take(n).collect()` handles both the multi-byte case and the too-large `n` without a single explicit check.", de: "`s.chars().take(n).collect()` behandelt sowohl mehrbyteige Zeichen als auch ein zu grosses `n` ohne eine einzige ausdrueckliche Pruefung." }, { en: "`parts.join(sep)` already exists on a slice of string slices; no manual loop is needed.", de: "`parts.join(sep)` gibt es bereits auf einem Slice aus String-Slices; eine eigene Schleife ist unnoetig." }, { en: "`char_count` is `chars().count()`, `byte_len` is `len()` - the whole distinction in two method names.", de: "`char_count` ist `chars().count()`, `byte_len` ist `len()` - die ganze Unterscheidung in zwei Methodennamen." } ] }
misconceptions:
  - { pattern: "the type `str` cannot be indexed by `\\{integer\\}`", question: { en: "You asked for a single byte position of a string. What would that byte be for text where one character needs several bytes?", de: "Du hast nach einer einzelnen Byteposition einer Zeichenkette gefragt. Was waere dieses Byte bei Text, dessen Zeichen mehrere Bytes brauchen?" }, hints: [ { en: "Rust refuses because the answer would be half a character, and returning half a character is not useful.", de: "Rust verweigert es, weil die Antwort ein halbes Zeichen waere, und ein halbes Zeichen zurueckzugeben nuetzt nichts." }, { en: "`s.chars().nth(i)` gives the i-th character as an `Option<char>`.", de: "`s.chars().nth(i)` liefert das i-te Zeichen als `Option<char>`." }, { en: "`s.bytes().nth(i)` gives the i-th byte, when a byte really is what you want.", de: "`s.bytes().nth(i)` liefert das i-te Byte, wenn du wirklich ein Byte willst." } ] }
  - { pattern: "byte index \\d+ is not a char boundary", question: { en: "A slice cut through the middle of a character. Where did that byte offset come from - a search, or arithmetic of your own?", de: "Ein Slice hat mitten durch ein Zeichen geschnitten. Woher stammt dieser Byte-Offset - aus einer Suche oder aus eigener Rechnung?" }, hints: [ { en: "Offsets returned by `find`, `rfind` and `char_indices` are always valid boundaries.", de: "Offsets aus `find`, `rfind` und `char_indices` sind stets gueltige Grenzen." }, { en: "`n` characters is not `n` bytes; use `chars().take(n)` when you mean characters.", de: "`n` Zeichen sind nicht `n` Bytes; nutze `chars().take(n)`, wenn du Zeichen meinst." }, { en: "The panic message prints the character the boundary falls inside, which tells you how far off you were.", de: "Die Panic-Meldung nennt das Zeichen, in das die Grenze faellt, und damit, wie weit du daneben lagst." } ] }
---
## Lernziel

Erklaere, warum `s[0]` an einem `String` nicht erlaubt ist, und schreibe String-Code, der auch fuer Text jenseits von ASCII korrekt bleibt.

## Zwei Typen, eine Aufgabe

`String` besitzt wachsenden UTF-8-Text auf dem Heap. `&str` leiht einen Slice aus UTF-8-Text, wo immer er liegt - in einem `String`, im Binary, in einem Puffer. Fast jede Methode, die du willst, haengt an `str`, und `String` erhaelt sie alle ueber Deref - deshalb ist `&str` der Parametertyp und `String` der Speichertyp.

Aufbauen:

```rust
let mut s = String::from("tic");
s.push_str("-tac");     // ein &str
s.push('-');            // ein einzelnes char
s += "toe";             // die Zuweisungsaddition nimmt ein &str
```

## Das Zaehlproblem

```text
hello:        5 Bytes,  5 Zeichen
Kyrillisch:  24 Bytes, 12 Zeichen
Devanagari:  18 Bytes,  6 Zeichen
```

`len()` zaehlt **Bytes**. `chars().count()` zaehlt **Unicode-Skalarwerte**. Fuer ASCII stimmen sie ueberein, sonst nicht, und der Devanagari-Fall zeigt eine dritte Zahl: was ein Leser vier Buchstaben nennen wuerde, sind sechs Skalarwerte, weil zwei davon kombinierende Zeichen sind. Die Position des Buchs verdient Ernst: es gibt keine einzelne richtige Antwort auf "wie lang ist diese Zeichenkette", also verlangt Rust von dir zu sagen, welche du meinst.

`examples/m4_string_bytes.rs` gibt genau das aus. Sage zuerst alles vorher.

## Warum Indizierung verweigert wird

```rust
let s = String::from("hello");
let first = s[0];
```

```text
error[E0277]: the type `str` cannot be indexed by `{integer}`
```

Der dritte Check uebersetzt dieses Snippet und erwartet diese Meldung, du begegnest ihr also unmittelbar. Der Grund: `s[0]` muesste ein Byte sein, und ein Byte ist kein Zeichen. Statt etwas zu liefern, das fuer ASCII stimmt und fuer alles andere nicht, bietet Rust die Operation nicht an. `s.chars().nth(0)` und `s.bytes().nth(0)` gibt es beide, und du musst waehlen.

## Bereichs-Slicing gibt es, und es kann abstuerzen

`&s[0..4]` ist erlaubt, in **Bytes**, und stuerzt zur Laufzeit ab, wenn eines der Enden in ein Zeichen faellt:

```text
byte index 1 is not a char boundary; it is inside 'З' (bytes 0..2)
```

Offsets aus `find`, `rfind` und `char_indices` sind stets sicher; selbst berechnete nicht. `first_n_chars` ist die Uebung dazu: `n` Zeichen sind nicht `n` Bytes, `&s[..n]` ist also falsch. `s.chars().take(n).collect()` ist richtig und behandelt ein `n` groesser als die Zeichenkette ohne Sonderfall.

## Deine Aufgabe

Sage das Beispiel vorher, implementiere die fuenf Funktionen und fuehre den Indizierungs-Snippet aus. Als Naechstes: die dritte Sammlung und das `entry`-Idiom, das Zaehlen zu einer Zeile macht.
