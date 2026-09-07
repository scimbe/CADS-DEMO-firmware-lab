---
id: m1-03-copy-types
title: "Copy-Typen: wenn eine Zuweisung kein Move ist"
bloom: understand
objectives: [ "rust-ch04-01-what-is-ownership" ]
requires: [ "m1-02-move-vs-clone" ]
estimatedMinutes: 20
scaffold: faded
links:
  - { step: "m1-04-ownership-and-functions" }
  - { file: "src/m1/m1_03_copy_types.rs" }
  - { file: "tests/m1-03-copy-types.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html", title: "The Book, 4.1: Stack-Only Data: Copy" }
sources: [ "src/m1/m1_03_copy_types.rs", "tests/m1-03-copy-types.rs" ]
tasks:
  - id: copy
    title: "Point ist Copy und mirror funktioniert"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m1-03-copy-types", expectPass: [ "m1_03_copy_types::sum_twice_doubles", "m1_03_copy_types::mirror_negates_x", "m1_03_copy_types::mirror_of_origin_is_origin" ], minPass: 3, timeoutMs: 180000 }
  - id: derive
    title: "Point leitet Copy ab"
    check: { type: "all", checks: [ { type: "fileMatches", file: "src/m1/m1_03_copy_types.rs", pattern: "#\\[derive\\([^)]*\\bCopy\\b[^)]*\\)\\]" }, { type: "fileNotMatches", file: "src/m1/m1_03_copy_types.rs", pattern: "\\.clone\\(\\)" } ] }
  - id: why-not-string
    title: "Du kannst sagen, warum String nicht Copy sein kann"
    check: { type: "question", prompt: { en: "A String field would make #[derive(Copy)] on Point fail. Two sentences: what two bitwise copies of one String do at the end of their scopes, and why Clone is allowed where Copy is not.", de: "Ein String-Feld ließe #[derive(Copy)] an Point scheitern. Zwei Sätze: was zwei bitweise Kopien eines String am Ende ihrer Gültigkeitsbereiche tun, und warum Clone erlaubt ist, wo Copy es nicht ist." }, rubric: "Erster Satz: beide Kopien halten denselben Heap-Zeiger und führen beide drop aus, dieselbe Allokation wird also zweimal freigegeben. Zweiter Satz: Clone legt einen zweiten Puffer an, jeder Eigentümer gibt daher seinen eigenen frei. Besteht nicht: nur sagen, String sei nicht Copy, weil er auf dem Heap liegt, ohne beide Kopien bis zu ihrem drop zu verfolgen; oder die Regel nennen, dass Copy und Drop einander ausschließen, ohne den Mechanismus dahinter.", recallPrompt: { en: "A struct with a String field cannot derive Copy. What would two bitwise copies of one String do at the end of their scopes, and why is Clone allowed where Copy is not?", de: "Eine Struktur mit einem String-Feld kann Copy nicht ableiten. Was täten zwei bitweise Kopien eines Strings am Ende ihrer Gültigkeitsbereiche, und warum ist Clone erlaubt, wo Copy es nicht ist?" }, bloom: "analyze", minChars: 50 }
