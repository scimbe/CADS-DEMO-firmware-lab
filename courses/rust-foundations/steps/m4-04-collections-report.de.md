---
id: m4-04-collections-report
title: "Die drei Sammlungen im Zusammenspiel"
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
    title: "Gruppieren, Rangfolge und Formatierung bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m4-04-collections-report", expectPass: [ "m4_04_collections_report::group_by_initial_keeps_input_order", "m4_04_collections_report::top_n_sorts_by_count_then_word", "m4_04_collections_report::top_n_returns_what_there_is", "m4_04_collections_report::format_groups_is_sorted_by_initial" ], minPass: 4, timeoutMs: 180000 }
  - id: determinism
    title: "Du kannst den Sortierschluessel verteidigen"
    check: { type: "question", prompt: { en: "top_n sorts by count descending and then by word ascending. Explain what would go wrong with only the first half of that key, and why sorting a Vec built from the map is the right answer rather than looking for a HashMap that keeps its order.", de: "top_n sortiert nach Anzahl absteigend und danach nach Wort aufsteigend. Erklaere, was mit nur der ersten Haelfte dieses Schluessels schiefginge, und warum das Sortieren eines aus der Map gebauten Vec die richtige Antwort ist statt der Suche nach einer HashMap, die ihre Reihenfolge behaelt." }, rubric: "States that with equal counts the relative order would come from the map's arbitrary iteration order, so the output would vary between runs and the test would be flaky. The second half should note that the map's job is lookup, not order, and that materialising a Vec and sorting it makes the ordering explicit and testable - optionally mentioning BTreeMap as the alternative when keys must always be ordered, with its own cost.", bloom: "evaluate", minChars: 70 }
