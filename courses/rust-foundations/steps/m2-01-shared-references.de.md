---
id: m2-01-shared-references
title: "Leihen statt nehmen"
bloom: apply
objectives: [ "rust-ch04-02-references-and-borrowing" ]
requires: [ "m1-04-ownership-and-functions" ]
estimatedMinutes: 20
scaffold: worked
recallFrom: [ "m1-02-move-vs-clone" ]
links:
  - { step: "m2-02-mutable-references" }
  - { file: "src/m2/m2_01_shared_refs.rs" }
  - { file: "snippets/m2_01_mutate_through_shared_ref.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html", title: "The Book, 4.2: References and Borrowing" }
sources: [ "src/m2/m2_01_shared_refs.rs", "tests/m2-01-shared-references.rs", "snippets/m2_01_mutate_through_shared_ref.rs" ]
tasks:
  - id: guess
    title: "Sage vorher, ob man über & ändern kann"
    check: { type: "predict", prompt: { en: "snippets/m2_01_mutate_through_shared_ref.rs passes a String to a function as &String and calls push_str on it. Does it compile? Name the error code if not, and say which line the compiler will underline.", de: "snippets/m2_01_mutate_through_shared_ref.rs übergibt einen String als &String an eine Funktion und ruft push_str darauf auf. Kompiliert das? Nenne andernfalls den Fehlercode und sage, welche Zeile der Compiler unterstreichen wird." }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_01_mutate_through_shared_ref.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0596\\]: cannot borrow `\\*some_string` as mutable", timeoutMs: 120000 }, rubric: "Predicts that it does not compile and names E0596 (or describes it as 'cannot borrow as mutable behind a & reference'), pointing at the push_str line inside change, not the call site. Predicting E0502 or E0499 shows the aliasing rule is being confused with plain immutability.", bloom: "evaluate" }
  - id: borrow
    title: "Die drei leihenden Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-01-shared-references", expectPass: [ "m2_01_shared_references::calculate_length_borrows", "m2_01_shared_references::count_char_counts", "m2_01_shared_references::same_length_compares_lengths" ], minPass: 3, timeoutMs: 180000 }
socratic:
  - { trigger: "task:borrow:failed", question: { en: "Which function fails? For `count_char`, are you comparing characters or bytes - and does the closure receive a `char` or a `&char`?", de: "Welche Funktion scheitert? Vergleichst du bei `count_char` Zeichen oder Bytes - und bekommt der Closure ein `char` oder ein `&char`?" }, hints: [ { en: "`s.chars()` yields `char` values; a `filter` closure then receives `&char`, so compare with `*c == needle`.", de: "`s.chars()` liefert `char`-Werte; ein `filter`-Closure erhält dann `&char`, vergleiche also mit `*c == needle`." }, { en: "A plain loop is just as good: `for c in s.chars() { if c == needle { n += 1; } }`.", de: "Eine gewöhnliche Schleife tut es genauso: `for c in s.chars() { if c == needle { n += 1; } }`." }, { en: "`calculate_length` needs one method call; the reference gives you read access to everything a `String` can tell you.", de: "`calculate_length` braucht einen Methodenaufruf; die Referenz gibt dir Lesezugriff auf alles, was ein `String` mitteilen kann." } ] }