socratic:
  - { trigger: "task:derive:failed", question: { en: "This check looks at two things in one file. Is Copy missing from the derive list, or is a .clone() still standing somewhere?", de: "Diese Prüfung sieht zwei Dinge in derselben Datei an. Fehlt Copy in der derive-Liste, oder steht irgendwo noch ein .clone()?" }, hints: [ { en: "The task is not that the tests go green, it is that they go green without a clone. Ask which of those two conditions your last repair broke - a clone that makes a test pass fails this check on purpose.", de: "Die Aufgabe ist nicht, dass die Tests grün werden, sondern dass sie ohne Klon grün werden. Frage, welche der beiden Bedingungen dein letzter Reparaturversuch verletzt hat - ein Klon, der einen Test bestehen lässt, lässt diese Prüfung absichtlich scheitern." }, { en: "Open `src/m1/m1_03_copy_types.rs`. Look at the `#[derive(...)]` line above `Point` first, then search the same file for `clone` with Ctrl+F.", de: "Öffne `src/m1/m1_03_copy_types.rs`. Sieh dir zuerst die `#[derive(...)]`-Zeile über `Point` an, danach durchsuche dieselbe Datei mit Strg+F nach `clone`." }, { en: "Copy never stands alone - the derive list has to carry Clone beside it or the attribute will not compile. And a `.clone()` you added earlier to get around a move becomes pointless once the type is Copy: remove it rather than leave it standing.", de: "Copy steht nie allein - die derive-Liste muss Clone daneben tragen, sonst kompiliert das Attribut nicht. Und ein `.clone()`, das du früher eingefügt hast, um einen Move zu umgehen, wird mit abgeleitetem Copy gegenstandslos: entferne es, statt es stehenzulassen." } ] }
  - { trigger: "task:why-not-string:failed", question: { en: "How many times is drop called on a value that was bit-copied once, and how many allocations exist?", de: "Wie oft wird drop auf einem einmal bitweise kopierten Wert aufgerufen, und wie viele Allokationen gibt es?" }, hints: [ { en: "A String is three stack words: a pointer, a length, a capacity. Copying the words does not copy what the pointer points at.", de: "Ein String besteht aus drei Stack-Wörtern: Zeiger, Länge, Kapazität. Die Wörter zu kopieren kopiert nicht, worauf der Zeiger zeigt." }, { en: "Each of the two copies leaves its scope separately, and each runs the same destructor on the same address.", de: "Jede der beiden Kopien verlässt ihren Gültigkeitsbereich einzeln, und jede führt denselben Destruktor auf derselben Adresse aus." }, { en: "Freeing one allocation twice is the bug the ownership rules exist to make unrepresentable - rule 2 from m1-01 is the same rule seen from the other side.", de: "Eine Allokation zweimal freizugeben ist der Fehler, den die Ownership-Regeln undarstellbar machen sollen - Regel 2 aus m1-01 ist dieselbe Regel von der anderen Seite." } ] }
  - { trigger: "task:copy:failed", question: { en: "Does the test binary compile at all, or does it fail before any test runs? A trait bound that is not satisfied is a compile error, not a failed assertion.", de: "Kompiliert das Testbinary überhaupt, oder scheitert es, bevor ein Test läuft? Eine nicht erfüllte Trait-Schranke ist ein Compilerfehler, keine fehlgeschlagene Zusicherung." }, hints: [ { en: "`assert_is_copy::<Point>()` only compiles once `Point` implements `Copy`; the derive list on the struct is where you say so.", de: "`assert_is_copy::<Point>()` kompiliert erst, wenn `Point` das Trait `Copy` implementiert; die derive-Liste an der Struktur ist die Stelle dafür." }, { en: "`Copy` requires `Clone`: derive both, `#[derive(Debug, PartialEq, Clone, Copy)]`.", de: "`Copy` setzt `Clone` voraus: leite beide ab, `#[derive(Debug, PartialEq, Clone, Copy)]`." }, { en: "With `Copy` in place, `mirror` may use `p` twice - once as itself and once to build the mirrored point.", de: "Mit `Copy` darf `mirror` `p` zweimal verwenden - einmal als sich selbst und einmal für den gespiegelten Punkt." } ] }
