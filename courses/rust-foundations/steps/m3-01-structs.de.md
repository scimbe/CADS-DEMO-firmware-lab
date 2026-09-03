---
id: m3-01-structs
title: "Structs: Werte, die zusammengehören"
bloom: apply
objectives: [ "rust-ch05-01-defining-structs" ]
requires: [ "m2-04-slices" ]
estimatedMinutes: 20
scaffold: worked
recallFrom: [ "m1-03-copy-types" ]
links:
  - { step: "m3-02-enums" }
  - { file: "src/m3/m3_01_structs.rs" }
  - { file: "tests/m3-01-structs.rs" }
  - { url: "https://doc.rust-lang.org/book/ch05-01-defining-structs.html", title: "The Book, 5.1: Defining and Instantiating Structs" }
sources: [ "src/m3/m3_01_structs.rs", "tests/m3-01-structs.rs" ]
tasks:
  - id: structs
    title: "Alle sechs Struct-Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-01-structs", expectPass: [ "m3_01_structs::new_rectangle_sets_both_fields", "m3_01_structs::area_multiplies_and_borrows", "m3_01_structs::square_has_equal_sides", "m3_01_structs::widened_changes_only_the_width", "m3_01_structs::enrol_starts_active", "m3_01_structs::deactivate_changes_only_active" ], minPass: 6, timeoutMs: 180000 }
  - id: update-syntax
    title: "Du kannst erklären, warum ..s verbraucht und ..*r nicht"
    check: { type: "question", prompt: { en: "deactivate consumes its Student, widened leaves its Rectangle intact. Two sentences: which leftover field type forces that difference, and the error a &Student version would produce.", de: "deactivate verbraucht seinen Student, widened lässt sein Rectangle unberührt. Zwei Sätze: welcher übrige Feldtyp diesen Unterschied erzwingt, und der Fehler, den eine &Student-Fassung erzeugen würde." }, rubric: "First sentence: the leftover field. Rectangle leaves only u32, which is Copy, so `..*r` copies it and nothing is moved out of the reference; Student leaves a String, which is not Copy, so it has to be moved out of a value the function owns. Second sentence: E0507, cannot move out of a shared reference. Does not pass: saying that `..` copies rather than moves, naming a borrow-checker error other than E0507, or answering with the parameter types instead of the leftover field types.", bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:update-syntax:failed", question: { en: "List the fields each `..` has to supply. Which of those owns something on the heap?", de: "Nenne die Felder, die jedes `..` liefern muss. Welches davon besitzt etwas auf dem Heap?" }, hints: [ { en: "In `widened` the named field is width, so `..` supplies height. In `deactivate` the named field is active, so `..` supplies the other two.", de: "In `widened` ist width genannt, `..` liefert also height. In `deactivate` ist active genannt, `..` liefert also die beiden anderen." }, { en: "Ask of each leftover field whether duplicating its bits would give a second valid value - that is the m1-03 question again.", de: "Frage bei jedem übrigen Feld, ob das Verdoppeln seiner Bits einen zweiten gültigen Wert ergäbe - das ist wieder die Frage aus m1-03." }, { en: "Taking a non-Copy field out of something you only borrowed has its own error code in the 05xx range, and its message begins `cannot move out of`.", de: "Ein Nicht-Copy-Feld aus etwas zu nehmen, das man nur geliehen hat, hat einen eigenen Fehlercode im Bereich 05xx, und die Meldung beginnt mit `cannot move out of`." } ] }
  - { trigger: "task:structs:failed", question: { en: "Which function fails? For `widened`, is the height in your result the original one, or has it been scaled too?", de: "Welche Funktion scheitert? Ist bei `widened` die Höhe im Ergebnis die ursprüngliche, oder wurde sie mitskaliert?" }, hints: [ { en: "`widened` changes only `width`; `..*r` supplies the rest, so `height` must not appear in the literal.", de: "`widened` ändert nur `width`; `..*r` liefert den Rest, `height` darf also nicht im Literal stehen." }, { en: "In `new_rectangle` and `enrol` the parameters already carry the field names, so the shorthand `Rectangle { width, height }` applies.", de: "In `new_rectangle` und `enrol` tragen die Parameter bereits die Feldnamen, die Kurzform `Rectangle { width, height }` gilt also." }, { en: "`area` takes `&Rectangle`; read the fields through the reference, no dereference operator needed.", de: "`area` nimmt `&Rectangle`; lies die Felder über die Referenz, ein Dereferenzierungsoperator ist nicht nötig." } ] }
misconceptions:
  - { pattern: "error\\[E0507\\]: cannot move out of", question: { en: "You are taking an owned field out of something you only borrowed. Does the function need to own that field, or would a clone or a reference do?", de: "Du entnimmst ein besitzendes Feld aus etwas, das du nur geliehen hast. Muss die Funktion dieses Feld besitzen, oder täte es ein Klon oder eine Referenz?" }, hints: [ { en: "Struct update syntax moves every field it fills in; `..*r` on a reference only works when those fields are `Copy`.", de: "Die Struct-Update-Syntax verschiebt jedes Feld, das sie füllt; `..*r` an einer Referenz geht nur, wenn diese Felder `Copy` sind." }, { en: "Change the parameter to take the struct by value if the function is meant to consume it.", de: "Nimm die Struktur per Wert, wenn die Funktion sie verbrauchen soll." }, { en: "`.clone()` on the single field is the local fix when the caller must keep its value.", de: "`.clone()` auf dem einzelnen Feld ist die lokale Lösung, wenn der Aufrufer seinen Wert behalten muss." } ] }
  - { pattern: "error\\[E0063\\]: missing field", question: { en: "A struct literal is incomplete. Which field did you leave out, and did you mean to supply it from another instance?", de: "Ein Struct-Literal ist unvollständig. Welches Feld fehlt, und wolltest du es aus einer anderen Instanz übernehmen?" }, hints: [ { en: "Every field must be given a value; there are no defaults unless you implement `Default`.", de: "Jedes Feld braucht einen Wert; Vorgaben gibt es nur, wenn du `Default` implementierst." }, { en: "`..other` at the end of the literal fills in every field you did not name.", de: "`..other` am Ende des Literals füllt jedes nicht genannte Feld." }, { en: "The `..` entry must come last and needs no trailing comma.", de: "Der `..`-Eintrag muss zuletzt stehen und braucht kein nachgestelltes Komma." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Definiere eine Struktur, instanziiere sie auf drei Arten und sage vorher, welche dieser Arten den Wert verbraucht, aus dem sie kopiert.

## Warum eine Struktur statt eines Tupels

`(30, 50)` und `Rectangle { width: 30, height: 50 }` enthalten dieselben zwei Zahlen. Der Unterschied ist, dass die zweite Form nicht verdreht werden kann. Eine Funktion mit Tupelparameter muss dokumentieren, welches Element was ist, und dem Aufrufer vertrauen; eine Funktion mit `Rectangle` kann auf diese Weise gar nicht falsch aufgerufen werden. Kapitel 5.1 führt dasselbe Argument, indem es eine `area`-Funktion durch beide Formen refaktoriert.

## Definieren und instanziieren

```rust
#[derive(Debug, Clone, PartialEq)]
pub struct Rectangle {
    pub width: u32,
    pub height: u32,
}
```

`derive` erzeugt Trait-Implementierungen mechanisch: `Debug` ermöglicht die Ausgabe mit `{:?}`, `Clone` liefert `.clone()`, `PartialEq` liefert `==`. Die Tests brauchen alle drei. `pub` an der Struktur und an jedem Feld steuert die Sichtbarkeit getrennt - ein Feld ohne `pub` wäre für den Test unsichtbar.

Beim Instanziieren wird jedes Feld genannt. Vorgaben gibt es nicht; lässt du eines weg, erhältst du `error[E0063]: missing field`.

## Kurzform der Feldinitialisierung

Trägt eine Variable bereits den Feldnamen, schreibe ihn einmal:

```rust
pub fn new_rectangle(width: u32, height: u32) -> Rectangle {
    Rectangle { width, height }
}
```

Kein Sonderfall für Konstruktoren - das gilt überall, wo die Namen übereinstimmen.

## Struct-Update-Syntax und ihr Ownership-Haken

`..other` füllt jedes nicht genannte Feld und muss zuletzt stehen:

```rust
pub fn widened(r: &Rectangle, factor: u32) -> Rectangle {
    Rectangle { width: r.width * factor, ..*r }
}
```

Hier lohnt es sich, langsamer zu lesen. `..` **verschiebt** die Felder, die es übernimmt. Ob das ein Problem ist, hängt davon ab, welche Felder es übernimmt; sieh dir also in beiden Funktionen an, was jeweils übrig bleibt, bevor du entscheidest.

Vergleiche `Student`, der einen `String` besitzt:

```rust
pub fn deactivate(s: Student) -> Student {
    Student { active: false, ..s }
}
```

Der Parameter steht hier per Wert, `widened` nimmt eine Referenz. Die Unterscheidung zwischen `Copy` und Nicht-`Copy` aus M1 entscheidet, welches von beiden jede Funktion darf, und die Frage unten verlangt, das erzwingende Feld zu benennen.

## Deine Aufgabe

Implementiere die sechs Funktionen und erkläre dann den Unterschied zwischen `..s` und `..*r`. Als Nächstes: Enums, für Daten, die eine von mehreren Formen sind statt alle von mehreren Feldern.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo test --test m3-01-structs
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** je Test eine Zeile `test … ok` oder `… FAILED`, danach die Zusammenfassung `test result: ok. 6 passed; 0 failed`, sobald du fertig bist.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

*Die drei Handgriffe sind in jedem Step dieses Kurses dieselben - Terminal öffnen, mit `cd` in die Crate wechseln, den Befehl ausführen. Nur die letzte Zeile unterscheidet sich, und die Fassung dieses Steps steht im Block darüber.*

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
