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
    check: { type: "question", prompt: { en: "parse_size cannot use ? for either failure the way the other three do. Two sentences: the rule that decides when ? is available, and what each of the two failures lacks.", de: "parse_size kann ? für keinen der beiden Fehlschläge so nutzen wie die anderen drei. Zwei Sätze: die Regel, die entscheidet, wann ? verfügbar ist, und was jedem der beiden Fehlschläge fehlt." }, rubric: "Bewertet wird die Antwort. Alle drei Kriterien müssen erfüllt sein: (1) sie gibt die Regel als Umwandlung an, dass der Operator den Fehler auf seinem Weg nach draußen an From übergibt und daher genau dort verfügbar ist, wo eine Umwandlung in den deklarierten Fehlertyp existiert; (2) beim fehlenden Trennzeichen sagt sie, dass überhaupt kein Fehlerwert vorliegt, weil die Suche Abwesenheit meldet und nicht Fehlschlag, einer also erst erzeugt werden muss, ehe es etwas zu wandeln gibt; (3) bei den beiden Zahlen sagt sie, dass der Fehlerwert zwar existiert, aber keine Umwandlung in den Typ, den die Signatur deklariert. Besteht nicht: die beiden Typen seien schlicht verschieden, ohne die Umwandlung als die Regel zu nennen; das fehlende Trennzeichen als Typkonflikt erklärt; oder eine Antwort, die die Signatur umschreibt, statt zu sagen, was der Operator braucht.", recallPrompt: { en: "A function whose error type is an Option has two failures: a missing separator, and numbers that may not parse. Give the rule that decides when ? is available, and say what each of the two lacks.", de: "Eine Funktion, deren Fehlertyp ein Option ist, hat zwei Fehlschläge: ein fehlendes Trennzeichen und Zahlen, die nicht parsen könnten. Nenne die Regel, die entscheidet, wann ? verfügbar ist, und was jedem der beiden fehlt." }, bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:limits:failed", question: { en: "For each of the two failures in parse_size, ask first whether an error value exists at all.", de: "Frage bei jedem der beiden Fehlschläge in parse_size zuerst, ob überhaupt ein Fehlerwert existiert." }, hints: [ { en: "`split_once` returns an Option. An Option's None carries no error, so there is nothing for ? to convert yet.", de: "`split_once` liefert ein Option. Das None eines Option trägt keinen Fehler, es gibt also noch nichts, was ? wandeln könnte." }, { en: "The parses do produce an error, so ask instead whether a conversion exists from that error into the type this function declares.", de: "Die Parse-Aufrufe erzeugen einen Fehler; frage also, ob eine Umwandlung von diesem Fehler in den Typ existiert, den diese Funktion deklariert." }, { en: "`?` inserts one call for you, and its name appears in the trait bound the compiler complains about when it is missing.", de: "`?` fügt einen Aufruf ein, und sein Name steht in der Trait-Schranke, die der Compiler beanstandet, wenn sie fehlt." } ] }
  - { trigger: "task:qmark:failed", question: { en: "Which one fails? For `sum_lines`, are blank lines skipped before the parse, and is surrounding whitespace trimmed?", de: "Welche scheitert? Werden in `sum_lines` Leerzeilen vor dem Parsen übersprungen, und wird umgebender Leerraum entfernt?" }, hints: [ { en: "`line.trim()` first, then `if line.is_empty() { continue; }`, then parse with `?`.", de: "Zuerst `line.trim()`, dann `if line.is_empty() { continue; }`, dann mit `?` parsen." }, { en: "`double_parsed` is one line: `Ok(s.parse::<i32>()? * 2)`.", de: "`double_parsed` ist eine Zeile: `Ok(s.parse::<i32>()? * 2)`." }, { en: "`parse_size` needs `s.split_once('x')`, then `ok_or(None)?` for the missing separator and `map_err(Some)?` for each number.", de: "`parse_size` braucht `s.split_once('x')`, dann `ok_or(None)?` für das fehlende Trennzeichen und `map_err(Some)?` für jede Zahl." } ] }
misconceptions:
  - { pattern: "the `\\?` operator can only be used in a function that returns `Result`", question: { en: "You used ? in a function that does not return a Result. Should the function's signature change, or should this call site handle the error itself?", de: "Du hast ? in einer Funktion benutzt, die kein Result liefert. Soll sich die Signatur ändern, oder soll diese Aufrufstelle den Fehler selbst behandeln?" }, hints: [ { en: "`?` returns early from the enclosing function, so that function has to be able to carry an error.", de: "`?` kehrt vorzeitig aus der umgebenden Funktion zurück, diese muss also einen Fehler tragen können." }, { en: "In a test or in main, handle the Result explicitly with `match`, `expect` or `unwrap_or`.", de: "In einem Test oder in main behandle das Result ausdrücklich mit `match`, `expect` oder `unwrap_or`." }, { en: "`?` also works in a function returning `Option`, where it propagates `None`.", de: "`?` funktioniert auch in einer Funktion mit Rückgabetyp `Option`, wo es `None` weiterreicht." } ] }
  - { pattern: "the trait bound `.*: From<.*>` is not satisfied|`\\?` couldn't convert the error", question: { en: "? tried to convert one error type into another and found no conversion. Which two types are they, and do you want a From impl or a map_err at this one call site?", de: "? wollte einen Fehlertyp in einen anderen wandeln und fand keine Umwandlung. Welche zwei Typen sind das, und willst du ein From-Impl oder ein map_err an dieser einen Aufrufstelle?" }, hints: [ { en: "The diagnostic names both types in the `From<...>` bound it could not satisfy.", de: "Die Diagnose nennt beide Typen in der `From<...>`-Schranke, die sie nicht erfüllen konnte." }, { en: "`map_err(...)` before the `?` converts locally and needs no trait implementation.", de: "`map_err(...)` vor dem `?` wandelt lokal und braucht keine Trait-Implementierung." }, { en: "A `From` impl is the better answer when the same conversion is needed in many places - that is the next step.", de: "Ein `From`-Impl ist die bessere Antwort, wenn dieselbe Umwandlung an vielen Stellen gebraucht wird - das ist der nächste Step." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Ersetze den Rahmen zur Fehlerweitergabe durch `?` und erkenne die zwei Situationen, in denen er nicht anwendbar ist.

Vorausgesetzt ist `m5-02-result`: der Rahmen, den du dort von Hand geschrieben hast, ist das, was dieser Operator ersetzt.

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

Zwei Fehlschläge, und keiner von beiden lässt `?` so zu wie oben. Sieh dir die beiden einzeln an - erst, was `split_once` im Fehlfall überhaupt liefert, dann, welchen Fehlertyp die Signatur verlangt - und halte jeden gegen die eine Bedingung des vorigen Absatzes. Die Frage unten verlangt genau diese beiden Befunde.

Der nächste Step wählt die dritte Möglichkeit: einen Fehlertyp definieren und ihm die `From`-Implementierung geben, sodass `?` innerhalb deines Moduls überall wieder kostenlos wird.

## Anmerkung zum Stil

`?` macht den guten Pfad zum einzigen, den man liest. `sum_lines` ist eine `for`-Schleife, ein `trim`, ein Überspringen und ein `?`; die Fehlerbehandlung ist ein einzelnes Zeichen, und doch wird nichts ignoriert.

## Deine Aufgabe

Implementiere die vier Funktionen und erkläre dann die Regel, die entscheidet, wann `?` verfügbar ist.

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

::: do command="cargo test --test m5-03-question-mark" cwd="."
Führe die Tests dieses Steps aus. Derselbe Befehl steckt hinter dem Knopf **Prüfen** an der Aufgabe *Die vier ?-Übungen bestehen*.
> expect: Je Test eine Zeile `test … ok` oder `… FAILED`, darunter die Zusammenfassung `test result: ok. 4 passed; 0 failed`, sobald alle 4 bestehen. Der erste Lauf braucht ein paar Sekunden, weil die Crate einmal übersetzt wird; jeder weitere bleibt deutlich unter einer Sekunde.
> recover: Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - hole es nach. Meldet es `no test target named`, stimmt der Name hinter `--test` nicht; `ls tests/` listet die gültigen Namen auf.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
