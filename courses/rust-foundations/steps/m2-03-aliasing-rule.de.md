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
    title: "Bestaetige, dass zwei veraenderliche Leihen abgelehnt werden"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_03_two_mut_borrows.rs", expectExitCode: 1, expectStderr: "error\\[E0499\\]: cannot borrow `s` as mutable more than once at a time", timeoutMs: 120000 }
  - id: aliasing
    title: "Die drei Aliasing-Uebungen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-03-aliasing-rule", expectPass: [ "m2_03_aliasing_rule::first_then_push_returns_first_and_pushes", "m2_03_aliasing_rule::longest_len_then_clear_works", "m2_03_aliasing_rule::longest_len_of_empty_is_zero", "m2_03_aliasing_rule::double_all_and_sum_mutates_and_sums" ], minPass: 4, timeoutMs: 180000 }
  - id: price
    title: "Du kannst benennen, was die Regel einbringt"
    check: { type: "question", prompt: { en: "In first_then_push, `let first = &v[0]; v.push(x); *first` is rejected with E0502 even though on most runs it would appear to work. Name the concrete thing that can go wrong at runtime if the compiler allowed it, and why push in particular is dangerous here.", de: "In first_then_push wird `let first = &v[0]; v.push(x); *first` mit E0502 abgelehnt, obwohl es in den meisten Laeufen zu funktionieren schiene. Nenne konkret, was zur Laufzeit schiefgehen kann, wenn der Compiler es erlaubte, und warum ausgerechnet push hier gefaehrlich ist." }, rubric: "States that push may exceed the vector's capacity, reallocate the buffer and copy the elements to a new address, after which the earlier reference points at freed memory - a dangling pointer / use after free. Credit for noting that whether it happens depends on capacity, so testing would find it only sometimes, which is exactly why a compile-time rule is used instead.", bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:aliasing:failed", question: { en: "Which function does not compile, and which two borrows overlap in it? Ask for each: could the reading one end before the writing one starts?", de: "Welche Funktion kompiliert nicht, und welche beiden Leihen ueberlappen darin? Frage jeweils: koennte die lesende enden, bevor die schreibende beginnt?" }, hints: [ { en: "Copy the value out first: `let first = v[0];` (no `&`) reads an `i32` and ends the borrow immediately.", de: "Kopiere den Wert zuerst heraus: `let first = v[0];` (ohne `&`) liest ein `i32` und beendet die Leihe sofort." }, { en: "In `longest_len_then_clear`, finish the loop over `words.iter()` completely before calling `clear`.", de: "Beende in `longest_len_then_clear` die Schleife ueber `words.iter()` vollstaendig, bevor du `clear` aufrufst." }, { en: "`double_all_and_sum` needs one loop with `iter_mut()`; write through `*x` and add to the running total in the same pass.", de: "`double_all_and_sum` braucht eine Schleife mit `iter_mut()`; schreibe ueber `*x` und addiere im selben Durchgang zur Summe." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]: cannot borrow `\\w+` as mutable because it is also borrowed as immutable", question: { en: "A reader and a writer overlap. Where is the reader's last use - and can you move it earlier, or replace the reference with a copied value?", de: "Ein Leser und ein Schreiber ueberlappen. Wo liegt die letzte Verwendung des Lesers - und kannst du sie vorziehen oder die Referenz durch einen kopierten Wert ersetzen?" }, hints: [ { en: "The diagnostic's third label, `immutable borrow later used here`, is what keeps the borrow alive; that line is the real constraint.", de: "Die dritte Beschriftung der Diagnose, `immutable borrow later used here`, haelt die Leihe am Leben; diese Zeile ist die eigentliche Einschraenkung." }, { en: "For a `Copy` element, dropping the `&` turns a borrow into an independent value and the conflict disappears.", de: "Bei einem `Copy`-Element macht das Weglassen des `&` aus einer Leihe einen unabhaengigen Wert, und der Konflikt verschwindet." }, { en: "For a non-Copy element, compute what you need from it - a length, a clone of just that field - before the mutation.", de: "Bei einem Nicht-Copy-Element berechne vor der Aenderung, was du brauchst - eine Laenge, einen Klon nur dieses Felds." } ] }
  - { pattern: "error\\[E0499\\]", question: { en: "Two writers at once. Can the work be done in one pass with a single mutable borrow instead of two?", de: "Zwei Schreiber gleichzeitig. Laesst sich die Arbeit in einem Durchgang mit einer einzigen veraenderlichen Leihe erledigen statt mit zweien?" }, hints: [ { en: "One `for x in v.iter_mut()` loop holds exactly one mutable borrow for its whole duration.", de: "Eine Schleife `for x in v.iter_mut()` haelt fuer ihre gesamte Dauer genau eine veraenderliche Leihe." }, { en: "Accumulate into a local variable inside the loop rather than borrowing the collection a second time to sum it.", de: "Sammle in einer lokalen Variablen innerhalb der Schleife, statt die Sammlung ein zweites Mal zum Summieren zu leihen." }, { en: "Methods that take indices (`swap`, `split_at_mut`) exist to express two-element access under one borrow.", de: "Methoden mit Indizes (`swap`, `split_at_mut`) gibt es, um Zugriff auf zwei Elemente unter einer Leihe auszudruecken." } ] }
