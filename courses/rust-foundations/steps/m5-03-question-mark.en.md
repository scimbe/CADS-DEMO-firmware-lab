---
id: m5-03-question-mark
title: "The ? operator"
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
    title: "The four ? exercises pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m5-03-question-mark", expectPass: [ "m5_03_question_mark::double_parsed_doubles", "m5_03_question_mark::parse_all_keeps_order", "m5_03_question_mark::sum_lines_ignores_blank_lines", "m5_03_question_mark::parse_size_separates_the_two_failures" ], minPass: 4, timeoutMs: 180000 }
  - id: limits
    title: "You can say where ? stops helping"
    check: { type: "question", prompt: { en: "parse_size cannot use ? for either failure the way the other three do. Two sentences: the rule that decides when ? is available, and what each of the two failures lacks.", de: "parse_size kann ? für keinen der beiden Fehlschläge so nutzen wie die anderen drei. Zwei Sätze: die Regel, die entscheidet, wann ? verfügbar ist, und was jedem der beiden Fehlschläge fehlt." }, rubric: "Judged on the answer. All three criteria must be met: (1) it gives the rule as a conversion, that the operator hands the error to From on its way out and is therefore available exactly where a conversion into the declared error type exists; (2) for the missing separator it says what is absent is an error value at all, because the search reports absence rather than failure, so one has to be produced before there is anything to convert; (3) for the two numbers it says the error value does exist but no conversion into the type the signature declares. Does not pass: the two types merely being different, with no conversion named as the rule; the missing separator explained as a mismatch of types; an answer that rewrites the signature instead of saying what the operator needs.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:limits:failed", question: { en: "For each of the two failures in parse_size, ask first whether an error value exists at all.", de: "Frage bei jedem der beiden Fehlschläge in parse_size zuerst, ob überhaupt ein Fehlerwert existiert." }, hints: [ { en: "`split_once` returns an Option. An Option's None carries no error, so there is nothing for ? to convert yet.", de: "`split_once` liefert ein Option. Das None eines Option trägt keinen Fehler, es gibt also noch nichts, was ? wandeln könnte." }, { en: "The parses do produce an error, so ask instead whether a conversion exists from that error into the type this function declares.", de: "Die Parse-Aufrufe erzeugen einen Fehler; frage also, ob eine Umwandlung von diesem Fehler in den Typ existiert, den diese Funktion deklariert." }, { en: "`?` inserts one call for you, and its name appears in the trait bound the compiler complains about when it is missing.", de: "`?` fügt einen Aufruf ein, und sein Name steht in der Trait-Schranke, die der Compiler beanstandet, wenn sie fehlt." } ] }
  - { trigger: "task:qmark:failed", question: { en: "Which one fails? For `sum_lines`, are blank lines skipped before the parse, and is surrounding whitespace trimmed?", de: "Welche scheitert? Werden in `sum_lines` Leerzeilen vor dem Parsen übersprungen, und wird umgebender Leerraum entfernt?" }, hints: [ { en: "`line.trim()` first, then `if line.is_empty() { continue; }`, then parse with `?`.", de: "Zuerst `line.trim()`, dann `if line.is_empty() { continue; }`, dann mit `?` parsen." }, { en: "`double_parsed` is one line: `Ok(s.parse::<i32>()? * 2)`.", de: "`double_parsed` ist eine Zeile: `Ok(s.parse::<i32>()? * 2)`." }, { en: "`parse_size` needs `s.split_once('x')`, then `ok_or(None)?` for the missing separator and `map_err(Some)?` for each number.", de: "`parse_size` braucht `s.split_once('x')`, dann `ok_or(None)?` für das fehlende Trennzeichen und `map_err(Some)?` für jede Zahl." } ] }
