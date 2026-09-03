---
id: m5-03-question-mark
title: "Der ?-Operator"
bloom: apply
objectives: [ "rust-ch09-02-recoverable-errors-with-result" ]
requires: [ "m5-02-result" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m5-02-result" ]
links:
  - { step: "m5-04-custom-error" }
  - { file: "src/m5/m5_03_question_mark.rs" }
  - { file: "tests/m5-03-question-mark.rs" }
  - { url: "https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html", title: "The Book, 9.2: A Shortcut for Propagating Errors: the ? Operator" }
sources: [ "src/m5/m5_03_question_mark.rs", "tests/m5-03-question-mark.rs", "src/m5/m5_02_result.rs" ]
tasks:
  - id: qmark
    title: "Die vier ?-Übungen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m5-03-question-mark", expectPass: [ "m5_03_question_mark::double_parsed_doubles", "m5_03_question_mark::parse_all_keeps_order", "m5_03_question_mark::sum_lines_ignores_blank_lines", "m5_03_question_mark::parse_size_separates_the_two_failures" ], minPass: 4, timeoutMs: 180000 }
  - id: limits
    title: "Du kannst sagen, wo ? nicht mehr hilft"
    check: { type: "question", prompt: { en: "parse_size cannot use ? for both of its failures the way the other three functions do. Explain the rule that decides when ? is available, and say which of the two failures in parse_size breaks it and why.", de: "parse_size kann ? nicht für beide Fehlschläge so nutzen wie die anderen drei Funktionen. Erkläre die Regel, die entscheidet, wann ? verfügbar ist, und sage, welcher der beiden Fehlschläge in parse_size sie bricht und warum." }, rubric: "States that ? converts the error via From into the function's error type, so it works whenever such a conversion exists - here every parse yields ParseIntError, matching the declared error type. The missing 'x' produces no error value at all (split_once returns an Option), so it must first be turned into one with ok_or, and the error type Option<ParseIntError> has no From impl from ParseIntError, which is why map_err(Some) is needed on the parses.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:qmark:failed", question: { en: "Which one fails? For `sum_lines`, are blank lines skipped before the parse, and is surrounding whitespace trimmed?", de: "Welche scheitert? Werden in `sum_lines` Leerzeilen vor dem Parsen übersprungen, und wird umgebender Leerraum entfernt?" }, hints: [ { en: "`line.trim()` first, then `if line.is_empty() { continue; }`, then parse with `?`.", de: "Zuerst `line.trim()`, dann `if line.is_empty() { continue; }`, dann mit `?` parsen." }, { en: "`double_parsed` is one line: `Ok(s.parse::<i32>()? * 2)`.", de: "`double_parsed` ist eine Zeile: `Ok(s.parse::<i32>()? * 2)`." }, { en: "`parse_size` needs `s.split_once('x')`, then `ok_or(None)?` for the missing separator and `map_err(Some)?` for each number.", de: "`parse_size` braucht `s.split_once('x')`, dann `ok_or(None)?` für das fehlende Trennzeichen und `map_err(Some)?` für jede Zahl." } ] }