---
## Lernziel

Nenne die Aliasing-Regel, erkenne die beiden Fehler, die sie durchsetzen, und strukturiere Code so um, dass sich die Leihen nicht ueberlappen.

## Die Regel

Zu jedem Zeitpunkt darfst du fuer einen Wert **entweder** beliebig viele geteilte Referenzen (`&T`) **oder** genau eine veraenderliche Referenz (`&mut T`) halten - nie beides. Zwei Fehler setzen das durch:

- **E0499** - zwei veraenderliche Leihen gleichzeitig.
- **E0502** - eine veraenderliche Leihe, waehrend eine geteilte noch lebt.

`snippets/m2_03_two_mut_borrows.rs` ist das minimale E0499; der erste Check uebersetzt es und erwartet diesen Fehlschlag, damit du die Meldung im eigenen Terminal siehst und nicht nur in diesem Text.

## Warum "funktioniert doch trotzdem" kein Argument ist

Der naheliegende Weg fuer `first_then_push` ist:

```rust
let first = &v[0];
v.push(x);
*first          // error[E0502]
```

In einer Sprache ohne die Regel funktioniert das meistens. Meistens. `push` kann den Vektor voll vorfinden, einen groesseren Puffer allozieren, die Elemente umkopieren und den alten freigeben. `first` zeigt dann in freigegebenen Speicher. Ob das passiert, haengt von der Kapazitaet in diesem Moment ab; eine Testsuite findet es also bei manchen Eingaben und bei anderen nicht, und ein Debugger zeigt einen plausibel aussehenden Wert. Das ist die Fehlerklasse, deretwegen es die Regel gibt, und der Grund, sie zur Uebersetzungszeit durchzusetzen statt zur Laufzeit zu erkennen.

## Nicht-lexikalische Lebensdauern

Die Regel betrifft *Ueberlappung*, nicht Gueltigkeitsbereiche. Eine Leihe endet nach ihrer letzten Verwendung:

```rust
let r1 = &s;
let r2 = &s;
println!("{r1} and {r2}");   // letzte Verwendung von r1 und r2
let r3 = &mut s;             // in Ordnung
```

`examples/m2_borrow_scopes.rs` ist genau das, ausfuehrbar. Es neben dem scheiternden Snippet zu lesen ist der schnellste Weg zu sehen, dass der Unterschied darin liegt, *wann die letzte Verwendung ist*, nicht wie viele Klammern beteiligt sind.

## Umstrukturieren, drei Wege

Die Uebungen sind drei Formen derselben Loesung.

`first_then_push`: den Wert herauskopieren. `let first = v[0];` ohne das `&` liest ein `i32` - ein `Copy`-Typ, es bleibt also keine Leihe, die mit `push` kollidieren koennte.

`longest_len_then_clear`: das Lesen abschliessen, bevor geschrieben wird. Iteriere ueber `words.iter()`, halte das Maximum in einem lokalen `usize` und rufe erst dann `clear()` auf. Die lokale Variable ueberlebt die Leihe, weil sie eine Zahl ist und keine Referenz in den Vektor.

`double_all_and_sum`: beide Aufgaben in einem Durchgang. `for x in v.iter_mut()` haelt eine einzige veraenderliche Leihe; schreibe ueber `*x` und addiere in derselben Schleife zu einer lokalen Summe, statt zu aendern und danach erneut zum Summieren zu leihen.

## Deine Aufgabe

Fuehre den Snippet-Check aus, implementiere die drei Funktionen und benenne dann, was tatsaechlich schiefgehen kann, waere E0502 erlaubt. Der naechste Step fuehrt Slices ein, deren ganzer Zweck es ist, das Leihen eines *Teils* einer Sammlung sicher zu machen.
