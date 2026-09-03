---
id: m7-01-wordstat
title: "Build wordstat"
bloom: create
objectives: [ "rust-project-cli" ]
requires: [ "m6-04-lifetimes" ]
estimatedMinutes: 90
scaffold: independent
recallFrom: [ "m5-04-custom-error", "m4-04-collections-report", "m4-03-hash-maps" ]
links:
  - { step: "m7-02-review" }
  - { file: "src/project/wordstat.rs" }
  - { file: "src/bin/wordstat.rs" }
  - { file: "samples/fox.txt" }
  - { url: "https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html", title: "The Book, 9.2: Recoverable Errors with Result" }
sources: [ "src/project/wordstat.rs", "src/bin/wordstat.rs", "tests/m7-01-wordstat.rs", "samples/fox.txt", "README.md" ]
tasks:
  - id: library
    title: "The library passes its tests"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m7-01-wordstat", expectPass: [ "m7_01_wordstat::normalize_strips_punctuation_and_lowercases", "m7_01_wordstat::count_words_uses_normalized_words", "m7_01_wordstat::report_counts_and_ranks", "m7_01_wordstat::report_with_zero_top_is_still_counted", "m7_01_wordstat::report_display_is_aligned", "m7_01_wordstat::run_reads_the_sample_file", "m7_01_wordstat::run_reports_a_missing_file_as_io", "m7_01_wordstat::run_reports_an_empty_file_as_no_words", "m7_01_wordstat::wordstat_error_displays" ], minPass: 9, timeoutMs: 240000 }
  - id: cli
    title: "The command-line tool runs on the sample"
    check: { type: "command", command: "cargo run --quiet --bin wordstat -- samples/fox.txt 3", expectExitCode: 0, expectStdout: "words: 24\\nunique: 12\\n  7  the\\n  4  fox\\n  3  dog", timeoutMs: 240000 }
  - id: cli-error
    title: "A missing file fails cleanly"
    check: { type: "command", command: "cargo run --quiet --bin wordstat -- samples/nope.txt", expectExitCode: 1, expectStderr: "wordstat: cannot read file:", timeoutMs: 240000 }
socratic:
  - { trigger: "task:library:failed", question: { en: "Which test fails? If it is report_display_is_aligned, count the spaces: the width is three and there are two spaces between the count and the word.", de: "Welcher Test scheitert? Ist es report_display_is_aligned, zaehle die Leerzeichen: die Breite ist drei, und zwischen Anzahl und Wort stehen zwei Leerzeichen." }, hints: [ { en: "`writeln!(f, \"{count:>3}  {word}\")` right-aligns in a field of three and adds the newline.", de: "`writeln!(f, \"{count:>3}  {word}\")` richtet rechtsbuendig in einem Feld der Breite drei aus und ergaenzt den Zeilenumbruch." }, { en: "`normalize` trims characters that are not alphanumeric from both ends only: `trim_matches(|c: char| !c.is_alphanumeric())` keeps the apostrophe inside `don't`.", de: "`normalize` entfernt nicht-alphanumerische Zeichen nur an beiden Enden: `trim_matches(|c: char| !c.is_alphanumeric())` behaelt den Apostroph in `don't`." }, { en: "`total_words` is the sum of the counts, `unique_words` is the number of keys - both come from the same map.", de: "`total_words` ist die Summe der Anzahlen, `unique_words` die Zahl der Schluessel - beide stammen aus derselben Map." } ] }
  - { trigger: "task:cli:failed", question: { en: "Does the library test pass but the binary print something different? Compare your Display output with the expected block byte for byte.", de: "Besteht der Bibliothekstest, das Binary gibt aber anderes aus? Vergleiche deine Display-Ausgabe Byte fuer Byte mit dem erwarteten Block." }, hints: [ { en: "The binary uses `print!`, not `println!`, because `Display` already ends every line - a second newline would break the check.", de: "Das Binary nutzt `print!`, nicht `println!`, weil `Display` bereits jede Zeile beendet - ein zweiter Umbruch braeche den Check." }, { en: "The sample file has 25 whitespace-separated tokens but 24 words: `--` normalizes to `None`.", de: "Die Beispieldatei hat 25 durch Leerraum getrennte Token, aber 24 Woerter: `--` normalisiert zu `None`." }, { en: "Ties are broken alphabetically, so the ranking is reproducible; without that the third line would vary.", de: "Gleichstaende werden alphabetisch aufgeloest, damit die Rangfolge reproduzierbar ist; ohne das schwankte die dritte Zeile." } ] }