misconceptions:
  - { pattern: "the `\\?` operator can only be used in a function that returns `Result`", question: { en: "You used ? in a function that does not return a Result. Should the function's signature change, or should this call site handle the error itself?", de: "Du hast ? in einer Funktion benutzt, die kein Result liefert. Soll sich die Signatur ändern, oder soll diese Aufrufstelle den Fehler selbst behandeln?" }, hints: [ { en: "`?` returns early from the enclosing function, so that function has to be able to carry an error.", de: "`?` kehrt vorzeitig aus der umgebenden Funktion zurück, diese muss also einen Fehler tragen können." }, { en: "In a test or in main, handle the Result explicitly with `match`, `expect` or `unwrap_or`.", de: "In einem Test oder in main behandle das Result ausdrücklich mit `match`, `expect` oder `unwrap_or`." }, { en: "`?` also works in a function returning `Option`, where it propagates `None`.", de: "`?` funktioniert auch in einer Funktion mit Rückgabetyp `Option`, wo es `None` weiterreicht." } ] }
  - { pattern: "the trait bound `.*: From<.*>` is not satisfied|`\\?` couldn't convert the error", question: { en: "? tried to convert one error type into another and found no conversion. Which two types are they, and do you want a From impl or a map_err at this one call site?", de: "? wollte einen Fehlertyp in einen anderen wandeln und fand keine Umwandlung. Welche zwei Typen sind das, und willst du ein From-Impl oder ein map_err an dieser einen Aufrufstelle?" }, hints: [ { en: "The diagnostic names both types in the `From<...>` bound it could not satisfy.", de: "Die Diagnose nennt beide Typen in der `From<...>`-Schranke, die sie nicht erfüllen konnte." }, { en: "`map_err(...)` before the `?` converts locally and needs no trait implementation.", de: "`map_err(...)` vor dem `?` wandelt lokal und braucht keine Trait-Implementierung." }, { en: "A `From` impl is the better answer when the same conversion is needed in many places - that is the next step.", de: "Ein `From`-Impl ist die bessere Antwort, wenn dieselbe Umwandlung an vielen Stellen gebraucht wird - das ist der nächste Step." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Ersetze den Rahmen zur Fehlerweitergabe durch `?` und erkenne die zwei Situationen, in denen er nicht anwendbar ist.

## Wozu `?` sich entfaltet

```rust
let n = s.parse::<i32>()?;
```

ist näherungsweise:

```rust
let n = match s.parse::<i32>() {
    Ok(v) => v,
    Err(e) => return Err(From::from(e)),
};
```

Bei `Ok` packt es aus und macht weiter. Bei `Err` kehrt es sofort aus der **umgebenden Funktion** zurück und wandelt den Fehler unterwegs mit `From`. Das ist der ganze Operator, und die beiden Hälften der Beschreibung sind genau die beiden Arten, wie er nicht anwendbar sein kann.

## Wo er verfügbar ist

`?` kehrt aus der Funktion zurück, in der es steht, diese muss also `Result` liefern (oder `Option`, wo es `None` weiterreicht). In einer `main` oder einem Test mit Rückgabetyp `()` ergibt es:

```text
error[E0277]: the `?` operator can only be used in a function that returns `Result` or `Option`
```

Die Lösung ist entweder, die Signatur zu ändern - es ist üblich und in Ordnung, dass `main` ein `Result<(), Box<dyn Error>>` liefert - oder den Fehler hier mit `match` oder `expect` zu behandeln.

## Die Umwandlung ist die interessante Hälfte

`From::from(e)` bedeutet, dass `?` funktioniert, sobald sich der Fehler in den Fehlertyp der Funktion umwandeln lässt. In `double_parsed`, `parse_all` und `sum_lines` sind die Typen bereits identisch - jeder Fehlschlag ist ein `ParseIntError`, und genau das deklariert die Signatur - die Umwandlung ist also die triviale und `?` kostenlos.

`parse_size` ist das Gegenbeispiel und steht mit Absicht in diesem Step:

```rust
pub fn parse_size(s: &str) -> Result<(u32, u32), Option<ParseIntError>>
```

Zwei Fehlschläge verschiedener Art. Ein fehlendes `x` erzeugt **gar keinen Fehlerwert** - `split_once` liefert ein `Option` - es gibt also nichts für `?` zu wandeln, bis du mit `ok_or(None)` einen erzeugst. Und die Zahlen erzeugen zwar einen `ParseIntError`, aber der Fehlertyp der Funktion ist `Option<ParseIntError>`, und keine `From`-Implementierung verbindet die beiden - jedes Parsen braucht also `map_err(Some)` vor seinem `?`.

Das ist die ehrliche Grenze. Existiert die Umwandlung, ist `?` unsichtbar; existiert sie nicht, schreibst du sie einmal am Rand. Der nächste Step wählt die dritte Möglichkeit: einen Fehlertyp definieren und ihm die `From`-Implementierung geben, sodass `?` innerhalb deines Moduls überall wieder kostenlos wird.

## Anmerkung zum Stil

`?` macht den guten Pfad zum einzigen, den man liest. `sum_lines` ist eine `for`-Schleife, ein `trim`, ein Überspringen und ein `?`; die Fehlerbehandlung ist ein einzelnes Zeichen, und doch wird nichts ignoriert.

## Deine Aufgabe

Implementiere die vier Funktionen und erkläre dann die Regel, die entscheidet, wann `?` verfügbar ist.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo test --test m5-03-question-mark
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** je Test eine Zeile `test … ok` oder `… FAILED`, danach die Zusammenfassung `test result: ok. 4 passed; 0 failed`, sobald du fertig bist.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
