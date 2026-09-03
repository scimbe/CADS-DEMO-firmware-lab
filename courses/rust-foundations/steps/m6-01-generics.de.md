---
id: m6-01-generics
title: "Generics: eine Funktion, viele Typen"
bloom: understand
objectives: [ "rust-ch10-01-syntax" ]
requires: [ "m5-04-custom-error" ]
estimatedMinutes: 25
scaffold: worked
recallFrom: [ "m4-01-vectors", "m1-03-copy-types" ]
links:
  - { step: "m6-02-traits" }
  - { file: "src/m6/m6_01_generics.rs" }
  - { file: "tests/m6-01-generics.rs" }
  - { url: "https://doc.rust-lang.org/book/ch10-01-syntax.html", title: "The Book, 10.1: Generic Data Types" }
sources: [ "src/m6/m6_01_generics.rs", "tests/m6-01-generics.rs" ]
tasks:
  - id: generics
    title: "Die generischen Funktionen und Strukturen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-01-generics", expectPass: [ "m6_01_generics::largest_works_for_numbers_and_chars", "m6_01_generics::largest_returns_a_reference_into_the_slice", "m6_01_generics::swap_exchanges_both_values", "m6_01_generics::first_of_clones", "m6_01_generics::label_mixes_two_type_parameters" ], minPass: 5, timeoutMs: 180000 }
  - id: bounds-why
    title: "Du kannst erklären, warum largest eine Schranke braucht"
    check: { type: "question", prompt: { en: "swap<T> needs no trait bound at all, while largest<T> needs T: PartialOrd. Explain what the compiler knows about an unbounded T, and why returning &T rather than T in largest avoids a second bound.", de: "swap<T> braucht gar keine Trait-Schranke, largest<T> aber T: PartialOrd. Erkläre, was der Compiler über ein ungebundenes T weiß, und warum die Rückgabe von &T statt T in largest eine zweite Schranke erspart." }, rubric: "States that an unbounded T supports only what every type supports - being moved and dropped - which is enough for swap because it only moves values around, while largest compares with > and comparison is exactly what PartialOrd provides. The second half should note that returning an owned T would require copying or cloning the element out of the slice, hence Copy or Clone, whereas returning a reference borrows it and needs nothing. Does not pass: saying an unbounded T can do nothing at all, or explaining the &T return purely as a performance choice rather than as the bound it avoids.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:bounds-why:failed", question: { en: "Read each body and list the operations it performs on a value of type T.", de: "Lies jeden Rumpf und liste die Operationen auf, die er an einem Wert vom Typ T ausführt." }, hints: [ { en: "`swap` moves two values into a new struct. Ask which types can be moved - the answer is all of them.", de: "`swap` verschiebt zwei Werte in eine neue Struktur. Frage, welche Typen verschoben werden können - die Antwort ist: alle." }, { en: "`largest` uses `>`. Comparison is not something every type offers, so it must be requested by name.", de: "`largest` nutzt `>`. Vergleichen bietet nicht jeder Typ, es muss also namentlich verlangt werden." }, { en: "Then ask what returning T rather than &T would additionally require of the caller's slice, and which two traits could supply it.", de: "Frage dann, was die Rückgabe von T statt &T zusätzlich vom Slice des Aufrufers verlangte und welche zwei Traits das liefern könnten." } ] }
  - { trigger: "task:generics:failed", question: { en: "Which one fails? For `largest`, are you comparing the items themselves or the references to them - and does the result borrow from the slice?", de: "Welche scheitert? Vergleichst du in `largest` die Elemente selbst oder die Referenzen darauf - und leiht das Ergebnis aus dem Slice?" }, hints: [ { en: "Start with `let mut largest = &list[0];` and compare `item > largest`; both sides are then `&T` and `PartialOrd` applies through the reference.", de: "Beginne mit `let mut largest = &list[0];` und vergleiche `item > largest`; beide Seiten sind dann `&T`, und `PartialOrd` gilt durch die Referenz hindurch." }, { en: "`first_of` has a `Clone` bound because it hands back an owned value: `list.first().cloned()`.", de: "`first_of` hat eine `Clone`-Schranke, weil es einen besitzenden Wert zurückgibt: `list.first().cloned()`." }, { en: "`label` has two independent parameters; the function body just builds the struct from them.", de: "`label` hat zwei unabhängige Parameter; der Rumpf baut daraus lediglich die Struktur." } ] }