misconceptions:
  - { pattern: "the trait bound `.*: From<std::io::Error>` is not satisfied|`\\?` couldn't convert the error", question: { en: "? cannot turn the I/O error into yours. Which impl is missing, and is the read really the line that needs it?", de: "? kann den E/A-Fehler nicht in deinen wandeln. Welches Impl fehlt, und ist das Lesen wirklich die Zeile, die es braucht?" }, hints: [ { en: "`impl From<std::io::Error> for WordstatError` is what makes `std::fs::read_to_string(path)?` compile in `run`.", de: "`impl From<std::io::Error> for WordstatError` macht `std::fs::read_to_string(path)?` in `run` uebersetzbar." }, { en: "This is the same pattern as m5-04's From<ParseIntError>, with a different source type.", de: "Das ist dasselbe Muster wie From<ParseIntError> in m5-04, nur mit einem anderen Quelltyp." }, { en: "The variant should carry the original error so the message can print it.", de: "Die Variante sollte den urspruenglichen Fehler tragen, damit die Meldung ihn ausgeben kann." } ] }
  - { pattern: "error\\[E0507\\]: cannot move out of|error\\[E0502\\]", question: { en: "You are moving or mutating through a borrow of the map. Do you still need the map after building the ranking?", de: "Du verschiebst oder aenderst durch eine Leihe der Map hindurch. Brauchst du die Map nach dem Bau der Rangfolge noch?" }, hints: [ { en: "`counts.into_iter()` consumes the map and hands you owned keys, which avoids cloning every word.", de: "`counts.into_iter()` verbraucht die Map und liefert besitzende Schluessel, was das Klonen jedes Worts erspart." }, { en: "Compute `total_words` and `unique_words` from the map *before* you consume it.", de: "Berechne `total_words` und `unique_words`, *bevor* du die Map verbrauchst." }, { en: "`counts.iter().map(|(w, c)| (w.clone(), *c))` is the borrowing alternative when you must keep the map.", de: "`counts.iter().map(|(w, c)| (w.clone(), *c))` ist die leihende Alternative, wenn du die Map behalten musst." } ] }
---
## Learning goal

Build a working command-line tool from the pieces of M1 to M6, and prove it works with the tests it ships with.

## What you are building

```bash
cargo run --bin wordstat -- samples/fox.txt 3
```

```text
words: 24
unique: 12
  7  the
  4  fox
  3  dog
```

`src/bin/wordstat.rs` - argument parsing, printing, exit codes - is **already written**. Read it; it is the caller of everything you write, and it shows what the library is expected to offer. Your work is `src/project/wordstat.rs`.

## The pieces, and where each came from

**A struct for the result** (M3). `Report` holds the two counts and the ranked list. Three fields with names beats a `(usize, usize, Vec<(String, usize)>)` that every reader has to decode.

**An error enum with two variants** (M3, M5). `WordstatError::Io` carries the underlying `std::io::Error`; `NoWords` carries nothing. `Display` writes the message a user sees, and `impl From<std::io::Error>` is what lets `run` say:

```rust
let text = std::fs::read_to_string(path)?;
```

with no `map_err` - the same pattern as m5-04, with a different source type.

**`Display` for `Report`** (M6). Implementing a standard trait for your own type is what makes `print!("{report}")` in the binary work. The format is exact: `{count:>3}` right-aligns in a field of three, then **two** spaces, then the word, and `writeln!` ends every line - which is why the binary uses `print!` and not `println!`.

**Normalisation** (M4, M2). `normalize` lower-cases and strips leading and trailing characters that are not alphanumeric. `trim_matches` with a closure does both ends at once, and because it only trims the ends, `don't` keeps its apostrophe while `--` becomes `None`. That is the difference between the sample file's 25 whitespace tokens and its 24 words.

**Counting and ranking** (M4). `count_words` is the `entry` idiom. `report` sums the values for `total_words`, takes `len()` for `unique_words`, then sorts by count descending with the word ascending as tie-break and truncates - m4-04 applied unchanged.

**Ownership at the end** (M1). `counts.into_iter()` consumes the map and gives you owned keys, so nothing is cloned. It also means you must read `total_words` and `unique_words` *before* that line.

## The three checks

The first runs the nine library tests. The second runs the real binary on `samples/fox.txt` and compares the first five lines. The third runs it on a file that does not exist and requires exit code 1 with `wordstat: cannot read file:` on stderr - a tool that reports a missing file cleanly is part of the deliverable, not an extra.

## Your task

Implement everything in `src/project/wordstat.rs`. Work outwards: `normalize` first, then `count_words`, then `report`, then the two `Display` impls, then `run`. Run the step's tests after each one. The last step reviews what you built.
