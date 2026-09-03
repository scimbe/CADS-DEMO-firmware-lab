---
id: m2-02-mutable-references
title: "Veränderliche Referenzen"
bloom: apply
objectives: [ "rust-ch04-02-references-and-borrowing" ]
requires: [ "m2-01-shared-references" ]
estimatedMinutes: 20
scaffold: faded
recallFrom: [ "m1-04-ownership-and-functions", "m1-03-copy-types" ]
links:
  - { step: "m2-03-aliasing-rule" }
  - { file: "src/m2/m2_02_mutable_refs.rs" }
  - { file: "tests/m2-02-mutable-references.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html", title: "The Book, 4.2: Mutable References" }
sources: [ "src/m2/m2_02_mutable_refs.rs", "tests/m2-02-mutable-references.rs" ]
tasks:
  - id: mutate
    title: "change, append_twice und swap_ends bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-02-mutable-references", expectPass: [ "m2_02_mutable_references::change_appends_world", "m2_02_mutable_references::append_twice_appends_twice", "m2_02_mutable_references::swap_ends_swaps", "m2_02_mutable_references::swap_ends_short_vectors" ], minPass: 4, timeoutMs: 180000 }
  - id: swap-why
    title: "Du kannst erklären, warum es Vec::swap gibt"
    check: { type: "question", prompt: { en: "Writing swap_ends with two &mut into the same vector is rejected with E0499. Explain why the standard library offers Vec::swap(i, j) taking two indices instead, and what that changes about who holds the mutable borrow.", de: "swap_ends mit zwei &mut in denselben Vektor zu schreiben wird mit E0499 abgelehnt. Erkläre, warum die Standardbibliothek stattdessen Vec::swap(i, j) mit zwei Indizes anbietet, und was das daran ändert, wer die veränderliche Leihe hält." }, rubric: "States that two simultaneous &mut to the same vector violate the exclusivity rule, and that swap takes indices so there is exactly one mutable borrow - the &mut self of the method - inside which the two elements are exchanged, keeping the exclusivity invariant while still doing the job. Credit for noting that copying through a temporary works too because i32 is Copy.", bloom: "analyze", minChars: 50 }
socratic:
  - { trigger: "task:mutate:failed", question: { en: "Is this a compile error or a failing assertion? If `swap_ends` will not compile, how many mutable borrows of the vector are alive at the same time in your version?", de: "Ist das ein Übersetzungsfehler oder eine fehlgeschlagene Zusicherung? Lässt sich `swap_ends` nicht übersetzen: wie viele veränderliche Leihen des Vektors leben in deiner Fassung gleichzeitig?" }, hints: [ { en: "`v.swap(0, last)` does the whole job with a single borrow.", de: "`v.swap(0, last)` erledigt alles mit einer einzigen Leihe." }, { en: "Compute `v.len() - 1` before you touch anything, and guard the case of fewer than two elements - `0 - 1` on a usize panics.", de: "Berechne `v.len() - 1` vor allem anderen und sichere den Fall von weniger als zwei Elementen ab - `0 - 1` auf einem usize stürzt ab." }, { en: "In `change` and `append_twice` you may call `push_str` directly on the `&mut String`; no dereference is needed.", de: "In `change` und `append_twice` darfst du `push_str` direkt auf dem `&mut String` aufrufen; ein Dereferenzieren ist nicht nötig." } ] }
