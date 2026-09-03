---
id: m4-01-vectors
title: "Vektoren: eine wachsende Liste"
bloom: apply
objectives: [ "rust-ch08-01-vectors" ]
requires: [ "m3-04-if-let" ]
estimatedMinutes: 20
scaffold: worked
recallFrom: [ "m2-03-aliasing-rule" ]
links:
  - { step: "m4-02-strings" }
  - { file: "src/m4/m4_01_vectors.rs" }
  - { file: "tests/m4-01-vectors.rs" }
  - { url: "https://doc.rust-lang.org/book/ch08-01-vectors.html", title: "The Book, 8.1: Storing Lists of Values with Vectors" }
sources: [ "src/m4/m4_01_vectors.rs", "tests/m4-01-vectors.rs", "src/m2/m2_04_slices.rs" ]
tasks:
  - id: vectors
    title: "Die fünf Vektor-Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m4-01-vectors", expectPass: [ "m4_01_vectors::build_range_counts_from_one", "m4_01_vectors::sum_all_takes_a_slice", "m4_01_vectors::get_at_does_not_panic", "m4_01_vectors::double_in_place_mutates", "m4_01_vectors::evens_keeps_order" ], minPass: 5, timeoutMs: 180000 }
  - id: index-vs-get
    title: "Du kannst zwischen v[i] und v.get(i) wählen"
    check: { type: "question", prompt: { en: "get_at must return None for an out-of-range index, so v[i] is wrong there. Name a place in the same file where v[i] would be the better choice, and state the rule you would give a colleague for picking between the two.", de: "get_at muss für einen Index außerhalb des Bereichs None liefern, v[i] ist dort also falsch. Nenne eine Stelle in derselben Datei, an der v[i] die bessere Wahl wäre, und formuliere die Regel, die du einem Kollegen für die Wahl zwischen beiden geben würdest." }, rubric: "Names a place where the index is known to be in range (an index derived from the vector's own length, or iteration) and states a rule of the form: use v[i] when an out-of-range index would be a bug in the program - a panic is then the correct, loud response - and v.get(i) when the index comes from outside and being out of range is an expected condition the caller must handle.", bloom: "evaluate", minChars: 60 }
socratic:
  - { trigger: "task:vectors:failed", question: { en: "Which one fails? For `build_range`, what does `1..=n` produce when `n` is 0 or negative?", de: "Welche scheitert? Was liefert `1..=n` in `build_range`, wenn `n` 0 oder negativ ist?" }, hints: [ { en: "An inclusive range whose end is below its start is simply empty, so no special case is needed.", de: "Ein einschließender Bereich, dessen Ende unter dem Start liegt, ist schlicht leer; ein Sonderfall ist unnötig." }, { en: "`double_in_place` must write through the reference: `for x in v.iter_mut() { *x *= 2; }`.", de: "`double_in_place` muss über die Referenz schreiben: `for x in v.iter_mut() { *x *= 2; }`." }, { en: "`v.get(i)` gives `Option<&i32>`; `.copied()` turns it into the `Option<i32>` the signature promises.", de: "`v.get(i)` liefert `Option<&i32>`; `.copied()` macht daraus das von der Signatur versprochene `Option<i32>`." } ] }
