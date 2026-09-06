---
id: m4-02-strings
title: "Strings are UTF-8, and that changes things"
bloom: analyze
objectives: [ "rust-ch08-02-strings" ]
requires: [ "m4-01-vectors" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m4-01-vectors", "m2-03-aliasing-rule", "m2-04-slices" ]
links:
  - { step: "m4-03-hash-maps" }
  - { file: "src/m4/m4_02_strings.rs" }
  - { file: "examples/m4_string_bytes.rs" }
  - { url: "https://doc.rust-lang.org/book/ch08-02-strings.html", title: "The Book, 8.2: Storing UTF-8 Encoded Text with Strings" }
sources: [ "src/m4/m4_02_strings.rs", "tests/m4-02-strings.rs", "examples/m4_string_bytes.rs", "snippets/m4_02_string_index.rs" ]
tasks:
  - id: guess
    title: "Predict the byte and character counts"
    check: { type: "predict", prompt: { en: "examples/m4_string_bytes.rs prints the byte length and the character count of \"hello\", \"Zdravstvuyte\" written in Cyrillic, and a Devanagari greeting, then slices the first four bytes of the Cyrillic string. Write down all the numbers and what that four-byte slice prints.", de: "examples/m4_string_bytes.rs gibt Bytelänge und Zeichenzahl von \"hello\", eines kyrillisch geschriebenen Grußes und eines Devanagari-Grußes aus und schneidet dann die ersten vier Bytes des kyrillischen Strings heraus. Notiere alle Zahlen und was dieser Vier-Byte-Slice ausgibt." }, then: { type: "command", command: "cargo run --quiet --example m4_string_bytes", seedMustFail: false, expectExitCode: 0, expectStdout: "24 bytes, 12 chars", timeoutMs: 120000 }, rubric: "The prediction has 5/5 for hello, 24 bytes and 12 chars for the Cyrillic string (two bytes per letter), and 18 bytes for the Devanagari one against a smaller character count - it renders as four visible glyphs but counts as 6 chars, which is the point. The four-byte slice must be predicted as two Cyrillic letters, not four. Predicting 12 bytes for the Cyrillic string is the one-byte-per-character model and worth naming.", bloom: "evaluate" }
  - id: strings
    title: "The five string functions pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m4-02-strings", expectPass: [ "m4_02_strings::shout_upcases_and_appends", "m4_02_strings::join_with_separator", "m4_02_strings::chars_and_bytes_differ", "m4_02_strings::first_n_chars_counts_characters" ], minPass: 4, timeoutMs: 180000 }
  - id: no-index
    title: "rustc rejects s[0] on a String"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m4_02_string_index.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "the type `str` cannot be indexed by `\\{integer\\}`", timeoutMs: 120000 }
socratic:
  - { trigger: "task:guess:failed", question: { en: "Your prediction differs from the run. At which of the three greetings does it first come apart - or only at the four-byte slice?", de: "Deine Vorhersage weicht vom Lauf ab. Bei welchem der drei Grüße geht sie zuerst auseinander - oder erst beim Vier-Byte-Schnitt?" }, hints: [ { en: "In UTF-8 a character does not occupy one byte. Before each number ask which script this is and how many bytes that script needs per letter - and then ask separately whether what you see as one sign is also one char.", de: "In UTF-8 belegt ein Zeichen nicht ein Byte. Frage vor jeder Zahl, um welche Schrift es geht und wie viele Bytes diese Schrift je Buchstabe braucht - und frage danach getrennt, ob das, was du als ein Zeichen siehst, auch ein char ist." }, { en: "Open `examples/m4_string_bytes.rs` and note which method feeds which printed number. Two different methods are at work: one counts memory, the other counts the elements of an iterator, and each column shows only one of them.", de: "Öffne `examples/m4_string_bytes.rs` und sieh nach, welche Methode welche ausgegebene Zahl speist. Zwei verschiedene Methoden sind im Spiel: die eine zählt Speicher, die andere die Elemente eines Iterators, und je Spalte erscheint nur eine von beiden." }, { en: "Compare your figures with the printed ones line by line and decide which model produced yours: one byte per sign, or one char per visible sign. The two mistakes look alike in the first line and come apart in the third, and the slice at the end is the one place where a wrong model yields not a wrong number but a wrong text.", de: "Vergleiche deine Zahlen Zeile für Zeile mit den ausgegebenen und entscheide, welches Modell deine erzeugt hat: ein Byte je Zeichen oder ein char je sichtbarem Zeichen. Die beiden Irrtümer sehen sich in der ersten Zeile ähnlich und gehen in der dritten auseinander, und der Schnitt am Ende ist die einzige Stelle, an der ein falsches Modell keine falsche Zahl, sondern einen falschen Text liefert." } ] }
  - { trigger: "task:no-index:failed", question: { en: "This check wants rustc to reject the snippet. Did no error come at all, or a different one from the one the check looks for?", de: "Diese Prüfung will, dass rustc den Schnipsel ablehnt. Kam gar kein Fehler, oder ein anderer als der, nach dem die Prüfung sucht?" }, hints: [ { en: "Nothing here is yours to fix either. Ask what would be missing if the course had merely asserted this: which of the claims you have read in this module could you then not check for yourself?", de: "Auch hier ist nichts zu reparieren. Frage, was fehlen würde, wenn der Kurs das nur behauptet hätte: welche der Aussagen, die du in diesem Modul gelesen hast, könntest du dann nicht selbst nachprüfen?" }, { en: "The snippet is `snippets/m4_02_string_index.rs`, four lines long, and the command compiles it on its own. Run it from the crate folder and read the line beginning `the type`: it names both the type being indexed and the kind of index it will not take.", de: "Der Schnipsel ist `snippets/m4_02_string_index.rs`, vier Zeilen lang, und der Befehl übersetzt ihn allein. Führe ihn im Ordner der Crate aus und lies die Zeile, die mit `the type` beginnt: sie nennt sowohl den indizierten Typ als auch die Art von Index, die er nicht annimmt." }, { en: "If no error came at all, the indexing line has been defused - a range such as `&s[0..1]` compiles, a single `s[0]` does not, and the difference between the two is the whole point of the step. Files under `snippets/` belong unchanged; the exercise is in `src/m4/`.", de: "Kam gar kein Fehler, ist die indizierende Zeile entschärft worden - ein Bereich wie `&s[0..1]` kompiliert, ein einzelnes `s[0]` nicht, und der Unterschied zwischen beiden ist der ganze Punkt des Steps. Dateien unter `snippets/` gehören unverändert, die Übung liegt in `src/m4/`." } ] }
  - { trigger: "task:strings:failed", question: { en: "Which one fails? For `first_n_chars`, are you taking characters or bytes - and what happens when n is larger than the string?", de: "Welche scheitert? Nimmst du bei `first_n_chars` Zeichen oder Bytes - und was passiert, wenn n größer ist als die Zeichenkette?" }, hints: [ { en: "`s.chars().take(n).collect()` handles both the multi-byte case and the too-large `n` without a single explicit check.", de: "`s.chars().take(n).collect()` behandelt sowohl mehrbyteige Zeichen als auch ein zu großes `n` ohne eine einzige ausdrückliche Prüfung." }, { en: "`parts.join(sep)` already exists on a slice of string slices; no manual loop is needed.", de: "`parts.join(sep)` gibt es bereits auf einem Slice aus String-Slices; eine eigene Schleife ist unnötig." }, { en: "`char_count` is `chars().count()`, `byte_len` is `len()` - the whole distinction in two method names.", de: "`char_count` ist `chars().count()`, `byte_len` ist `len()` - die ganze Unterscheidung in zwei Methodennamen." } ] }