misconceptions:
  - { pattern: "error\\[E0499\\]: cannot borrow `\\w+` as mutable more than once", question: { en: "Two mutable borrows of the same value are alive at once. Which two, and does the second one really need to exist while the first is still in use?", de: "Zwei veränderliche Leihen desselben Werts leben gleichzeitig. Welche zwei, und muss die zweite wirklich existieren, solange die erste noch benutzt wird?" }, hints: [ { en: "The diagnostic labels `first mutable borrow occurs here` and `second mutable borrow occurs here` - the fix is almost always to end the first one earlier.", de: "Die Diagnose beschriftet `first mutable borrow occurs here` und `second mutable borrow occurs here` - die Lösung ist fast immer, die erste früher enden zu lassen." }, { en: "A borrow ends after its last use, not at the closing brace, so moving the last use up can be enough.", de: "Eine Leihe endet nach ihrer letzten Verwendung, nicht an der schließenden Klammer; die letzte Verwendung nach oben zu ziehen kann genügen." }, { en: "For two elements of one collection, use the method that takes indices instead of two references.", de: "Für zwei Elemente einer Sammlung nutze die Methode, die Indizes nimmt, statt zweier Referenzen." } ] }
  - { pattern: "error\\[E0596\\]: cannot borrow", question: { en: "Something is being changed through a shared reference, or through a binding that is not `mut`. Which of the two is it here?", de: "Etwas wird über eine geteilte Referenz oder über eine nicht-`mut`-Bindung geändert. Welches von beidem ist es hier?" }, hints: [ { en: "A `&mut` may only be taken from a binding that is itself declared `mut`.", de: "Ein `&mut` darf nur von einer Bindung genommen werden, die selbst `mut` deklariert ist." }, { en: "The call site needs `&mut s`, not `&s` - the ampersand alone is the shared kind.", de: "Die Aufrufstelle braucht `&mut s`, nicht `&s` - das Kaufmanns-Und allein ist die geteilte Form." }, { en: "The parameter type has to say `&mut` too; both sides must agree.", de: "Auch der Parametertyp muss `&mut` lauten; beide Seiten müssen übereinstimmen." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Verleihe einen Wert zum Schreiben und sieh die eine Einschränkung, die damit einhergeht.

## Drei Stellen, an denen `mut` stehen muss

```rust
let mut s = String::from("hello");
change(&mut s);

fn change(some_string: &mut String) {
    some_string.push_str(", world");
}
```

Die Bindung muss `mut` sein, die Aufrufstelle muss `&mut s` sagen, und der Parametertyp muss `&mut String` lauten. Fehlt eines davon, erhältst du E0596. Diese Ausführlichkeit ist Absicht: an jeder Aufrufstelle ist sichtbar, dass diese Funktion deinen Wert ändern darf.

Beachte, dass du `push_str` direkt auf der Referenz aufrufst. Rust dereferenziert bei Methodenaufrufen automatisch; `(*some_string).push_str(...)` ist nie nötig.

## Die eine Einschränkung

Hast du eine veränderliche Referenz auf einen Wert, darf es zur selben Zeit keine weitere Referenz auf diesen Wert geben - weder veränderlich noch geteilt. Dieser Code wird abgelehnt:

```rust
let r1 = &mut s;
let r2 = &mut s;
println!("{r1}, {r2}");
```

```text
error[E0499]: cannot borrow `s` as mutable more than once at a time
```

Der Nutzen steht in Kapitel 4.2 unverblümt: Data Races können nicht auftreten, denn ein Data Race braucht zwei Zeiger auf dieselben Daten, von denen mindestens einer schreibt. Rust erkennt das Rennen nicht zur Laufzeit; es weigert sich, die Form zu übersetzen, die eines erlaubt.

Die Einschränkung ist enger, als sie wirkt, denn eine Leihe endet nach ihrer **letzten Verwendung**, nicht am Blockende:

```rust
let r1 = &mut s;
r1.push_str(" world");   // letzte Verwendung von r1
let r2 = &mut s;         // in Ordnung: r1 ist vorbei
```

## Die Übung

`change` und `append_twice` sind geradeaus: `&mut String` nehmen, Methode aufrufen.

Bei `swap_ends` beißt die Regel. Die naheliegende Idee - `&mut v[0]` und `&mut v[last]` holen und tauschen - ist E0499. Es gibt zwei ehrliche Auswege, und beide lohnen sich zu kennen:

- `v.swap(0, last)`: die Methode der Standardbibliothek nimmt zwei *Indizes*, die einzige veränderliche Leihe ist also das `&mut self` des Aufrufs selbst.
- Die beiden Werte über Zwischenvariablen kopieren und zurückschreiben. `i32` ist `Copy`, `v[0]` zu lesen liefert also einen unabhängigen Wert, und keine Leihe überdauert ihn - der Stoff aus M1 zahlt sich aus.

Sichere die kurzen Fälle ab: `v.len() - 1` läuft beim leeren Vektor unter und stürzt ab, denn `usize` kann nicht negativ werden.

## Deine Aufgabe

Implementiere die drei Funktionen und erkläre dann, warum `Vec::swap` so geschnitten ist, wie es ist. Der nächste Step verallgemeinert die Einschränkung zur Aliasing-Regel.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo test --test m2-02-mutable-references
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** je Test eine Zeile `test … ok` oder `… FAILED`, danach die Zusammenfassung `test result: ok. 4 passed; 0 failed`, sobald du fertig bist.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
