---
id: m4-02-strings
title: "Strings sind UTF-8, und das ändert einiges"
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
    check: { type: "predict", prompt: { en: "examples/m4_string_bytes.rs prints the byte length and the character count of \"hello\", \"Zdravstvuyte\" written in Cyrillic, and a Devanagari greeting, then slices the first four bytes of the Cyrillic string. Write down all the numbers and what that four-byte slice prints.", de: "examples/m4_string_bytes.rs gibt Bytelänge und Zeichenzahl von \"hello\", eines kyrillisch geschriebenen Grußes und eines Devanagari-Grußes aus und schneidet dann die ersten vier Bytes des kyrillischen Strings heraus. Notiere alle Zahlen und was dieser Vier-Byte-Slice ausgibt." }, then: { type: "command", command: "cargo run --quiet --example m4_string_bytes", seedMustFail: false, expectExitCode: 0, expectStdout: "24 bytes, 12 chars", timeoutMs: 120000 }, rubric: "The prediction has 5/5 for hello, 24 bytes and 12 chars for the Cyrillic string (two bytes per letter), and 18 bytes for the Devanagari one against a smaller character count - it renders as four visible glyphs but counts as 6 chars, which is the point. The four-byte slice must be predicted as two Cyrillic letters, not four. Predicting 12 bytes for the Cyrillic string is the one-byte-per-character model and worth naming.", bloom: "evaluate" }
  - id: strings
    title: "Die fünf String-Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m4-02-strings", expectPass: [ "m4_02_strings::shout_upcases_and_appends", "m4_02_strings::join_with_separator", "m4_02_strings::chars_and_bytes_differ", "m4_02_strings::first_n_chars_counts_characters" ], minPass: 4, timeoutMs: 180000 }
  - id: no-index
    title: "Bestätige, dass ein String nicht indizierbar ist"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m4_02_string_index.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "the type `str` cannot be indexed by `\\{integer\\}`", timeoutMs: 120000 }
socratic:
  - { trigger: "task:strings:failed", question: { en: "Which one fails? For `first_n_chars`, are you taking characters or bytes - and what happens when n is larger than the string?", de: "Welche scheitert? Nimmst du bei `first_n_chars` Zeichen oder Bytes - und was passiert, wenn n größer ist als die Zeichenkette?" }, hints: [ { en: "`s.chars().take(n).collect()` handles both the multi-byte case and the too-large `n` without a single explicit check.", de: "`s.chars().take(n).collect()` behandelt sowohl mehrbyteige Zeichen als auch ein zu großes `n` ohne eine einzige ausdrückliche Prüfung." }, { en: "`parts.join(sep)` already exists on a slice of string slices; no manual loop is needed.", de: "`parts.join(sep)` gibt es bereits auf einem Slice aus String-Slices; eine eigene Schleife ist unnötig." }, { en: "`char_count` is `chars().count()`, `byte_len` is `len()` - the whole distinction in two method names.", de: "`char_count` ist `chars().count()`, `byte_len` ist `len()` - die ganze Unterscheidung in zwei Methodennamen." } ] }
