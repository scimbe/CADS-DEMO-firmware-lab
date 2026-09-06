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
    title: "Du kannst den Sortierschlüssel verteidigen"
    check: { type: "question", prompt: { en: "top_n sorts by count descending and then by word ascending. Explain what would go wrong with only the first half of that key, and why sorting a Vec built from the map is the right answer rather than looking for a HashMap that keeps its order.", de: "top_n sortiert nach Anzahl absteigend und danach nach Wort aufsteigend. Erkläre, was mit nur der ersten Hälfte dieses Schlüssels schiefginge, und warum das Sortieren eines aus der Map gebauten Vec die richtige Antwort ist statt der Suche nach einer HashMap, die ihre Reihenfolge behält." }, rubric: "Stellt fest, dass bei gleichen Anzahlen die relative Reihenfolge aus der beliebigen Iterationsreihenfolge der Map käme, die Ausgabe also zwischen Läufen wechselte und der Test unzuverlässig würde. Die zweite Hälfte hält fest, dass die Aufgabe der Map das Nachschlagen ist und nicht die Reihenfolge, und dass ein materialisierter und sortierter Vec die Ordnung ausdrücklich und prüfbar macht - gern mit BTreeMap als Alternative, wenn Schlüssel stets geordnet sein müssen, samt deren eigenen Kosten. Besteht nicht: nur sagen, die Ausgabe wäre unsortiert; oder eine sortierte Map vorschlagen, ohne zu nennen, was sie kostet.", bloom: "evaluate", minChars: 70 }
