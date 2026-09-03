---
id: m4-04-collections-report
title: "The three collections together"
bloom: analyze
objectives: [ "rust-ch08-01-vectors", "rust-ch08-02-strings", "rust-ch08-03-hash-maps" ]
requires: [ "m4-03-hash-maps" ]
estimatedMinutes: 30
scaffold: independent
recallFrom: [ "m4-03-hash-maps", "m4-01-vectors" ]
links:
  - { step: "m5-01-panic-vs-result" }
  - { file: "src/m4/m4_04_report.rs" }
  - { file: "tests/m4-04-collections-report.rs" }
  - { url: "https://doc.rust-lang.org/book/ch08-01-vectors.html", title: "The Book, 8.1: Storing Lists of Values with Vectors" }
sources: [ "src/m4/m4_04_report.rs", "tests/m4-04-collections-report.rs", "src/m4/m4_03_hash_maps.rs" ]
tasks:
  - id: report
    title: "Grouping, ranking and formatting pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m4-04-collections-report", expectPass: [ "m4_04_collections_report::group_by_initial_keeps_input_order", "m4_04_collections_report::top_n_sorts_by_count_then_word", "m4_04_collections_report::top_n_returns_what_there_is", "m4_04_collections_report::format_groups_is_sorted_by_initial" ], minPass: 4, timeoutMs: 180000 }
  - id: determinism
    title: "You can defend the sort key"
    check: { type: "question", prompt: { en: "top_n sorts by count descending and then by word ascending. Explain what would go wrong with only the first half of that key, and why sorting a Vec built from the map is the right answer rather than looking for a HashMap that keeps its order.", de: "top_n sortiert nach Anzahl absteigend und danach nach Wort aufsteigend. Erkläre, was mit nur der ersten Hälfte dieses Schlüssels schiefginge, und warum das Sortieren eines aus der Map gebauten Vec die richtige Antwort ist statt der Suche nach einer HashMap, die ihre Reihenfolge behält." }, rubric: "States that with equal counts the relative order would come from the map's arbitrary iteration order, so the output would vary between runs and the test would be flaky. The second half should note that the map's job is lookup, not order, and that materialising a Vec and sorting it makes the ordering explicit and testable - optionally mentioning BTreeMap as the alternative when keys must always be ordered, with its own cost.", bloom: "evaluate", minChars: 70 }
