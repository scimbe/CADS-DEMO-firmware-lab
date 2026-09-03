---
id: m4-03-hash-maps
title: "Hash maps and the entry idiom"
bloom: apply
objectives: [ "rust-ch08-03-hash-maps" ]
requires: [ "m4-02-strings" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m4-02-strings" ]
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
    check: { type: "question", prompt: { en: "best_team is specified to return the alphabetically smaller name on a tie. Explain why the test could not check the function reliably without that rule, and name one other place in a program where relying on a HashMap's iteration order would produce a bug that only appears sometimes.", de: "best_team soll bei Gleichstand den alphabetisch kleineren Namen liefern. Erklaere, warum der Test die Funktion ohne diese Regel nicht verlaesslich pruefen koennte, und nenne eine weitere Stelle in einem Programm, an der das Vertrauen auf die Iterationsreihenfolge einer HashMap einen Fehler erzeugt, der nur manchmal auftritt." }, rubric: "States that HashMap iteration order is unspecified and varies between runs (Rust additionally seeds its hasher randomly), so with two equal scores either name could come out and an assertion on one of them would be flaky. The second half should give a concrete example - printed report ordering, a hash of serialised output, choosing a 'first' element, or comparing two runs - where the same non-determinism turns into an intermittent failure.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:maps:failed", question: { en: "Which one fails? For `add_score`, does your version overwrite the old score or add to it?", de: "Welche scheitert? Ueberschreibt deine Fassung von `add_score` den alten Punktestand oder addiert sie dazu?" }, hints: [ { en: "`*scores.entry(key).or_insert(0) += points` inserts a zero if the key is new and then adds in both cases.", de: "`*scores.entry(key).or_insert(0) += points` legt bei neuem Schluessel eine Null an und addiert dann in beiden Faellen." }, { en: "`entry` needs an owned key, so convert the `&str` with `String::from(team)`.", de: "`entry` braucht einen besitzenden Schluessel, wandle das `&str` also mit `String::from(team)` um." }, { en: "In `best_team`, compare scores first and only fall back to comparing names when they are equal.", de: "Vergleiche in `best_team` zuerst die Punktestaende und ziehe die Namen nur bei Gleichstand heran." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]|error\\[E0499\\]", question: { en: "You are holding a reference into the map while changing it. Which value did you take out, and can you copy it instead of borrowing it?", de: "Du haeltst eine Referenz in die Map, waehrend du sie aenderst. Welchen Wert hast du entnommen, und kannst du ihn kopieren statt zu leihen?" }, hints: [ { en: "`get` returns a reference into the map, which keeps the map borrowed; `.copied()` or `.cloned()` ends that.", de: "`get` liefert eine Referenz in die Map und haelt sie damit geliehen; `.copied()` oder `.cloned()` beendet das." }, { en: "`entry` takes one mutable borrow and gives you a slot - do not hold a second reference alongside it.", de: "`entry` nimmt eine veraenderliche Leihe und gibt dir einen Platz - halte daneben keine zweite Referenz." }, { en: "In `best_team`, remember the name as a clone at the end rather than keeping a `&String` across the loop and a later change.", de: "Merke dir den Namen in `best_team` am Ende als Klon, statt ein `&String` ueber die Schleife und eine spaetere Aenderung zu halten." } ] }
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "A key or value type does not line up. Is the map keyed by String while you handed it a &str, or the other way round?", de: "Ein Schluessel- oder Werttyp passt nicht. Ist die Map mit String geschluesselt, waehrend du ein &str uebergibst - oder umgekehrt?" }, hints: [ { en: "`get` accepts a `&str` for a `String`-keyed map, but `insert` and `entry` need an owned `String`.", de: "`get` akzeptiert bei einer `String`-geschluesselten Map ein `&str`, `insert` und `entry` brauchen aber einen besitzenden `String`." }, { en: "`get` yields `Option<&V>`; the signature here promises `Option<V>` or a plain `V`.", de: "`get` liefert `Option<&V>`; die Signatur hier verspricht `Option<V>` oder ein blankes `V`." }, { en: "`.copied().unwrap_or(0)` converts and supplies the default in one chain.", de: "`.copied().unwrap_or(0)` konvertiert und liefert die Vorgabe in einer Kette." } ] }
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
