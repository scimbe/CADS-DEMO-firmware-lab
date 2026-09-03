---
id: m4-03-hash-maps
title: "Hash-Maps und das entry-Idiom"
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
    title: "Die vier Hash-Map-Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m4-03-hash-maps", expectPass: [ "m4_03_hash_maps::word_counts_counts_occurrences", "m4_03_hash_maps::word_counts_of_empty_text", "m4_03_hash_maps::score_of_defaults_to_zero", "m4_03_hash_maps::add_score_inserts_and_accumulates", "m4_03_hash_maps::best_team_breaks_ties_alphabetically" ], minPass: 5, timeoutMs: 180000 }
  - id: order
    title: "Du kannst die Gleichstandsregel erklaeren"
    check: { type: "question", prompt: { en: "best_team is specified to return the alphabetically smaller name on a tie. Explain why the test could not check the function reliably without that rule, and name one other place in a program where relying on a HashMap's iteration order would produce a bug that only appears sometimes.", de: "best_team soll bei Gleichstand den alphabetisch kleineren Namen liefern. Erklaere, warum der Test die Funktion ohne diese Regel nicht verlaesslich pruefen koennte, und nenne eine weitere Stelle in einem Programm, an der das Vertrauen auf die Iterationsreihenfolge einer HashMap einen Fehler erzeugt, der nur manchmal auftritt." }, rubric: "States that HashMap iteration order is unspecified and varies between runs (Rust additionally seeds its hasher randomly), so with two equal scores either name could come out and an assertion on one of them would be flaky. The second half should give a concrete example - printed report ordering, a hash of serialised output, choosing a 'first' element, or comparing two runs - where the same non-determinism turns into an intermittent failure.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:maps:failed", question: { en: "Which one fails? For `add_score`, does your version overwrite the old score or add to it?", de: "Welche scheitert? Ueberschreibt deine Fassung von `add_score` den alten Punktestand oder addiert sie dazu?" }, hints: [ { en: "`*scores.entry(key).or_insert(0) += points` inserts a zero if the key is new and then adds in both cases.", de: "`*scores.entry(key).or_insert(0) += points` legt bei neuem Schluessel eine Null an und addiert dann in beiden Faellen." }, { en: "`entry` needs an owned key, so convert the `&str` with `String::from(team)`.", de: "`entry` braucht einen besitzenden Schluessel, wandle das `&str` also mit `String::from(team)` um." }, { en: "In `best_team`, compare scores first and only fall back to comparing names when they are equal.", de: "Vergleiche in `best_team` zuerst die Punktestaende und ziehe die Namen nur bei Gleichstand heran." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]|error\\[E0499\\]", question: { en: "You are holding a reference into the map while changing it. Which value did you take out, and can you copy it instead of borrowing it?", de: "Du haeltst eine Referenz in die Map, waehrend du sie aenderst. Welchen Wert hast du entnommen, und kannst du ihn kopieren statt zu leihen?" }, hints: [ { en: "`get` returns a reference into the map, which keeps the map borrowed; `.copied()` or `.cloned()` ends that.", de: "`get` liefert eine Referenz in die Map und haelt sie damit geliehen; `.copied()` oder `.cloned()` beendet das." }, { en: "`entry` takes one mutable borrow and gives you a slot - do not hold a second reference alongside it.", de: "`entry` nimmt eine veraenderliche Leihe und gibt dir einen Platz - halte daneben keine zweite Referenz." }, { en: "In `best_team`, remember the name as a clone at the end rather than keeping a `&String` across the loop and a later change.", de: "Merke dir den Namen in `best_team` am Ende als Klon, statt ein `&String` ueber die Schleife und eine spaetere Aenderung zu halten." } ] }
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "A key or value type does not line up. Is the map keyed by String while you handed it a &str, or the other way round?", de: "Ein Schluessel- oder Werttyp passt nicht. Ist die Map mit String geschluesselt, waehrend du ein &str uebergibst - oder umgekehrt?" }, hints: [ { en: "`get` accepts a `&str` for a `String`-keyed map, but `insert` and `entry` need an owned `String`.", de: "`get` akzeptiert bei einer `String`-geschluesselten Map ein `&str`, `insert` und `entry` brauchen aber einen besitzenden `String`." }, { en: "`get` yields `Option<&V>`; the signature here promises `Option<V>` or a plain `V`.", de: "`get` liefert `Option<&V>`; die Signatur hier verspricht `Option<V>` oder ein blankes `V`." }, { en: "`.copied().unwrap_or(0)` converts and supplies the default in one chain.", de: "`.copied().unwrap_or(0)` konvertiert und liefert die Vorgabe in einer Kette." } ] }
---
## Lernziel

