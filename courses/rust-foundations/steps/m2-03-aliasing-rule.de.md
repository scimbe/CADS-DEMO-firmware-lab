---
id: m2-03-aliasing-rule
title: "Die Aliasing-Regel: Leser oder ein Schreiber"
bloom: analyze
objectives: [ "rust-ch04-02-references-and-borrowing" ]
requires: [ "m2-02-mutable-references" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m2-02-mutable-references" ]
links:
  - { step: "m2-04-slices" }
  - { file: "src/m2/m2_03_aliasing.rs" }
  - { file: "examples/m2_borrow_scopes.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html", title: "The Book, 4.2: The Rules of References" }
sources: [ "src/m2/m2_03_aliasing.rs", "tests/m2-03-aliasing-rule.rs", "examples/m2_borrow_scopes.rs", "snippets/m2_03_two_mut_borrows.rs" ]
tasks:
  - id: two-mut
    title: "Bestätige, dass zwei veränderliche Leihen abgelehnt werden"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_03_two_mut_borrows.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0499\\]: cannot borrow `s` as mutable more than once at a time", timeoutMs: 120000 }
  - id: aliasing
    title: "Die drei Aliasing-Übungen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-03-aliasing-rule", expectPass: [ "m2_03_aliasing_rule::first_then_push_returns_first_and_pushes", "m2_03_aliasing_rule::longest_len_then_clear_works", "m2_03_aliasing_rule::longest_len_of_empty_is_zero", "m2_03_aliasing_rule::double_all_and_sum_mutates_and_sums" ], minPass: 4, timeoutMs: 180000 }
  - id: price
    title: "Du kannst benennen, was die Regel einbringt"
    check: { type: "question", prompt: { en: "In first_then_push, `let first = &v[0]; v.push(x); *first` is rejected with E0502 even though on most runs it would appear to work. Name the concrete thing that can go wrong at runtime if the compiler allowed it, and why push in particular is dangerous here.", de: "In first_then_push wird `let first = &v[0]; v.push(x); *first` mit E0502 abgelehnt, obwohl es in den meisten Läufen zu funktionieren schiene. Nenne konkret, was zur Laufzeit schiefgehen kann, wenn der Compiler es erlaubte, und warum ausgerechnet push hier gefährlich ist." }, rubric: "States that push may exceed the vector's capacity, reallocate the buffer and copy the elements to a new address, after which the earlier reference points at freed memory - a dangling pointer / use after free. Credit for noting that whether it happens depends on capacity, so testing would find it only sometimes, which is exactly why a compile-time rule is used instead.", bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:aliasing:failed", question: { en: "Which function does not compile, and which two borrows overlap in it? Ask for each: could the reading one end before the writing one starts?", de: "Welche Funktion kompiliert nicht, und welche beiden Leihen überlappen darin? Frage jeweils: könnte die lesende enden, bevor die schreibende beginnt?" }, hints: [ { en: "Copy the value out first: `let first = v[0];` (no `&`) reads an `i32` and ends the borrow immediately.", de: "Kopiere den Wert zuerst heraus: `let first = v[0];` (ohne `&`) liest ein `i32` und beendet die Leihe sofort." }, { en: "In `longest_len_then_clear`, finish the loop over `words.iter()` completely before calling `clear`.", de: "Beende in `longest_len_then_clear` die Schleife über `words.iter()` vollständig, bevor du `clear` aufrufst." }, { en: "`double_all_and_sum` needs one loop with `iter_mut()`; write through `*x` and add to the running total in the same pass.", de: "`double_all_and_sum` braucht eine Schleife mit `iter_mut()`; schreibe über `*x` und addiere im selben Durchgang zur Summe." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]: cannot borrow `\\w+` as mutable because it is also borrowed as immutable", question: { en: "A reader and a writer overlap. Where is the reader's last use - and can you move it earlier, or replace the reference with a copied value?", de: "Ein Leser und ein Schreiber überlappen. Wo liegt die letzte Verwendung des Lesers - und kannst du sie vorziehen oder die Referenz durch einen kopierten Wert ersetzen?" }, hints: [ { en: "The diagnostic's third label, `immutable borrow later used here`, is what keeps the borrow alive; that line is the real constraint.", de: "Die dritte Beschriftung der Diagnose, `immutable borrow later used here`, hält die Leihe am Leben; diese Zeile ist die eigentliche Einschränkung." }, { en: "For a `Copy` element, dropping the `&` turns a borrow into an independent value and the conflict disappears.", de: "Bei einem `Copy`-Element macht das Weglassen des `&` aus einer Leihe einen unabhängigen Wert, und der Konflikt verschwindet." }, { en: "For a non-Copy element, compute what you need from it - a length, a clone of just that field - before the mutation.", de: "Bei einem Nicht-Copy-Element berechne vor der Änderung, was du brauchst - eine Länge, einen Klon nur dieses Felds." } ] }
  - { pattern: "error\\[E0499\\]", question: { en: "Two writers at once. Can the work be done in one pass with a single mutable borrow instead of two?", de: "Zwei Schreiber gleichzeitig. Lässt sich die Arbeit in einem Durchgang mit einer einzigen veränderlichen Leihe erledigen statt mit zweien?" }, hints: [ { en: "One `for x in v.iter_mut()` loop holds exactly one mutable borrow for its whole duration.", de: "Eine Schleife `for x in v.iter_mut()` hält für ihre gesamte Dauer genau eine veränderliche Leihe." }, { en: "Accumulate into a local variable inside the loop rather than borrowing the collection a second time to sum it.", de: "Sammle in einer lokalen Variablen innerhalb der Schleife, statt die Sammlung ein zweites Mal zum Summieren zu leihen." }, { en: "Methods that take indices (`swap`, `split_at_mut`) exist to express two-element access under one borrow.", de: "Methoden mit Indizes (`swap`, `split_at_mut`) gibt es, um Zugriff auf zwei Elemente unter einer Leihe auszudrücken." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Nenne die Aliasing-Regel, erkenne die beiden Fehler, die sie durchsetzen, und strukturiere Code so um, dass sich die Leihen nicht überlappen.

## Die Regel

Zu jedem Zeitpunkt darfst du für einen Wert **entweder** beliebig viele geteilte Referenzen (`&T`) **oder** genau eine veränderliche Referenz (`&mut T`) halten - nie beides. Zwei Fehler setzen das durch:

- **E0499** - zwei veränderliche Leihen gleichzeitig.
- **E0502** - eine veränderliche Leihe, während eine geteilte noch lebt.

`snippets/m2_03_two_mut_borrows.rs` ist das minimale E0499; der erste Check übersetzt es und erwartet diesen Fehlschlag, damit du die Meldung im eigenen Terminal siehst und nicht nur in diesem Text.

## Warum "funktioniert doch trotzdem" kein Argument ist

Der naheliegende Weg für `first_then_push` ist:

```rust
let first = &v[0];
v.push(x);
*first          // error[E0502]
```

In einer Sprache ohne die Regel funktioniert das meistens. Meistens. `push` kann den Vektor voll vorfinden, einen größeren Puffer allozieren, die Elemente umkopieren und den alten freigeben. `first` zeigt dann in freigegebenen Speicher. Ob das passiert, hängt von der Kapazität in diesem Moment ab; eine Testsuite findet es also bei manchen Eingaben und bei anderen nicht, und ein Debugger zeigt einen plausibel aussehenden Wert. Das ist die Fehlerklasse, deretwegen es die Regel gibt, und der Grund, sie zur Übersetzungszeit durchzusetzen statt zur Laufzeit zu erkennen.

## Nicht-lexikalische Lebensdauern

Die Regel betrifft *Überlappung*, nicht Gültigkeitsbereiche. Eine Leihe endet nach ihrer letzten Verwendung:

```rust
let r1 = &s;
let r2 = &s;
println!("{r1} and {r2}");   // letzte Verwendung von r1 und r2
let r3 = &mut s;             // in Ordnung
```

`examples/m2_borrow_scopes.rs` ist genau das, ausführbar. Es neben dem scheiternden Snippet zu lesen ist der schnellste Weg zu sehen, dass der Unterschied darin liegt, *wann die letzte Verwendung ist*, nicht wie viele Klammern beteiligt sind.

## Umstrukturieren, drei Wege

Die Übungen sind drei Formen derselben Lösung.

`first_then_push`: den Wert herauskopieren. `let first = v[0];` ohne das `&` liest ein `i32` - ein `Copy`-Typ, es bleibt also keine Leihe, die mit `push` kollidieren könnte.

`longest_len_then_clear`: das Lesen abschließen, bevor geschrieben wird. Iteriere über `words.iter()`, halte das Maximum in einem lokalen `usize` und rufe erst dann `clear()` auf. Die lokale Variable überlebt die Leihe, weil sie eine Zahl ist und keine Referenz in den Vektor.

`double_all_and_sum`: beide Aufgaben in einem Durchgang. `for x in v.iter_mut()` hält eine einzige veränderliche Leihe; schreibe über `*x` und addiere in derselben Schleife zu einer lokalen Summe, statt zu ändern und danach erneut zum Summieren zu leihen.

## Deine Aufgabe

Führe den Snippet-Check aus, implementiere die drei Funktionen und benenne dann, was tatsächlich schiefgehen kann, wäre E0502 erlaubt. Der nächste Step führt Slices ein, deren ganzer Zweck es ist, das Leihen eines *Teils* einer Sammlung sicher zu machen.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_03_two_mut_borrows.rs
cargo test --test m2-03-aliasing-rule
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** eine Compilerdiagnose und sonst nichts - diese Datei soll *nicht* übersetzen, der Fehler ist also das erwartete Ergebnis und nicht dein Fehler.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