misconceptions:
  - { pattern: "error\\[E0369\\]: binary operation `>` cannot be applied to type", question: { en: "You compared two values of a generic type with no bound. Which trait provides comparison, and where does it belong in the signature?", de: "Du hast zwei Werte eines generischen Typs ohne Schranke verglichen. Welches Trait liefert den Vergleich, und wohin gehört es in der Signatur?" }, hints: [ { en: "`T: PartialOrd` after the type parameter is what makes `<` and `>` legal in the body.", de: "`T: PartialOrd` hinter dem Typparameter macht `<` und `>` im Rumpf zulässig." }, { en: "The diagnostic usually suggests the exact bound to add - check it against what the body actually needs.", de: "Die Diagnose schlägt meist genau die fehlende Schranke vor - prüfe sie an dem, was der Rumpf wirklich braucht." }, { en: "A generic parameter with no bound supports only moving and dropping; every operation has to be justified by a bound.", de: "Ein generischer Parameter ohne Schranke unterstützt nur Verschieben und Aufräumen; jede Operation muss durch eine Schranke begründet sein." } ] }
  - { pattern: "error\\[E0507\\]: cannot move out of", question: { en: "You tried to take an owned value out of a slice you only borrowed. Does the caller keep its data - and if so, is a reference or a clone the right answer?", de: "Du wolltest einen besitzenden Wert aus einem nur geliehenen Slice nehmen. Behält der Aufrufer seine Daten - und ist dann eine Referenz oder ein Klon die richtige Antwort?" }, hints: [ { en: "`largest` returns `&T`, so nothing needs to be moved out at all.", de: "`largest` liefert `&T`, es muss also gar nichts herausbewegt werden." }, { en: "`first_of` really does hand back a value, which is why it carries the `Clone` bound and uses `.cloned()`.", de: "`first_of` gibt tatsächlich einen Wert heraus, deshalb trägt es die `Clone`-Schranke und nutzt `.cloned()`." }, { en: "Indexing a slice of a non-Copy type gives a place, not a value; `&list[0]` borrows it instead.", de: "Ein Slice eines Nicht-Copy-Typs zu indizieren liefert einen Ort, keinen Wert; `&list[0]` leiht ihn stattdessen." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Lies und schreibe eine generische Signatur und sage, was der Compiler über einen Typparameter annehmen darf.

## Die Verdopplung, die Generics beseitigen

Zwei Funktionen, die das größte Element finden - eine für `i32`, eine für `char` - unterscheiden sich nur in einem Typnamen. Kapitel 10.1 führt diese Umformung vor; das Ergebnis ist:

```rust
pub fn largest<T: PartialOrd>(list: &[T]) -> &T
```

`<T>` hinter dem Namen deklariert den Parameter. Er ist ein Platzhalter, der an jeder Aufrufstelle gefüllt wird, und der Compiler erzeugt je konkretem Typ eine spezialisierte Kopie der Funktion - *Monomorphisierung*. Es entstehen weder Laufzeitkosten noch dynamische Dispatch-Aufrufe; die generische Fassung ist genau so schnell wie die beiden handgeschriebenen.

## Was ein ungebundenes T kann

Weniger, als man denkt. Lies die beiden Rümpfe unten und finde heraus, welche Operationen jeder von ihnen an einem `T` tatsächlich ausführt - genau das fragt dieser Step:

```rust
pub fn swap<T>(p: Pair<T>) -> Pair<T> {
    Pair { first: p.second, second: p.first }
}
```

Es verschiebt lediglich Werte von einem Feld ins andere, und Verschieben funktioniert für jeden Typ.

`largest` vergleicht, und Vergleichen ist nicht allgemein, es muss also fragen:

```text
error[E0369]: binary operation `>` cannot be applied to type `&T`
```

`T: PartialOrd` ist die Antwort. Lies eine Schranke als Versprechen, das der Aufrufer halten muss und auf das sich der Rumpf stützen darf - nicht mehr und nicht weniger.

## Warum `&T` und nicht `T`

`T` zurückzugeben hieße, ein Element aus einem Slice zu nehmen, den der Aufrufer noch besitzt. Schreibe es einmal so und lies, was der Compiler dich zu ergänzen bittet. Der Test zeigt, was die Wahl einbringt: `largest(&words)` funktioniert an einem `Vec<String>`, der weder `Copy` noch billig zu klonen ist, und der Vektor besitzt seine Zeichenketten danach weiterhin.

`first_of` ist der bewusste Gegensatz: es gibt einen besitzenden Wert heraus, trägt also `T: Clone` und nutzt `.cloned()`. Zwei Funktionen, zwei Verträge, und jede Schranke steht dort, weil der Rumpf sie braucht.

## Generische Strukturen

```rust
pub struct Pair<T> { pub first: T, pub second: T }
pub struct Labelled<L, V> { pub label: L, pub value: V }
```

Ein Parameter heißt, dass beide Felder *denselben* Typ haben; `Pair { first: 1, second: "x" }` übersetzt nicht. Zwei Parameter erlauben Unterschiede - so sind `Option<T>`, `Result<T, E>` und `HashMap<K, V>` deklariert. Nimm so viele, wie du brauchst, und nicht mehr: jeder zusätzliche Parameter ist etwas, das der Leser mitführen muss.

## Deine Aufgabe

Implementiere die vier Elemente und erkläre dann, warum `swap` keine Schranke braucht und `largest` schon. Der nächste Step behandelt, wie man das Verhalten definiert, auf das sich eine Schranke bezieht.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo test --test m6-01-generics
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** je Test eine Zeile `test … ok` oder `… FAILED`, danach die Zusammenfassung `test result: ok. 5 passed; 0 failed`, sobald du fertig bist.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

*Die drei Handgriffe sind in jedem Step dieses Kurses dieselben - Terminal öffnen, mit `cd` in die Crate wechseln, den Befehl ausführen. Nur die letzte Zeile unterscheidet sich, und die Fassung dieses Steps steht im Block darüber.*

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