misconceptions:
  - { pattern: "index out of bounds: the len is \\d+ but the index is \\d+", question: { en: "An index went past the end at runtime. Was the index supposed to be trusted here, or should the function have returned an Option instead?", de: "Ein Index lief zur Laufzeit über das Ende hinaus. Sollte dem Index hier vertraut werden, oder hätte die Funktion ein Option liefern müssen?" }, hints: [ { en: "`v[i]` panics on an out-of-range index; `v.get(i)` returns `None`.", de: "`v[i]` stürzt bei einem Index außerhalb des Bereichs ab; `v.get(i)` liefert `None`." }, { en: "The panic message names both the length and the index, which usually identifies the off-by-one immediately.", de: "Die Panic-Meldung nennt Länge und Index, was den Off-by-one meist sofort zeigt." }, { en: "`get_at` promises never to panic; its signature already says so with `Option`.", de: "`get_at` verspricht, nie abzustürzen; seine Signatur sagt das mit `Option` bereits." } ] }
  - { pattern: "error\\[E0502\\]", question: { en: "A read of the vector overlaps a write to it. Which line still holds the shared borrow when the mutation happens?", de: "Ein Lesen des Vektors überlappt ein Schreiben darauf. Welche Zeile hält beim Ändern noch die geteilte Leihe?" }, hints: [ { en: "`iter()` borrows the whole vector for the duration of the loop; `push` inside it cannot work.", de: "`iter()` leiht den gesamten Vektor für die Dauer der Schleife; ein `push` darin kann nicht funktionieren." }, { en: "Collect into a second vector and replace the first afterwards, rather than mutating during iteration.", de: "Sammle in einen zweiten Vektor und ersetze den ersten danach, statt während der Iteration zu ändern." }, { en: "`iter_mut()` is the one loop that may change elements - but not the length.", de: "`iter_mut()` ist die eine Schleife, die Elemente ändern darf - die Länge aber nicht." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Baue, lies, durchlaufe und ändere einen `Vec<T>` und wähle bewusst zwischen einer Indizierung, die abstürzt, und einer, die ein `Option` liefert.

## Erzeugen und wachsen lassen

```rust
let mut v: Vec<i32> = Vec::new();
v.push(1);

let v = vec![1, 2, 3];       // das Makro, wenn der Inhalt bekannt ist
```

`Vec::new()` braucht eine Typannotation, weil es nichts herzuleiten gibt; nach dem ersten `push` gäbe es das. Die Elemente liegen nebeneinander auf dem Heap, alle vom selben Typ, und der Vektor wird - samt allem darin - aufgeräumt, wenn er seinen Gültigkeitsbereich verlässt.

## Zwei Wege, ein Element zu lesen

```rust
let third = &v[2];             // stürzt außerhalb des Bereichs ab
let third = v.get(2);          // Option<&i32>
```

Sie sind nicht austauschbar, und die Wahl ist eine Entwurfs-, keine Stilfrage:

- Nutze `v[i]`, wenn ein Index außerhalb des Bereichs bedeuten würde, dass das Programm einen Fehler hat. Dann lautstark abzustürzen ist besser, als mit Unsinn weiterzurechnen.
- Nutze `v.get(i)`, wenn der Index von außen kommt - von einem Nutzer, aus einer Datei, aus einem Argument - und außerhalb des Bereichs zu liegen ein Zustand ist, den dein Aufrufer behandeln soll.

`get_at` in diesem Step ist der zweite Fall, und seine Signatur sagt das. `.copied()` nach `get` macht aus `Option<&i32>` ein `Option<i32>`, beendet damit die Leihe und erlaubt, einen Wert statt einer Referenz in die Daten des Aufrufers zurückzugeben.

## Iterieren

```rust
for x in &v { … }               // geteilte Leihe, nur lesend
for x in v.iter_mut() { *x *= 2; }   // eine veränderliche Leihe für die ganze Schleife
```

Das `*` in der zweiten Form ist nicht optional: `x` ist ein `&mut i32`, und `x *= 2` versuchte, eine Referenz zu multiplizieren. Die Schleife hält für ihre gesamte Dauer eine einzige veränderliche Leihe - deshalb ist ein `push` darin E0502, die Aliasing-Regel aus M2 in ihrer häufigsten Alltagsform.

## Slices, noch einmal

`sum_all` nimmt `&[i32]`, nicht `&Vec<i32>`. Das ist die Lektion aus m2-04 angewandt: der Slice akzeptiert einen ganzen Vektor, einen Teil davon, ein Array und ein Literal, und die Funktion ist ohne Mehraufwand an mehr Stellen einsetzbar. Clippy schlägt diese Umstellung namentlich vor (`ptr_arg`), und der Workspace behält `&mut Vec` nur dort, wo die Referenz selbst der Gegenstand der Übung ist.

## Deine Aufgabe

Implementiere die fünf Funktionen und begründe dann, wo `v[i]` der bessere Aufruf wäre. Der nächste Step behandelt die Sammlung, die am einfachsten aussieht und es nicht ist: `String`.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo test --test m4-01-vectors
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** je Test eine Zeile `test … ok` oder `… FAILED`, danach die Zusammenfassung `test result: ok. 5 passed; 0 failed`, sobald du fertig bist.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

*Die drei Handgriffe sind in jedem Step dieses Kurses dieselben - Terminal öffnen, mit `cd` in die Crate wechseln, den Befehl ausführen. Nur die letzte Zeile unterscheidet sich, und die Fassung dieses Steps steht im Block darüber.*

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