misconceptions:
  - { pattern: "the `\\?` operator can only be used in a function that returns `Result`", question: { en: "You used ? in a function that does not return a Result. Should the function's signature change, or should this call site handle the error itself?", de: "Du hast ? in einer Funktion benutzt, die kein Result liefert. Soll sich die Signatur ändern, oder soll diese Aufrufstelle den Fehler selbst behandeln?" }, hints: [ { en: "`?` returns early from the enclosing function, so that function has to be able to carry an error.", de: "`?` kehrt vorzeitig aus der umgebenden Funktion zurück, diese muss also einen Fehler tragen können." }, { en: "In a test or in main, handle the Result explicitly with `match`, `expect` or `unwrap_or`.", de: "In einem Test oder in main behandle das Result ausdrücklich mit `match`, `expect` oder `unwrap_or`." }, { en: "`?` also works in a function returning `Option`, where it propagates `None`.", de: "`?` funktioniert auch in einer Funktion mit Rückgabetyp `Option`, wo es `None` weiterreicht." } ] }
  - { pattern: "the trait bound `.*: From<.*>` is not satisfied|`\\?` couldn't convert the error", question: { en: "? tried to convert one error type into another and found no conversion. Which two types are they, and do you want a From impl or a map_err at this one call site?", de: "? wollte einen Fehlertyp in einen anderen wandeln und fand keine Umwandlung. Welche zwei Typen sind das, und willst du ein From-Impl oder ein map_err an dieser einen Aufrufstelle?" }, hints: [ { en: "The diagnostic names both types in the `From<...>` bound it could not satisfy.", de: "Die Diagnose nennt beide Typen in der `From<...>`-Schranke, die sie nicht erfüllen konnte." }, { en: "`map_err(...)` before the `?` converts locally and needs no trait implementation.", de: "`map_err(...)` vor dem `?` wandelt lokal und braucht keine Trait-Implementierung." }, { en: "A `From` impl is the better answer when the same conversion is needed in many places - that is the next step.", de: "Ein `From`-Impl ist die bessere Antwort, wenn dieselbe Umwandlung an vielen Stellen gebraucht wird - das ist der nächste Step." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Replace error-propagation boilerplate with `?`, and recognise the two situations in which it does not apply.

It assumes `m5-02-result`: the frame you wrote by hand there is what this operator replaces.

## What `?` expands to

```rust
let n = s.parse::<i32>()?;
```

is, near enough:

```rust
let n = match s.parse::<i32>() {
    Ok(v) => v,
    Err(e) => return Err(From::from(e)),
};
```

On `Ok` it unwraps and carries on. On `Err` it returns from the **enclosing function** immediately, converting the error with `From` on the way. That is the whole operator, and the two halves of the description are exactly the two ways it can fail to apply.

## Where it is available

`?` returns from the function it stands in, so that function must return `Result` (or `Option`, where it propagates `None`). Using it in a `main` or a test that returns `()` is:

```text
error[E0277]: the `?` operator can only be used in a function that returns `Result` or `Option`
```

The fix is either to change the signature - it is fine, and common, for `main` to return `Result<(), Box<dyn Error>>` - or to handle the error here with `match` or `expect`.

## The conversion is the interesting half

`From::from(e)` means `?` works whenever the error can convert into the function's error type. In `double_parsed`, `parse_all` and `sum_lines` the types are already identical - every failure is a `ParseIntError` and that is what the signature declares - so the conversion is the trivial one and `?` is free.

`parse_size` is the counter-example, and it is in this step on purpose:

```rust
pub fn parse_size(s: &str) -> Result<(u32, u32), Option<ParseIntError>>
```

Two failures, and neither of them admits `?` the way the three above do. Look at the two separately - first at what `split_once` even returns when it fails, then at the error type the signature demands - and hold each against the single condition from the previous paragraph. The question below asks for exactly those two findings.

The next step chooses the third option: define an error type and give it the `From` implementation, so `?` becomes free again everywhere inside your module.

## Style note

`?` makes the happy path the only path you read. `sum_lines` is a `for` loop, a `trim`, a skip and one `?`; the error handling is a single character and yet nothing is ignored.

## Your task

Implement the four functions, then explain the rule that decides when `?` is available.

## Running it

::: do palette="> Terminal: Create New Terminal"
Open a terminal: press **F1**, type the entry with its leading `>`, press Enter. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.
> expect: The panel opens at the bottom on its **Terminal** tab, and the prompt ends in `~/workspace`.
> recover: If the palette says *No matching results*, the `>` is missing and it is searching for a file of that name - type it in front and repeat. The menu does the same: **Terminal → New Terminal**.
:::

The terminal starts in `~/workspace`, the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate once per terminal:

```bash
cd ~/workspace/rust-foundations
```

::: do command="cargo test --test m5-03-question-mark" cwd="."
Run this step's tests. The same command sits behind the **Check** button on the *The four ? exercises pass* task.
> expect: One line per test, `test … ok` or `… FAILED`, then the summary `test result: ok. 4 passed; 0 failed` once all 4 pass. The first run takes a few seconds while the crate compiles once; every run after that stays well under a second.
> recover: If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - do it now. If it says `no test target named`, the name after `--test` is wrong; `ls tests/` lists the valid ones.
:::

![A terminal in the bottom panel: the prompt reads coder@…:~/workspace/rust-foundations, with the cargo command and its output below it.](terminal-run-a-step.png)

The **Check** button on the task runs the same command and shows the same output in the tutor panel; it always uses the right folder, so it never needs the `cd`. The terminal is there so you can see it yourself and repeat it. The output appears on the **Terminal** tab, not in **Problems** and not in **Output** - those two show other things and are the usual reason for "nothing happens".