socratic:
  - { trigger: "task:report:failed", question: { en: "Which one fails? For `top_n`, is your comparison sorting counts the right way round, and does the tie-break use the word ascending?", de: "Welche scheitert? Sortiert dein Vergleich in `top_n` die Anzahlen in der richtigen Richtung, und nutzt die Gleichstandsregel das Wort aufsteigend?" }, hints: [ { en: "`b.1.cmp(&a.1)` is descending by count; `.then(a.0.cmp(&b.0))` appends the ascending word as a tie-break.", de: "`b.1.cmp(&a.1)` sortiert absteigend nach Anzahl; `.then(a.0.cmp(&b.0))` hängt das aufsteigende Wort als Gleichstandsregel an." }, { en: "`truncate(n)` after sorting is simpler than trying to keep only n during the sort, and handles a map smaller than n by itself.", de: "`truncate(n)` nach dem Sortieren ist einfacher, als während des Sortierens nur n zu behalten, und behandelt eine Map kleiner als n von selbst." }, { en: "`entry(initial).or_default().push(...)` builds a `Vec` per key without a branch for the first word.", de: "`entry(initial).or_default().push(...)` baut je Schlüssel einen `Vec`, ohne für das erste Wort zu verzweigen." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]|error\\[E0499\\]", question: { en: "A borrow of the map overlaps a change to it. Are you iterating over the map while inserting into it?", de: "Eine Leihe der Map überlappt eine Änderung daran. Iterierst du über die Map, während du hineinfügst?" }, hints: [ { en: "Collect the keys you need into a `Vec` first, then iterate over that while touching the map.", de: "Sammle die nötigen Schlüssel zuerst in einen `Vec` und iteriere dann darüber, während du die Map anfasst." }, { en: "In `format_groups`, `groups.keys().copied().collect()` gives an owned `Vec<char>` you can sort freely.", de: "In `format_groups` liefert `groups.keys().copied().collect()` einen besitzenden `Vec<char>`, den du frei sortieren kannst." }, { en: "`entry(...).or_default()` holds exactly one mutable borrow; do not keep a `get` result alive next to it.", de: "`entry(...).or_default()` hält genau eine veränderliche Leihe; halte daneben kein Ergebnis von `get` am Leben." } ] }
  - { pattern: "error\\[E0282\\]|type annotations needed", question: { en: "The compiler cannot infer a type for a collection you are building. Which one, and where would the annotation naturally go?", de: "Der Compiler kann für eine Sammlung, die du baust, keinen Typ herleiten. Welche, und wohin gehörte die Annotation natürlicherweise?" }, hints: [ { en: "`collect()` can produce many types; annotate the binding, as in `let entries: Vec<(String, usize)> = …`.", de: "`collect()` kann viele Typen erzeugen; annotiere die Bindung, etwa `let entries: Vec<(String, usize)> = …`." }, { en: "`HashMap::new()` on its own line needs the key and value types unless a later insert pins them.", de: "`HashMap::new()` in einer eigenen Zeile braucht Schlüssel- und Werttyp, sofern ein späteres insert sie nicht festlegt." }, { en: "The turbofish `collect::<Vec<_>>()` is the alternative when annotating the binding is awkward.", de: "Der Turbofish `collect::<Vec<_>>()` ist die Alternative, wenn eine Annotation an der Bindung unhandlich wäre." } ] }
---
## Learning goal

Combine `Vec`, `String` and `HashMap` into a small reporting pipeline, and make its output deterministic on purpose.

## The shape of the pipeline

Three functions, three jobs, and together they are the shape of most reporting code:

1. `group_by_initial` - a map from a key to a **list**. `HashMap<char, Vec<String>>` is a perfectly ordinary type; the value happens to be a collection.
2. `top_n` - turn the map into a ranked list.
3. `format_groups` - turn a map into text a human reads.

## A map whose values are vectors

```rust
groups.entry(initial).or_default().push(String::from(*word));
```

`or_default()` is `or_insert_with(Vec::new)` spelled shorter: if the key is new, insert the type's default - an empty `Vec` - and either way hand back a `&mut Vec<String>` to push onto. One expression, no branch for "first word with this letter", and one borrow of the map.

Getting the first character is the M4 lesson applied: `word.chars().next()` gives `Option<char>`, and `let ... else { continue; }` from M3 skips the empty words without nesting.

## Ranking means leaving the map

There is no ordered `HashMap`. To rank, you materialise the entries into a `Vec` and sort it:

```rust
let mut entries: Vec<(String, usize)> = counts.iter().map(|(w, c)| (w.clone(), *c)).collect();
entries.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
entries.truncate(n);
```

Three things worth naming. `collect()` needs to know what to build, so the binding is annotated - without it you get `type annotations needed`. `b.1.cmp(&a.1)` is descending because the arguments are the other way round. And `.then(...)` chains a second comparison used only when the first is `Equal`, which is the tie-break.

Sorting by count alone would be wrong, not merely untested: words with equal counts would come out in the map's arbitrary order, differently on different runs. `truncate(n)` after sorting handles both `n` larger than the map and `n = 0` without a special case.

## Formatting

`format_groups` sorts the keys, joins each group's words with `", "` and the lines with `'\n'`. `join` on a `Vec<String>` does the inner half; collecting the lines into a `Vec<String>` and joining again does the outer half. Building the string with `push_str` in a loop works too, and costs you a trailing separator to trim.

## Your task

Implement the three functions, then defend the two-part sort key. Module M5 is about what to do when the input is not what you expected - which is what the final project will need.