misconceptions:
  - { pattern: "error\\[E0596\\]: cannot borrow", question: { en: "You are trying to change something through a shared reference. Should this function be allowed to change the caller's value at all - and if so, what has to change in the signature?", de: "Du versuchst, über eine geteilte Referenz etwas zu ändern. Soll diese Funktion den Wert des Aufrufers überhaupt ändern dürfen - und wenn ja, was muss sich an der Signatur ändern?" }, hints: [ { en: "`&T` grants read access only. Mutation needs `&mut T`, on the parameter and at the call site.", de: "`&T` gewährt nur Lesezugriff. Veränderung braucht `&mut T`, am Parameter und an der Aufrufstelle." }, { en: "None of this step's three functions is meant to change anything: if you reach for mutation here, re-read what the function should return.", de: "Keine der drei Funktionen dieses Steps soll etwas ändern: greifst du hier zur Veränderung, lies erneut, was die Funktion liefern soll." }, { en: "Building a new value and returning it is usually better than mutating through a reference.", de: "Einen neuen Wert zu bauen und zurückzugeben ist meist besser, als über eine Referenz zu verändern." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`pwd` prints the current folder; it has to be the rust-foundations workspace, the one holding Cargo.toml.", de: "`pwd` gibt den aktuellen Ordner aus; er muss der rust-foundations-Workspace sein, in dem die Cargo.toml liegt." }, { en: "A terminal opened with Terminal → New Terminal starts in the workspace folder; one you navigated away from does not.", de: "Ein über Terminal → Neues Terminal geöffnetes Terminal startet im Workspace-Ordner; eines, aus dem du herausnavigiert bist, nicht." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Übergib einen Wert an eine Funktion, ohne ihn wegzugeben, und wisse genau, was das Ausleihen erlaubt.

## Das Problem, das Borrowing löst

Das `length_and_back` aus dem letzten Modul musste die Zeichenkette neben der Länge zurückgeben, nur damit der Aufrufer sie weiter nutzen konnte. Eine Referenz erledigt das:

```rust
let s1 = String::from("hello");
let len = calculate_length(&s1);
println!("The length of '{s1}' is {len}.");
```

`&s1` erzeugt eine *Referenz*: einen Wert, der auf `s1` zeigt, ohne ihn zu besitzen. `s1` bleibt unangetastet und danach nutzbar. Der Parameter wird genauso geschrieben:

```rust
pub fn calculate_length(s: &String) -> usize {
    s.len()
}
```

Eine Referenz zu erzeugen heißt *ausleihen* (borrowing). Verlässt die Referenz ihren Gültigkeitsbereich, wird nichts aufgeräumt - sie hat nie etwas besessen.

## Eine geteilte Leihe ist nur lesend

`&T` gewährt Lesezugriff und sonst nichts. `snippets/m2_01_mutate_through_shared_ref.rs` versucht, das zu brechen:

```rust
fn change(some_string: &String) {
    some_string.push_str(", world");
}
```

Sage das Ergebnis vorher, bevor du übersetzt. Die Antwort lautet:

```text
error[E0596]: cannot borrow `*some_string` as mutable, as it is behind a `&` reference
```

Achte darauf, *welche* Zeile unterstrichen wird: das `push_str` in `change`, nicht der Aufruf. Der Vertrag wurde dort beanstandet, wo er verletzt wurde, nicht dort, wo er geschlossen wurde.

## `&str` ist der bessere Parameter

`calculate_length` nimmt `&String`, weil das Listing 4-5 des Buchs ist, und steht hier zum Vergleich mit der nächsten Funktion:

```rust
pub fn count_char(haystack: &str, needle: char) -> usize
```

`&str` akzeptiert ein String-Literal, ein `&String` (Rust konvertiert automatisch) und einen Slice von beidem. `&String` akzeptiert nur das Erste davon. Jede Funktion, die Text nur liest, sollte `&str` nehmen; clippy sagt dir das, und im Workspace trägt `calculate_length` ein `#[allow]` mit genau dieser Begründung.

Die Voreinstellung ist mit Absicht geteilt und lesend - und deshalb dreht sich der Rest dieses Moduls um das eine, was daraus folgt: was passiert, wenn doch jemand schreiben muss.

## Deine Aufgabe

Sage den Fehler des Snippets vorher und implementiere dann `calculate_length`, `count_char` und `same_length`. `count_char` zählt Zeichen, iteriere also mit `chars()` und nicht über Bytes. Der nächste Step verleiht einen Wert, der geändert werden darf.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1** (im Browser zuverlässiger als Strg+Umschalt+P), tippe `Terminal: Create New Terminal` und drücke die Eingabetaste. Das Terminal öffnet sich im Bereich unten, bereits im Workspace-Ordner. Führe dann aus:

```bash
mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_01_mutate_through_shared_ref.rs
cargo test --test m2-01-shared-references
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** eine Compilerdiagnose und sonst nichts - diese Datei soll *nicht* übersetzen, der Fehler ist also das erwartete Ergebnis und nicht dein Fehler.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, steht das Terminal im falschen Ordner - wechsle mit `cd` zurück in den Workspace-Ordner.