misconceptions:
  - { pattern: "the type `str` cannot be indexed by `\\{integer\\}`", question: { en: "You asked for a single byte position of a string. What would that byte be for text where one character needs several bytes?", de: "Du hast nach einer einzelnen Byteposition einer Zeichenkette gefragt. Was wäre dieses Byte bei Text, dessen Zeichen mehrere Bytes brauchen?" }, hints: [ { en: "Rust refuses because the answer would be half a character, and returning half a character is not useful.", de: "Rust verweigert es, weil die Antwort ein halbes Zeichen wäre, und ein halbes Zeichen zurückzugeben nützt nichts." }, { en: "`s.chars().nth(i)` gives the i-th character as an `Option<char>`.", de: "`s.chars().nth(i)` liefert das i-te Zeichen als `Option<char>`." }, { en: "`s.bytes().nth(i)` gives the i-th byte, when a byte really is what you want.", de: "`s.bytes().nth(i)` liefert das i-te Byte, wenn du wirklich ein Byte willst." } ] }
  - { pattern: "byte index \\d+ is not a char boundary", question: { en: "A slice cut through the middle of a character. Where did that byte offset come from - a search, or arithmetic of your own?", de: "Ein Slice hat mitten durch ein Zeichen geschnitten. Woher stammt dieser Byte-Offset - aus einer Suche oder aus eigener Rechnung?" }, hints: [ { en: "Offsets returned by `find`, `rfind` and `char_indices` are always valid boundaries.", de: "Offsets aus `find`, `rfind` und `char_indices` sind stets gültige Grenzen." }, { en: "`n` characters is not `n` bytes; use `chars().take(n)` when you mean characters.", de: "`n` Zeichen sind nicht `n` Bytes; nutze `chars().take(n)`, wenn du Zeichen meinst." }, { en: "The panic message prints the character the boundary falls inside, which tells you how far off you were.", de: "Die Panic-Meldung nennt das Zeichen, in das die Grenze fällt, und damit, wie weit du daneben lagst." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
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

The third check compiles that snippet and expects this message, so you meet it directly. It is green from the start and stays that way: it evidences a property of the language, not your work, and the snippet belongs unchanged. The reason is that `s[0]` would have to be a byte, and a byte is not a character. Rather than return something that is right for ASCII and wrong for everything else, Rust does not offer the operation. `s.chars().nth(0)` and `s.bytes().nth(0)` are both available, and you have to choose.

## Range slicing works, and can panic

`&s[0..4]` is allowed, in **bytes**, and panics at runtime if either end falls inside a character:

```text
byte index 1 is not a char boundary; it is inside 'З' (bytes 0..2)
```

Offsets from `find`, `rfind` and `char_indices` are always safe; offsets you compute are not. `first_n_chars` is the exercise for this: `n` characters is not `n` bytes, so `&s[..n]` is wrong. `s.chars().take(n).collect()` is right, and it handles `n` larger than the string without a special case.

## Your task

Predict the example, implement the five functions, and run the indexing snippet. Next: the third collection, and the `entry` idiom that makes counting one line.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo run --quiet --example m4_string_bytes
cargo test --test m4-02-strings
mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m4_02_string_index.rs
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** the program's output, containing `24 bytes, 12 chars`.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