misconceptions:
  - { pattern: "the trait bound `.*: Copy` is not satisfied", question: { en: "The compiler is being asked for a Copy that does not exist. Which type is missing the derive, and are all of its fields themselves Copy?", de: "Es wird ein Copy verlangt, das es nicht gibt. Welchem Typ fehlt das derive, und sind alle seine Felder selbst Copy?" }, hints: [ { en: "`#[derive(Copy)]` on a struct compiles only when every field is `Copy` as well.", de: "`#[derive(Copy)]` an einer Struktur kompiliert nur, wenn auch jedes Feld `Copy` ist." }, { en: "`Copy` cannot stand alone: it requires `Clone` in the same derive list.", de: "`Copy` steht nicht allein: es verlangt `Clone` in derselben derive-Liste." }, { en: "All integer, floating-point, boolean and character types are Copy, and so are tuples of them.", de: "Alle Ganzzahl-, Gleitkomma-, Wahrheitswert- und Zeichentypen sind Copy, ebenso Tupel daraus." } ] }
  - { pattern: "error\\[E0382\\]: use of moved value", question: { en: "A value was used twice. Is its type one that should have been Copy, or is this a genuine move you need to plan around?", de: "Ein Wert wurde zweimal genutzt. Ist sein Typ einer, der Copy sein sollte, oder ist das ein echter Move, um den du herumplanen musst?" }, hints: [ { en: "If the type is a struct of integers, adding `Copy` to its derive list removes the error at no cost.", de: "Ist der Typ eine Struktur aus Ganzzahlen, beseitigt `Copy` in der derive-Liste den Fehler kostenlos." }, { en: "If it owns heap data, `Copy` is not available; read the field once into a local before moving the value.", de: "Besitzt er Heap-Daten, ist `Copy` nicht möglich; lies das Feld einmal in eine lokale Variable, bevor du den Wert verschiebst." }, { en: "The diagnostic's `move occurs because … does not implement the Copy trait` line names the type for you.", de: "Die Zeile `move occurs because … does not implement the Copy trait` der Diagnose nennt dir den Typ." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Erkläre, warum `let y = x;` einen `String` verschiebt, ein `i32` aber nicht - und bringe eine eigene Struktur dazu, sich wie das Zweite zu verhalten.

## Die Ausnahme von der Move-Regel

```rust
let x = 5;
let y = x;
println!("{x} and {y}");
```

Das kompiliert, obwohl die Form dieselbe ist wie im `String`-Fall, der es nicht tat. Der Unterschied ist das Trait `Copy`. Ein Typ ist `Copy`, wenn das Verdoppeln seiner Bits einen gültigen, unabhängigen zweiten Wert ergibt - das gilt für alles, was vollständig auf dem Stack liegt und dessen Größe zur Übersetzungszeit feststeht: alle Ganzzahlen, `f32`/`f64`, `bool`, `char` sowie Tupel, deren Bestandteile alle `Copy` sind.

Für solche Typen gibt es keinen Move. `x` bleibt nutzbar, weil `y` nichts mit ihm teilt; es gibt nichts zu teilen.

## Copy und Drop schließen einander aus

Rust verweigert `Copy` für jeden Typ, der `Drop` implementiert. Finde vor dem Weiterlesen selbst heraus, warum: nimm die drei Stack-Wörter eines `String`, verdopple sie bitweise und verfolge beide Kopien bis zum Ende ihres Gültigkeitsbereichs. `String`, `Vec<T>` und jeder Typ mit Heap-Besitz sind nie `Copy`; `Clone` - eine ausdrückliche, möglicherweise teure tiefe Kopie - ist das, was es für sie stattdessen gibt.

## Copy für die eigene Struktur anfordern

```rust
#[derive(Debug, PartialEq)]
pub struct Point {
    pub x: i32,
    pub y: i32,
}
```

Beide Felder sind `Copy`, `Point` *könnte* es also sein - ist es aber erst, wenn du es sagst. `derive` erzeugt Trait-Implementierungen mechanisch; `Copy` verlangt `Clone` daneben, denn `Copy` ist definiert als ein `Clone`, das eine reine Bitkopie ist.

Ob ein Typ `Copy` ist, entscheidet sich zur Übersetzungszeit. Ein Test könnte das mit einer Schranke festnageln:

```rust
fn assert_is_copy<T: Copy>() {}   // leerer Rumpf, prüft zur Laufzeit nichts
assert_is_copy::<Point>();        // der Compiler prüft die Schranke
```

Genau das steht hier bewusst **nicht** im Test. Solange das derive fehlte, ließe sich diese Testdatei nicht übersetzen, und ein einziges nicht übersetzbares Testziel bricht ein `cargo test` über den ganzen Workspace ab, bevor irgendein Test läuft - du sähest einen Fehler aus M1, während du an M5 arbeitest. Der Step prüft das derive deshalb, indem er die Quelldatei liest (`fileMatches` auf `#[derive(…Copy…)]`), und verbietet zugleich ein `.clone()` in dieser Datei, damit die Ableitung nicht umgangen wird.

Die Semantik beweist `mirror`: es nutzt `p` zweimal, ohne zu klonen, und das übersetzt nur, wenn `Point` `Copy` ist.

## Deine Aufgabe

Ergänze die derives, die `Point` braucht, implementiere `mirror` und beantworte, warum ein `String`-Feld das unmöglich machen würde.

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

::: do command="cargo test --test m1-03-copy-types" cwd="."
Führe die Tests dieses Steps aus. Derselbe Befehl steckt hinter dem Knopf **Prüfen** an der Aufgabe *Point ist Copy und mirror funktioniert*.
> expect: Je Test eine Zeile `test … ok` oder `… FAILED`, darunter die Zusammenfassung `test result: ok. 3 passed; 0 failed`, sobald alle 3 bestehen. Der erste Lauf braucht ein paar Sekunden, weil die Crate einmal übersetzt wird; jeder weitere bleibt deutlich unter einer Sekunde.
> recover: Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - hole es nach. Meldet es `no test target named`, stimmt der Name hinter `--test` nicht; `ls tests/` listet die gültigen Namen auf.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
