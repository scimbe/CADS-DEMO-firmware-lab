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
    check: { type: "question", prompt: { en: "Two &mut into one vector is E0499. One sentence on how many mutable borrows Vec::swap(i, j) needs, and one on why indices can do what two references cannot.", de: "Zwei &mut in einen Vektor sind E0499. Ein Satz dazu, wie viele veränderliche Leihen Vec::swap(i, j) braucht, und einer dazu, warum Indizes können, was zwei Referenzen nicht können." }, rubric: "Erster Satz: genau eine - das &mut self des Aufrufs. Zweiter Satz: ein Index ist eine Zahl und leiht nichts, die Ausschließlichkeitsregel steht also nie zur Debatte; die Methode tauscht die Elemente von innerhalb dieser einen Leihe aus. Besteht nicht: antworten, swap sei einfach eine Bibliotheksfunktion, die mehr dürfe; oder zwei Leihen nennen.", recallPrompt: { en: "Two &mut into one vector are rejected, yet Vec::swap exchanges two elements. How many mutable borrows does that call need, and why can indices do what two references cannot?", de: "Zwei &mut in denselben Vektor werden abgelehnt, und doch tauscht Vec::swap zwei Elemente. Wie viele veränderliche Leihen braucht dieser Aufruf, und warum können Indizes, was zwei Referenzen nicht können?" }, bloom: "analyze", minChars: 50 }
socratic:
  - { trigger: "task:swap-why:failed", question: { en: "Write out the call `v.swap(0, last)` and mark every borrow of `v` it creates. How many are there?", de: "Schreibe den Aufruf `v.swap(0, last)` auf und markiere jede Leihe von `v`, die er erzeugt. Wie viele sind es?" }, hints: [ { en: "A method call `v.swap(...)` borrows the receiver once. Its arguments are numbers.", de: "Ein Methodenaufruf `v.swap(...)` leiht den Empfänger einmal. Seine Argumente sind Zahlen." }, { en: "Compare that with `&mut v[0]` and `&mut v[last]`, and count the borrows of `v` in each version.", de: "Vergleiche das mit `&mut v[0]` und `&mut v[last]` und zähle in jeder Fassung die Leihen von `v`." }, { en: "A number carries no permission to reach the data, so passing two of them cannot break a rule about references.", de: "Eine Zahl trägt keine Erlaubnis, an die Daten zu gelangen; zwei davon zu übergeben kann also keine Regel über Referenzen brechen." } ] }
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

- `v.swap(0, last)`: die Methode der Standardbibliothek nimmt zwei *Indizes* statt zweier Referenzen. Zähle, wie viele veränderliche Leihen das übrig lässt.
- Die beiden Werte über Zwischenvariablen kopieren und zurückschreiben. `i32` ist `Copy`, `v[0]` zu lesen liefert also einen unabhängigen Wert, und keine Leihe überdauert ihn - der Stoff aus M1 zahlt sich aus.

Sichere die kurzen Fälle ab: `v.len() - 1` läuft beim leeren Vektor unter und stürzt ab, denn `usize` kann nicht negativ werden.

## Deine Aufgabe

Implementiere die drei Funktionen und erkläre dann, warum `Vec::swap` so geschnitten ist, wie es ist. Der nächste Step verallgemeinert die Einschränkung zur Aliasing-Regel.

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

::: do command="cargo test --test m2-02-mutable-references" cwd="."
Führe die Tests dieses Steps aus. Derselbe Befehl steckt hinter dem Knopf **Prüfen** an der Aufgabe *change, append_twice und swap_ends bestehen*.
> expect: Je Test eine Zeile `test … ok` oder `… FAILED`, darunter die Zusammenfassung `test result: ok. 4 passed; 0 failed`, sobald alle 4 bestehen. Der erste Lauf braucht ein paar Sekunden, weil die Crate einmal übersetzt wird; jeder weitere bleibt deutlich unter einer Sekunde.
> recover: Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - hole es nach. Meldet es `no test target named`, stimmt der Name hinter `--test` nicht; `ls tests/` listet die gültigen Namen auf.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
