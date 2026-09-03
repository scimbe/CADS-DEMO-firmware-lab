---
id: m4-03-hash-maps
title: "Hash maps and the entry idiom"
bloom: apply
objectives: [ "rust-ch08-03-hash-maps" ]
requires: [ "m4-02-strings" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m4-01-vectors" ]
links:
  - { step: "m4-04-collections-report" }
  - { file: "src/m4/m4_03_hash_maps.rs" }
  - { file: "tests/m4-03-hash-maps.rs" }
  - { url: "https://doc.rust-lang.org/book/ch08-03-hash-maps.html", title: "The Book, 8.3: Storing Keys with Associated Values in Hash Maps" }
sources: [ "src/m4/m4_03_hash_maps.rs", "tests/m4-03-hash-maps.rs" ]
tasks:
  - id: maps
    title: "The four hash map functions pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m4-03-hash-maps", expectPass: [ "m4_03_hash_maps::word_counts_counts_occurrences", "m4_03_hash_maps::word_counts_of_empty_text", "m4_03_hash_maps::score_of_defaults_to_zero", "m4_03_hash_maps::add_score_inserts_and_accumulates", "m4_03_hash_maps::best_team_breaks_ties_alphabetically" ], minPass: 5, timeoutMs: 180000 }
  - id: order
    title: "You can explain the tie-break rule"
    check: { type: "question", prompt: { en: "best_team is specified to return the alphabetically smaller name on a tie. Explain why the test could not check the function reliably without that rule, and name one other place in a program where relying on a HashMap's iteration order would produce a bug that only appears sometimes.", de: "best_team soll bei Gleichstand den alphabetisch kleineren Namen liefern. Erkläre, warum der Test die Funktion ohne diese Regel nicht verlässlich prüfen könnte, und nenne eine weitere Stelle in einem Programm, an der das Vertrauen auf die Iterationsreihenfolge einer HashMap einen Fehler erzeugt, der nur manchmal auftritt." }, rubric: "States that HashMap iteration order is unspecified and varies between runs (Rust additionally seeds its hasher randomly), so with two equal scores either name could come out and an assertion on one of them would be flaky. The second half should give a concrete example - printed report ordering, a hash of serialised output, choosing a 'first' element, or comparing two runs - where the same non-determinism turns into an intermittent failure.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:maps:failed", question: { en: "Which one fails? For `add_score`, does your version overwrite the old score or add to it?", de: "Welche scheitert? Überschreibt deine Fassung von `add_score` den alten Punktestand oder addiert sie dazu?" }, hints: [ { en: "`*scores.entry(key).or_insert(0) += points` inserts a zero if the key is new and then adds in both cases.", de: "`*scores.entry(key).or_insert(0) += points` legt bei neuem Schlüssel eine Null an und addiert dann in beiden Fällen." }, { en: "`entry` needs an owned key, so convert the `&str` with `String::from(team)`.", de: "`entry` braucht einen besitzenden Schlüssel, wandle das `&str` also mit `String::from(team)` um." }, { en: "In `best_team`, compare scores first and only fall back to comparing names when they are equal.", de: "Vergleiche in `best_team` zuerst die Punktestände und ziehe die Namen nur bei Gleichstand heran." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]|error\\[E0499\\]", question: { en: "You are holding a reference into the map while changing it. Which value did you take out, and can you copy it instead of borrowing it?", de: "Du hältst eine Referenz in die Map, während du sie änderst. Welchen Wert hast du entnommen, und kannst du ihn kopieren statt zu leihen?" }, hints: [ { en: "`get` returns a reference into the map, which keeps the map borrowed; `.copied()` or `.cloned()` ends that.", de: "`get` liefert eine Referenz in die Map und hält sie damit geliehen; `.copied()` oder `.cloned()` beendet das." }, { en: "`entry` takes one mutable borrow and gives you a slot - do not hold a second reference alongside it.", de: "`entry` nimmt eine veränderliche Leihe und gibt dir einen Platz - halte daneben keine zweite Referenz." }, { en: "In `best_team`, remember the name as a clone at the end rather than keeping a `&String` across the loop and a later change.", de: "Merke dir den Namen in `best_team` am Ende als Klon, statt ein `&String` über die Schleife und eine spätere Änderung zu halten." } ] }
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "A key or value type does not line up. Is the map keyed by String while you handed it a &str, or the other way round?", de: "Ein Schlüssel- oder Werttyp passt nicht. Ist die Map mit String geschlüsselt, während du ein &str übergibst - oder umgekehrt?" }, hints: [ { en: "`get` accepts a `&str` for a `String`-keyed map, but `insert` and `entry` need an owned `String`.", de: "`get` akzeptiert bei einer `String`-geschlüsselten Map ein `&str`, `insert` und `entry` brauchen aber einen besitzenden `String`." }, { en: "`get` yields `Option<&V>`; the signature here promises `Option<V>` or a plain `V`.", de: "`get` liefert `Option<&V>`; die Signatur hier verspricht `Option<V>` oder ein blankes `V`." }, { en: "`.copied().unwrap_or(0)` converts and supplies the default in one chain.", de: "`.copied().unwrap_or(0)` konvertiert und liefert die Vorgabe in einer Kette." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`pwd` prints the current folder; it has to be the rust-foundations workspace, the one holding Cargo.toml.", de: "`pwd` gibt den aktuellen Ordner aus; er muss der rust-foundations-Workspace sein, in dem die Cargo.toml liegt." }, { en: "A terminal opened with Terminal → New Terminal starts in the workspace folder; one you navigated away from does not.", de: "Ein über Terminal → Neues Terminal geöffnetes Terminal startet im Workspace-Ordner; eines, aus dem du herausnavigiert bist, nicht." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Associate keys with values, use the `entry` API to insert-or-update in one expression, and treat a hash map's iteration order as the non-guarantee it is.

## Not in the prelude

```rust
use std::collections::HashMap;

let mut scores = HashMap::new();
scores.insert(String::from("Blue"), 10);
```

`HashMap` needs the `use`; `Vec` and `String` do not. All keys have one type, all values have one type, and both live on the heap.

## Ownership at the door

`insert` takes the key and the value **by value**. A `String` key is moved into the map and the map owns it from then on; the variable you had it in is no longer usable. That is the M1 rule with no exception - and the reason `add_score` has to convert its `&str` parameter with `String::from(team)` before handing it over.

Reading is the opposite. `get` borrows:

```rust
scores.get("Blue")       // Option<&u32>
```

Note it accepts a `&str` even though the key type is `String`. What comes back is a reference *into the map*, which keeps the map borrowed for as long as you hold it. `.copied()` turns `Option<&u32>` into `Option<u32>` and ends the borrow, which is what `score_of` needs so it can return a value and let the caller keep mutating.

## The entry idiom

The reason to learn hash maps properly is this one line:

```rust
*counts.entry(word).or_insert(0) += 1;
```

`entry(key)` returns an `Entry` - the slot for that key, whether or not it is occupied. `or_insert(0)` puts a zero there if it was empty and hands back a `&mut` to the value either way. The `*` writes through it. The whole insert-or-update is one borrow, one lookup and one line, and there is no branch to get wrong.

`word_counts` is exactly this over `text.split_whitespace()`. `add_score` is the same shape with `+= points`.

## Iteration order is not a thing

```rust
for (name, score) in &scores { … }
```

The order is unspecified, and Rust deliberately seeds its default hasher randomly, so it also changes between runs of the same binary. This is a defence against algorithmic complexity attacks, and it means any code whose output depends on the order is non-deterministic - a test that passes locally and fails in CI, or the reverse.

`best_team` is specified with a tie-break on the name for exactly this reason: with two teams on 30 points and no tie-break, the answer would be a coin flip and the test could not assert anything. When you need order, you sort explicitly, which is the next step.

## Your task

Implement the four functions, then explain why the tie-break is not decoration. The next step combines all three collections and puts an order on the output.

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1** (more reliable in a browser than Ctrl+Shift+P), type `Terminal: Create New Terminal` and press Enter. The terminal opens in the panel at the bottom, already in the workspace folder. Then run:

```bash
cargo test --test m4-03-hash-maps
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 5 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, the terminal is in the wrong folder - `cd` back to the workspace root.
