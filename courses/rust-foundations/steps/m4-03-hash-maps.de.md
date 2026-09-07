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
    title: "Du kannst die Gleichstandsregel erklären"
    check: { type: "question", prompt: { en: "best_team is specified to return the alphabetically smaller name on a tie. Explain why the test could not check the function reliably without that rule, and name one other place in a program where relying on a HashMap's iteration order would produce a bug that only appears sometimes.", de: "best_team soll bei Gleichstand den alphabetisch kleineren Namen liefern. Erkläre, warum der Test die Funktion ohne diese Regel nicht verlässlich prüfen könnte, und nenne eine weitere Stelle in einem Programm, an der das Vertrauen auf die Iterationsreihenfolge einer HashMap einen Fehler erzeugt, der nur manchmal auftritt." }, rubric: "Stellt fest, dass die Iterationsreihenfolge einer HashMap nicht festgelegt ist und zwischen Läufen wechselt (Rust setzt seinen Hasher zusätzlich zufällig auf), bei zwei gleichen Punktzahlen also jeder der beiden Namen herauskommen könnte und eine Zusicherung auf einen von beiden unzuverlässig wäre. Die zweite Hälfte gibt ein konkretes Beispiel - die Reihenfolge eines ausgegebenen Berichts, ein Hash über serialisierte Ausgabe, die Wahl eines ersten Elements oder der Vergleich zweier Läufe -, wo dieselbe Nichtdeterminiertheit zu einem nur manchmal auftretenden Fehlschlag wird. Besteht nicht: antworten, die Reihenfolge sei zufällig, ohne zu sagen, dass sie zwischen Läufen desselben Binärprogramms wechselt; oder ein zweites Beispiel, das wieder dieselbe unzuverlässige Testsituation ist statt einer anderen Stelle in einem Programm.", recallPrompt: { en: "Why can a test not rely on which of two equally scored names a HashMap yields first, and where else does that same non-determinism produce a failure that appears only sometimes?", de: "Warum kann sich ein Test nicht darauf verlassen, welchen von zwei gleich bewerteten Namen eine HashMap zuerst liefert, und wo sonst erzeugt dieselbe Nichtdeterminiertheit einen nur manchmal auftretenden Fehlschlag?" }, bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:order:failed", question: { en: "Run the map iteration twice in the same program. Now run the program twice. Which of the two changes?", de: "Iteriere zweimal im selben Programm über die Map. Nun starte das Programm zweimal. Was von beidem ändert sich?" }, hints: [ { en: "Rust seeds its default hasher randomly at process start, so the order is a property of the run, not of the code.", de: "Rust initialisiert seinen Standard-Hasher beim Prozessstart zufällig; die Reihenfolge ist also eine Eigenschaft des Laufs, nicht des Codes." }, { en: "Now ask what an assertion on the winner would do when two teams are level - and how often it would do it.", de: "Frage nun, was eine Zusicherung auf den Sieger täte, wenn zwei Mannschaften gleich stehen - und wie oft sie es täte." }, { en: "For the second half, look for somewhere else a program's output order is compared with something: a printed report, a hash of serialised output, a golden file.", de: "Suche für die zweite Hälfte eine andere Stelle, an der die Ausgabereihenfolge eines Programms mit etwas verglichen wird: ein ausgedruckter Bericht, ein Hash serialisierter Ausgabe, eine Golden-Datei." } ] }
  - { trigger: "task:maps:failed", question: { en: "Which one fails? For `add_score`, does your version overwrite the old score or add to it?", de: "Welche scheitert? Überschreibt deine Fassung von `add_score` den alten Punktestand oder addiert sie dazu?" }, hints: [ { en: "`*scores.entry(key).or_insert(0) += points` inserts a zero if the key is new and then adds in both cases.", de: "`*scores.entry(key).or_insert(0) += points` legt bei neuem Schlüssel eine Null an und addiert dann in beiden Fällen." }, { en: "`entry` needs an owned key, so convert the `&str` with `String::from(team)`.", de: "`entry` braucht einen besitzenden Schlüssel, wandle das `&str` also mit `String::from(team)` um." }, { en: "In `best_team`, compare scores first and only fall back to comparing names when they are equal.", de: "Vergleiche in `best_team` zuerst die Punktestände und ziehe die Namen nur bei Gleichstand heran." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]|error\\[E0499\\]", question: { en: "You are holding a reference into the map while changing it. Which value did you take out, and can you copy it instead of borrowing it?", de: "Du hältst eine Referenz in die Map, während du sie änderst. Welchen Wert hast du entnommen, und kannst du ihn kopieren statt zu leihen?" }, hints: [ { en: "`get` returns a reference into the map, which keeps the map borrowed; `.copied()` or `.cloned()` ends that.", de: "`get` liefert eine Referenz in die Map und hält sie damit geliehen; `.copied()` oder `.cloned()` beendet das." }, { en: "`entry` takes one mutable borrow and gives you a slot - do not hold a second reference alongside it.", de: "`entry` nimmt eine veränderliche Leihe und gibt dir einen Platz - halte daneben keine zweite Referenz." }, { en: "In `best_team`, remember the name as a clone at the end rather than keeping a `&String` across the loop and a later change.", de: "Merke dir den Namen in `best_team` am Ende als Klon, statt ein `&String` über die Schleife und eine spätere Änderung zu halten." } ] }
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "A key or value type does not line up. Is the map keyed by String while you handed it a &str, or the other way round?", de: "Ein Schlüssel- oder Werttyp passt nicht. Ist die Map mit String geschlüsselt, während du ein &str übergibst - oder umgekehrt?" }, hints: [ { en: "`get` accepts a `&str` for a `String`-keyed map, but `insert` and `entry` need an owned `String`.", de: "`get` akzeptiert bei einer `String`-geschlüsselten Map ein `&str`, `insert` und `entry` brauchen aber einen besitzenden `String`." }, { en: "`get` yields `Option<&V>`; the signature here promises `Option<V>` or a plain `V`.", de: "`get` liefert `Option<&V>`; die Signatur hier verspricht `Option<V>` oder ein blankes `V`." }, { en: "`.copied().unwrap_or(0)` converts and supplies the default in one chain.", de: "`.copied().unwrap_or(0)` konvertiert und liefert die Vorgabe in einer Kette." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Verknüpfe Schlüssel mit Werten, nutze die `entry`-API für Einfügen-oder-Aktualisieren in einem Ausdruck und behandle die Iterationsreihenfolge einer Hash-Map als die Nicht-Zusage, die sie ist.

Daneben zu halten ist `m4-01-vectors`: dieselbe Frage nach Besitz und Leihe beim Einfügen und Nachschlagen, nur ist der Schlüssel jetzt kein Index mehr.

## Nicht im Prelude

```rust
use std::collections::HashMap;

let mut scores = HashMap::new();
scores.insert(String::from("Blue"), 10);
```

`HashMap` braucht das `use`; `Vec` und `String` nicht. Alle Schlüssel haben einen Typ, alle Werte haben einen Typ, und beide liegen auf dem Heap.

## Ownership an der Tür

`insert` nimmt Schlüssel und Wert **per Wert**. Ein `String`-Schlüssel wird in die Map verschoben und gehört ihr fortan; die Variable, in der er lag, ist nicht mehr nutzbar. Das ist die Regel aus M1 ohne Ausnahme - und der Grund, warum `add_score` seinen `&str`-Parameter mit `String::from(team)` umwandeln muss, bevor es ihn übergibt.

Lesen ist das Gegenteil. `get` leiht:

```rust
scores.get("Blue")       // Option<&u32>
```

Beachte, dass es ein `&str` akzeptiert, obwohl der Schlüsseltyp `String` ist. Zurück kommt eine Referenz *in die Map*, die die Map geliehen hält, solange du sie hältst. `.copied()` macht aus `Option<&u32>` ein `Option<u32>` und beendet die Leihe - was `score_of` braucht, um einen Wert zurückzugeben und den Aufrufer weiter ändern zu lassen.

## Das entry-Idiom

Der Grund, Hash-Maps gründlich zu lernen, ist diese eine Zeile:

```rust
*counts.entry(word).or_insert(0) += 1;
```

`entry(key)` liefert einen `Entry` - den Platz für diesen Schlüssel, ob belegt oder nicht. `or_insert(0)` legt dort eine Null an, falls er leer war, und gibt in beiden Fällen ein `&mut` auf den Wert zurück. Das `*` schreibt hindurch. Das gesamte Einfügen-oder-Aktualisieren ist eine Leihe, ein Nachschlagen und eine Zeile, und es gibt keine Verzweigung, die man falsch machen kann.

`word_counts` ist genau das über `text.split_whitespace()`. `add_score` ist dieselbe Form mit `+= points`.

## Iterationsreihenfolge gibt es nicht

```rust
for (name, score) in &scores { … }
```

Die Reihenfolge ist nicht festgelegt, und Rust initialisiert seinen Standard-Hasher absichtlich zufällig - eine Abwehr gegen Angriffe auf die algorithmische Komplexität. Geh einen Schritt weiter, bevor du die Frage unten beantwortest: wenn die Initialisierung sich unterscheidet, was unterscheidet sich dann zwischen zwei Läufen **desselben** Binaries, und was folgt daraus für Code, dessen Ausgabe von der Reihenfolge abhängt?

`best_team` ist genau deshalb mit einer Gleichstandsregel auf dem Namen spezifiziert: bei zwei Mannschaften mit 30 Punkten und ohne Regel wäre die Antwort ein Münzwurf, und der Test könnte nichts zusichern. Brauchst du eine Reihenfolge, sortierst du ausdrücklich - das ist der nächste Step.

## Deine Aufgabe

Implementiere die vier Funktionen und erkläre dann, warum die Gleichstandsregel keine Verzierung ist. Der nächste Step kombiniert alle drei Sammlungen und legt eine Ordnung auf die Ausgabe.

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

::: do command="cargo test --test m4-03-hash-maps" cwd="."
Führe die Tests dieses Steps aus. Derselbe Befehl steckt hinter dem Knopf **Prüfen** an der Aufgabe *Die vier Hash-Map-Funktionen bestehen*.
> expect: Je Test eine Zeile `test … ok` oder `… FAILED`, darunter die Zusammenfassung `test result: ok. 5 passed; 0 failed`, sobald alle 5 bestehen. Der erste Lauf braucht ein paar Sekunden, weil die Crate einmal übersetzt wird; jeder weitere bleibt deutlich unter einer Sekunde.
> recover: Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - hole es nach. Meldet es `no test target named`, stimmt der Name hinter `--test` nicht; `ls tests/` listet die gültigen Namen auf.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