Verknuepfe Schluessel mit Werten, nutze die `entry`-API fuer Einfuegen-oder-Aktualisieren in einem Ausdruck und behandle die Iterationsreihenfolge einer Hash-Map als die Nicht-Zusage, die sie ist.

## Nicht im Prelude

```rust
use std::collections::HashMap;

let mut scores = HashMap::new();
scores.insert(String::from("Blue"), 10);
```

`HashMap` braucht das `use`; `Vec` und `String` nicht. Alle Schluessel haben einen Typ, alle Werte haben einen Typ, und beide liegen auf dem Heap.

## Ownership an der Tuer

`insert` nimmt Schluessel und Wert **per Wert**. Ein `String`-Schluessel wird in die Map verschoben und gehoert ihr fortan; die Variable, in der er lag, ist nicht mehr nutzbar. Das ist die Regel aus M1 ohne Ausnahme - und der Grund, warum `add_score` seinen `&str`-Parameter mit `String::from(team)` umwandeln muss, bevor es ihn uebergibt.

Lesen ist das Gegenteil. `get` leiht:

```rust
scores.get("Blue")       // Option<&u32>
```

Beachte, dass es ein `&str` akzeptiert, obwohl der Schluesseltyp `String` ist. Zurueck kommt eine Referenz *in die Map*, die die Map geliehen haelt, solange du sie haeltst. `.copied()` macht aus `Option<&u32>` ein `Option<u32>` und beendet die Leihe - was `score_of` braucht, um einen Wert zurueckzugeben und den Aufrufer weiter aendern zu lassen.

## Das entry-Idiom

Der Grund, Hash-Maps gruendlich zu lernen, ist diese eine Zeile:

```rust
*counts.entry(word).or_insert(0) += 1;
```

`entry(key)` liefert einen `Entry` - den Platz fuer diesen Schluessel, ob belegt oder nicht. `or_insert(0)` legt dort eine Null an, falls er leer war, und gibt in beiden Faellen ein `&mut` auf den Wert zurueck. Das `*` schreibt hindurch. Das gesamte Einfuegen-oder-Aktualisieren ist eine Leihe, ein Nachschlagen und eine Zeile, und es gibt keine Verzweigung, die man falsch machen kann.

`word_counts` ist genau das ueber `text.split_whitespace()`. `add_score` ist dieselbe Form mit `+= points`.

## Iterationsreihenfolge gibt es nicht

```rust
for (name, score) in &scores { … }
```

Die Reihenfolge ist nicht festgelegt, und Rust initialisiert seinen Standard-Hasher absichtlich zufaellig, sie aendert sich also auch zwischen Laeufen desselben Binaries. Das ist eine Abwehr gegen Angriffe auf die algorithmische Komplexitaet, und es bedeutet: jeder Code, dessen Ausgabe von der Reihenfolge abhaengt, ist nichtdeterministisch - ein Test, der lokal besteht und in der CI scheitert, oder umgekehrt.

`best_team` ist genau deshalb mit einer Gleichstandsregel auf dem Namen spezifiziert: bei zwei Mannschaften mit 30 Punkten und ohne Regel waere die Antwort ein Muenzwurf, und der Test koennte nichts zusichern. Brauchst du eine Reihenfolge, sortierst du ausdruecklich - das ist der naechste Step.

## Deine Aufgabe

Implementiere die vier Funktionen und erklaere dann, warum die Gleichstandsregel keine Verzierung ist. Der naechste Step kombiniert alle drei Sammlungen und legt eine Ordnung auf die Ausgabe.
