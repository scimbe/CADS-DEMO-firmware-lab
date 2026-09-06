---
id: m4-02-strings
title: "Strings sind UTF-8, und das ändert einiges"
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
    title: "Sage Byte- und Zeichenzahlen vorher"
    check: { type: "predict", prompt: { en: "examples/m4_string_bytes.rs prints the byte length and the character count of \"hello\", \"Zdravstvuyte\" written in Cyrillic, and a Devanagari greeting, then slices the first four bytes of the Cyrillic string. Write down all the numbers and what that four-byte slice prints.", de: "examples/m4_string_bytes.rs gibt Bytelänge und Zeichenzahl von \"hello\", eines kyrillisch geschriebenen Grußes und eines Devanagari-Grußes aus und schneidet dann die ersten vier Bytes des kyrillischen Strings heraus. Notiere alle Zahlen und was dieser Vier-Byte-Slice ausgibt." }, then: { type: "command", command: "cargo run --quiet --example m4_string_bytes", seedMustFail: false, expectExitCode: 0, expectStdout: "24 bytes, 12 chars", timeoutMs: 120000 }, rubric: "The prediction has 5/5 for hello, 24 bytes and 12 chars for the Cyrillic string (two bytes per letter), and 18 bytes for the Devanagari one against a smaller character count - it renders as four visible glyphs but counts as 6 chars, which is the point. The four-byte slice must be predicted as two Cyrillic letters, not four. Predicting 12 bytes for the Cyrillic string is the one-byte-per-character model and worth naming.", bloom: "evaluate" }
  - id: strings
    title: "Die fünf String-Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m4-02-strings", expectPass: [ "m4_02_strings::shout_upcases_and_appends", "m4_02_strings::join_with_separator", "m4_02_strings::chars_and_bytes_differ", "m4_02_strings::first_n_chars_counts_characters" ], minPass: 4, timeoutMs: 180000 }
  - id: no-index
    title: "rustc lehnt s[0] an einem String ab"
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

Der dritte Check übersetzt dieses Snippet und erwartet diese Meldung, du begegnest ihr also unmittelbar. Er ist von Anfang an grün und bleibt es: er belegt eine Eigenschaft der Sprache, nicht deine Arbeit, und das Snippet gehört unverändert. Der Grund: `s[0]` müsste ein Byte sein, und ein Byte ist kein Zeichen. Statt etwas zu liefern, das für ASCII stimmt und für alles andere nicht, bietet Rust die Operation nicht an. `s.chars().nth(0)` und `s.bytes().nth(0)` gibt es beide, und du musst wählen.

## Bereichs-Slicing gibt es, und es kann abstürzen

`&s[0..4]` ist erlaubt, in **Bytes**, und stürzt zur Laufzeit ab, wenn eines der Enden in ein Zeichen fällt:

```text
byte index 1 is not a char boundary; it is inside 'З' (bytes 0..2)
```

Offsets aus `find`, `rfind` und `char_indices` sind stets sicher; selbst berechnete nicht. `first_n_chars` ist die Übung dazu: `n` Zeichen sind nicht `n` Bytes, `&s[..n]` ist also falsch. `s.chars().take(n).collect()` ist richtig und behandelt ein `n` größer als die Zeichenkette ohne Sonderfall.

## Deine Aufgabe

Sage das Beispiel vorher, implementiere die fünf Funktionen und führe den Indizierungs-Snippet aus. Als Nächstes: die dritte Sammlung und das `entry`-Idiom, das Zählen zu einer Zeile macht.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo run --quiet --example m4_string_bytes
cargo test --test m4-02-strings
mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m4_02_string_index.rs
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** die Ausgabe des Programms, darin `24 bytes, 12 chars`.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

*Die drei Handgriffe sind in jedem Step dieses Kurses dieselben - Terminal öffnen, mit `cd` in die Crate wechseln, den Befehl ausführen. Nur die letzte Zeile unterscheidet sich, und die Fassung dieses Steps steht im Block darüber.*

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