misconceptions:
  - { pattern: "the type `str` cannot be indexed by `\\{integer\\}`", question: { en: "You asked for a single byte position of a string. What would that byte be for text where one character needs several bytes?", de: "Du hast nach einer einzelnen Byteposition einer Zeichenkette gefragt. Was wäre dieses Byte bei Text, dessen Zeichen mehrere Bytes brauchen?" }, hints: [ { en: "Rust refuses because the answer would be half a character, and returning half a character is not useful.", de: "Rust verweigert es, weil die Antwort ein halbes Zeichen wäre, und ein halbes Zeichen zurückzugeben nützt nichts." }, { en: "`s.chars().nth(i)` gives the i-th character as an `Option<char>`.", de: "`s.chars().nth(i)` liefert das i-te Zeichen als `Option<char>`." }, { en: "`s.bytes().nth(i)` gives the i-th byte, when a byte really is what you want.", de: "`s.bytes().nth(i)` liefert das i-te Byte, wenn du wirklich ein Byte willst." } ] }
  - { pattern: "byte index \\d+ is not a char boundary", question: { en: "A slice cut through the middle of a character. Where did that byte offset come from - a search, or arithmetic of your own?", de: "Ein Slice hat mitten durch ein Zeichen geschnitten. Woher stammt dieser Byte-Offset - aus einer Suche oder aus eigener Rechnung?" }, hints: [ { en: "Offsets returned by `find`, `rfind` and `char_indices` are always valid boundaries.", de: "Offsets aus `find`, `rfind` und `char_indices` sind stets gültige Grenzen." }, { en: "`n` characters is not `n` bytes; use `chars().take(n)` when you mean characters.", de: "`n` Zeichen sind nicht `n` Bytes; nutze `chars().take(n)`, wenn du Zeichen meinst." }, { en: "The panic message prints the character the boundary falls inside, which tells you how far off you were.", de: "Die Panic-Meldung nennt das Zeichen, in das die Grenze fällt, und damit, wie weit du daneben lagst." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`pwd` prints the current folder; it has to be the rust-foundations workspace, the one holding Cargo.toml.", de: "`pwd` gibt den aktuellen Ordner aus; er muss der rust-foundations-Workspace sein, in dem die Cargo.toml liegt." }, { en: "A terminal opened with Terminal → New Terminal starts in the workspace folder; one you navigated away from does not.", de: "Ein über Terminal → Neues Terminal geöffnetes Terminal startet im Workspace-Ordner; eines, aus dem du herausnavigiert bist, nicht." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Erkläre, warum `s[0]` an einem `String` nicht erlaubt ist, und schreibe String-Code, der auch für Text jenseits von ASCII korrekt bleibt.

## Zwei Typen, eine Aufgabe

`String` besitzt wachsenden UTF-8-Text auf dem Heap. `&str` leiht einen Slice aus UTF-8-Text, wo immer er liegt - in einem `String`, im Binary, in einem Puffer. Fast jede Methode, die du willst, hängt an `str`, und `String` erhält sie alle über Deref - deshalb ist `&str` der Parametertyp und `String` der Speichertyp.

Aufbauen:

```rust
let mut s = String::from("tic");
s.push_str("-tac");     // ein &str
s.push('-');            // ein einzelnes char
s += "toe";             // die Zuweisungsaddition nimmt ein &str
```

## Das Zählproblem

```text
hello:        5 Bytes,  5 Zeichen
Kyrillisch:  24 Bytes, 12 Zeichen
Devanagari:  18 Bytes,  6 Zeichen
```

`len()` zählt **Bytes**. `chars().count()` zählt **Unicode-Skalarwerte**. Für ASCII stimmen sie überein, sonst nicht, und der Devanagari-Fall zeigt eine dritte Zahl: was ein Leser vier Buchstaben nennen würde, sind sechs Skalarwerte, weil zwei davon kombinierende Zeichen sind. Die Position des Buchs verdient Ernst: es gibt keine einzelne richtige Antwort auf "wie lang ist diese Zeichenkette", also verlangt Rust von dir zu sagen, welche du meinst.

`examples/m4_string_bytes.rs` gibt genau das aus. Sage zuerst alles vorher.

## Warum Indizierung verweigert wird

```rust
let s = String::from("hello");
let first = s[0];
```

```text
error[E0277]: the type `str` cannot be indexed by `{integer}`
```

Der dritte Check übersetzt dieses Snippet und erwartet diese Meldung, du begegnest ihr also unmittelbar. Der Grund: `s[0]` müsste ein Byte sein, und ein Byte ist kein Zeichen. Statt etwas zu liefern, das für ASCII stimmt und für alles andere nicht, bietet Rust die Operation nicht an. `s.chars().nth(0)` und `s.bytes().nth(0)` gibt es beide, und du musst wählen.

## Bereichs-Slicing gibt es, und es kann abstürzen

`&s[0..4]` ist erlaubt, in **Bytes**, und stürzt zur Laufzeit ab, wenn eines der Enden in ein Zeichen fällt:

```text
byte index 1 is not a char boundary; it is inside 'З' (bytes 0..2)
```

Offsets aus `find`, `rfind` und `char_indices` sind stets sicher; selbst berechnete nicht. `first_n_chars` ist die Übung dazu: `n` Zeichen sind nicht `n` Bytes, `&s[..n]` ist also falsch. `s.chars().take(n).collect()` ist richtig und behandelt ein `n` größer als die Zeichenkette ohne Sonderfall.

## Deine Aufgabe

Sage das Beispiel vorher, implementiere die fünf Funktionen und führe den Indizierungs-Snippet aus. Als Nächstes: die dritte Sammlung und das `entry`-Idiom, das Zählen zu einer Zeile macht.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1** (im Browser zuverlässiger als Strg+Umschalt+P), tippe `Terminal: Create New Terminal` und drücke die Eingabetaste. Das Terminal öffnet sich im Bereich unten, bereits im Workspace-Ordner. Führe dann aus:

```bash
cargo run --quiet --example m4_string_bytes
cargo test --test m4-02-strings
mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m4_02_string_index.rs
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** die Ausgabe des Programms, darin `24 bytes, 12 chars`.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, steht das Terminal im falschen Ordner - wechsle mit `cd` zurück in den Workspace-Ordner.