socratic:
  - { trigger: "task:determinism:failed", question: { en: "Two words share a count. Which of them comes first, and who decided that?", de: "Zwei Wörter haben dieselbe Anzahl. Welches kommt zuerst, und wer hat das entschieden?" }, hints: [ { en: "With only the count in the sort key, the comparison returns Equal for those two, and sort_by leaves Equal pairs in the order it received them.", de: "Steht nur die Anzahl im Sortierschlüssel, liefert der Vergleich für diese beiden Equal, und sort_by belässt Equal-Paare in der empfangenen Reihenfolge." }, { en: "The order it received them in came from iterating the map. Ask what m4-03 said about that order.", de: "Die empfangene Reihenfolge stammt aus der Iteration über die Map. Frage, was m4-03 über diese Reihenfolge sagte." }, { en: "For the second half: a map that keeps its keys ordered exists, and it is not a HashMap - name what you would pay for it on every insert and lookup.", de: "Zur zweiten Hälfte: eine Map, die ihre Schlüssel geordnet hält, gibt es, und sie ist keine HashMap - benenne, was du bei jedem Einfügen und Nachschlagen dafür zahlst." } ] }
  - { trigger: "task:report:failed", question: { en: "Which one fails? For `top_n`, is your comparison sorting counts the right way round, and does the tie-break use the word ascending?", de: "Welche scheitert? Sortiert dein Vergleich in `top_n` die Anzahlen in der richtigen Richtung, und nutzt die Gleichstandsregel das Wort aufsteigend?" }, hints: [ { en: "`b.1.cmp(&a.1)` is descending by count; `.then(a.0.cmp(&b.0))` appends the ascending word as a tie-break.", de: "`b.1.cmp(&a.1)` sortiert absteigend nach Anzahl; `.then(a.0.cmp(&b.0))` hängt das aufsteigende Wort als Gleichstandsregel an." }, { en: "`truncate(n)` after sorting is simpler than trying to keep only n during the sort, and handles a map smaller than n by itself.", de: "`truncate(n)` nach dem Sortieren ist einfacher, als während des Sortierens nur n zu behalten, und behandelt eine Map kleiner als n von selbst." }, { en: "`entry(initial).or_default().push(...)` builds a `Vec` per key without a branch for the first word.", de: "`entry(initial).or_default().push(...)` baut je Schlüssel einen `Vec`, ohne für das erste Wort zu verzweigen." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]|error\\[E0499\\]", question: { en: "A borrow of the map overlaps a change to it. Are you iterating over the map while inserting into it?", de: "Eine Leihe der Map überlappt eine Änderung daran. Iterierst du über die Map, während du hineinfügst?" }, hints: [ { en: "Collect the keys you need into a `Vec` first, then iterate over that while touching the map.", de: "Sammle die nötigen Schlüssel zuerst in einen `Vec` und iteriere dann darüber, während du die Map anfasst." }, { en: "In `format_groups`, `groups.keys().copied().collect()` gives an owned `Vec<char>` you can sort freely.", de: "In `format_groups` liefert `groups.keys().copied().collect()` einen besitzenden `Vec<char>`, den du frei sortieren kannst." }, { en: "`entry(...).or_default()` holds exactly one mutable borrow; do not keep a `get` result alive next to it.", de: "`entry(...).or_default()` hält genau eine veränderliche Leihe; halte daneben kein Ergebnis von `get` am Leben." } ] }
  - { pattern: "error\\[E0282\\]|type annotations needed", question: { en: "The compiler cannot infer a type for a collection you are building. Which one, and where would the annotation naturally go?", de: "Der Compiler kann für eine Sammlung, die du baust, keinen Typ herleiten. Welche, und wohin gehörte die Annotation natürlicherweise?" }, hints: [ { en: "`collect()` can produce many types; annotate the binding, as in `let entries: Vec<(String, usize)> = …`.", de: "`collect()` kann viele Typen erzeugen; annotiere die Bindung, etwa `let entries: Vec<(String, usize)> = …`." }, { en: "`HashMap::new()` on its own line needs the key and value types unless a later insert pins them.", de: "`HashMap::new()` in einer eigenen Zeile braucht Schlüssel- und Werttyp, sofern ein späteres insert sie nicht festlegt." }, { en: "The turbofish `collect::<Vec<_>>()` is the alternative when annotating the binding is awkward.", de: "Der Turbofish `collect::<Vec<_>>()` ist die Alternative, wenn eine Annotation an der Bindung unhandlich wäre." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Kombiniere `Vec`, `String` und `HashMap` zu einer kleinen Auswertungskette und mache ihre Ausgabe absichtlich deterministisch.

## Die Form der Kette

Drei Funktionen, drei Aufgaben, und zusammen sind sie die Form der meisten Auswertungscodes:

1. `group_by_initial` - eine Map von einem Schlüssel auf eine **Liste**. `HashMap<char, Vec<String>>` ist ein völlig gewöhnlicher Typ; der Wert ist eben eine Sammlung.
2. `top_n` - aus der Map eine Rangliste machen.
3. `format_groups` - aus einer Map Text machen, den ein Mensch liest.

## Eine Map, deren Werte Vektoren sind

```rust
groups.entry(initial).or_default().push(String::from(*word));
```

`or_default()` ist die kürzere Schreibweise von `or_insert_with(Vec::new)`: ist der Schlüssel neu, füge die Vorgabe des Typs ein - einen leeren `Vec` - und gib in beiden Fällen ein `&mut Vec<String>` zum Anhängen zurück. Ein Ausdruck, keine Verzweigung für "erstes Wort mit diesem Buchstaben", eine Leihe der Map.

Das erste Zeichen zu holen ist die Lektion aus M4 angewandt: `word.chars().next()` liefert `Option<char>`, und `let ... else { continue; }` aus M3 überspringt die leeren Wörter ohne Verschachtelung.

## Eine Rangfolge verlässt die Map

Eine geordnete `HashMap` gibt es nicht. Für eine Rangfolge holst du die Einträge in einen `Vec` und sortierst ihn:

```rust
let mut entries: Vec<(String, usize)> = counts.iter().map(|(w, c)| (w.clone(), *c)).collect();
entries.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
entries.truncate(n);
```

Drei Dinge lohnen die Benennung. `collect()` muss wissen, was es bauen soll, die Bindung ist also annotiert - ohne sie erhältst du `type annotations needed`. `b.1.cmp(&a.1)` sortiert absteigend, weil die Argumente vertauscht sind. Und `.then(...)` hängt einen zweiten Vergleich an, der nur bei `Equal` benutzt wird - die Gleichstandsregel.

Nur nach Anzahl zu sortieren wäre falsch, nicht bloß ungeprüft: Wörter gleicher Häufigkeit kämen in der willkürlichen Reihenfolge der Map heraus, in verschiedenen Läufen verschieden. `truncate(n)` nach dem Sortieren behandelt sowohl ein `n` größer als die Map als auch `n = 0` ohne Sonderfall.

## Formatieren

`format_groups` sortiert die Schlüssel, verbindet die Wörter jeder Gruppe mit `", "` und die Zeilen mit `'\n'`. `join` auf einem `Vec<String>` erledigt die innere Hälfte; die Zeilen in einen `Vec<String>` zu sammeln und erneut zu verbinden die äußere. Die Zeichenkette mit `push_str` in einer Schleife zu bauen geht auch und kostet dich ein abschließendes Trennzeichen zum Abschneiden.

## Deine Aufgabe

Implementiere die drei Funktionen und verteidige dann den zweiteiligen Sortierschlüssel. Modul M5 behandelt, was zu tun ist, wenn die Eingabe nicht die erwartete ist - was das Abschlussprojekt brauchen wird.

## So führst du das aus

::: do palette="> Terminal: Create New Terminal"
Öffne ein Terminal: **F1** drücken, den Eintrag samt dem vorangestellten `>` tippen, Eingabetaste. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.
> expect: Unten öffnet sich der Bereich mit dem Reiter **Terminal**, und die Eingabeaufforderung endet auf `~/workspace`.
> recover: Steht in der Palette *No matching results*, fehlt das `>` und sie sucht nach einer Datei dieses Namens - tippe es voran und wiederhole die Eingabe. Über das Menü geht es ebenso: **Terminal → Neues Terminal**.
:::

Das Terminal startet in `~/workspace`, dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle einmal je Terminal in die Crate:

```bash
cd ~/workspace/rust-foundations
```

::: do command="cargo test --test m4-04-collections-report" cwd="."
Führe die Tests dieses Steps aus. Derselbe Befehl steckt hinter dem Knopf **Prüfen** an der Aufgabe *Gruppieren, Rangfolge und Formatierung bestehen*.
> expect: Je Test eine Zeile `test … ok` oder `… FAILED`, darunter die Zusammenfassung `test result: ok. 4 passed; 0 failed`, sobald alle 4 bestehen. Der erste Lauf braucht ein paar Sekunden, weil die Crate einmal übersetzt wird; jeder weitere bleibt deutlich unter einer Sekunde.
> recover: Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - hole es nach. Meldet es `no test target named`, stimmt der Name hinter `--test` nicht; `ls tests/` listet die gültigen Namen auf.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