socratic:
  - { trigger: "task:report:failed", question: { en: "Which one fails? For `top_n`, is your comparison sorting counts the right way round, and does the tie-break use the word ascending?", de: "Welche scheitert? Sortiert dein Vergleich in `top_n` die Anzahlen in der richtigen Richtung, und nutzt die Gleichstandsregel das Wort aufsteigend?" }, hints: [ { en: "`b.1.cmp(&a.1)` is descending by count; `.then(a.0.cmp(&b.0))` appends the ascending word as a tie-break.", de: "`b.1.cmp(&a.1)` sortiert absteigend nach Anzahl; `.then(a.0.cmp(&b.0))` haengt das aufsteigende Wort als Gleichstandsregel an." }, { en: "`truncate(n)` after sorting is simpler than trying to keep only n during the sort, and handles a map smaller than n by itself.", de: "`truncate(n)` nach dem Sortieren ist einfacher, als waehrend des Sortierens nur n zu behalten, und behandelt eine Map kleiner als n von selbst." }, { en: "`entry(initial).or_default().push(...)` builds a `Vec` per key without a branch for the first word.", de: "`entry(initial).or_default().push(...)` baut je Schluessel einen `Vec`, ohne fuer das erste Wort zu verzweigen." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]|error\\[E0499\\]", question: { en: "A borrow of the map overlaps a change to it. Are you iterating over the map while inserting into it?", de: "Eine Leihe der Map ueberlappt eine Aenderung daran. Iterierst du ueber die Map, waehrend du hineinfuegst?" }, hints: [ { en: "Collect the keys you need into a `Vec` first, then iterate over that while touching the map.", de: "Sammle die noetigen Schluessel zuerst in einen `Vec` und iteriere dann darueber, waehrend du die Map anfasst." }, { en: "In `format_groups`, `groups.keys().copied().collect()` gives an owned `Vec<char>` you can sort freely.", de: "In `format_groups` liefert `groups.keys().copied().collect()` einen besitzenden `Vec<char>`, den du frei sortieren kannst." }, { en: "`entry(...).or_default()` holds exactly one mutable borrow; do not keep a `get` result alive next to it.", de: "`entry(...).or_default()` haelt genau eine veraenderliche Leihe; halte daneben kein Ergebnis von `get` am Leben." } ] }
  - { pattern: "error\\[E0282\\]|type annotations needed", question: { en: "The compiler cannot infer a type for a collection you are building. Which one, and where would the annotation naturally go?", de: "Der Compiler kann fuer eine Sammlung, die du baust, keinen Typ herleiten. Welche, und wohin gehoerte die Annotation natuerlicherweise?" }, hints: [ { en: "`collect()` can produce many types; annotate the binding, as in `let entries: Vec<(String, usize)> = …`.", de: "`collect()` kann viele Typen erzeugen; annotiere die Bindung, etwa `let entries: Vec<(String, usize)> = …`." }, { en: "`HashMap::new()` on its own line needs the key and value types unless a later insert pins them.", de: "`HashMap::new()` in einer eigenen Zeile braucht Schluessel- und Werttyp, sofern ein spaeteres insert sie nicht festlegt." }, { en: "The turbofish `collect::<Vec<_>>()` is the alternative when annotating the binding is awkward.", de: "Der Turbofish `collect::<Vec<_>>()` ist die Alternative, wenn eine Annotation an der Bindung unhandlich waere." } ] }
---
## Lernziel

Kombiniere `Vec`, `String` und `HashMap` zu einer kleinen Auswertungskette und mache ihre Ausgabe absichtlich deterministisch.

## Die Form der Kette

Drei Funktionen, drei Aufgaben, und zusammen sind sie die Form der meisten Auswertungscodes:

1. `group_by_initial` - eine Map von einem Schluessel auf eine **Liste**. `HashMap<char, Vec<String>>` ist ein voellig gewoehnlicher Typ; der Wert ist eben eine Sammlung.
2. `top_n` - aus der Map eine Rangliste machen.
3. `format_groups` - aus einer Map Text machen, den ein Mensch liest.

## Eine Map, deren Werte Vektoren sind

```rust
groups.entry(initial).or_default().push(String::from(*word));
```

`or_default()` ist die kuerzere Schreibweise von `or_insert_with(Vec::new)`: ist der Schluessel neu, fuege die Vorgabe des Typs ein - einen leeren `Vec` - und gib in beiden Faellen ein `&mut Vec<String>` zum Anhaengen zurueck. Ein Ausdruck, keine Verzweigung fuer "erstes Wort mit diesem Buchstaben", eine Leihe der Map.

Das erste Zeichen zu holen ist die Lektion aus M4 angewandt: `word.chars().next()` liefert `Option<char>`, und `let ... else { continue; }` aus M3 ueberspringt die leeren Woerter ohne Verschachtelung.

## Eine Rangfolge verlaesst die Map

Eine geordnete `HashMap` gibt es nicht. Fuer eine Rangfolge holst du die Eintraege in einen `Vec` und sortierst ihn:

```rust
let mut entries: Vec<(String, usize)> = counts.iter().map(|(w, c)| (w.clone(), *c)).collect();
entries.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
entries.truncate(n);
```

Drei Dinge lohnen die Benennung. `collect()` muss wissen, was es bauen soll, die Bindung ist also annotiert - ohne sie erhaeltst du `type annotations needed`. `b.1.cmp(&a.1)` sortiert absteigend, weil die Argumente vertauscht sind. Und `.then(...)` haengt einen zweiten Vergleich an, der nur bei `Equal` benutzt wird - die Gleichstandsregel.

Nur nach Anzahl zu sortieren waere falsch, nicht bloss ungeprueft: Woerter gleicher Haeufigkeit kaemen in der willkuerlichen Reihenfolge der Map heraus, in verschiedenen Laeufen verschieden. `truncate(n)` nach dem Sortieren behandelt sowohl ein `n` groesser als die Map als auch `n = 0` ohne Sonderfall.

## Formatieren

`format_groups` sortiert die Schluessel, verbindet die Woerter jeder Gruppe mit `", "` und die Zeilen mit `'\n'`. `join` auf einem `Vec<String>` erledigt die innere Haelfte; die Zeilen in einen `Vec<String>` zu sammeln und erneut zu verbinden die aeussere. Die Zeichenkette mit `push_str` in einer Schleife zu bauen geht auch und kostet dich ein abschliessendes Trennzeichen zum Abschneiden.

## Deine Aufgabe

Implementiere die drei Funktionen und verteidige dann den zweiteiligen Sortierschluessel. Modul M5 behandelt, was zu tun ist, wenn die Eingabe nicht die erwartete ist - was das Abschlussprojekt brauchen wird.
