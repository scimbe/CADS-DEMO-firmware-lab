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
    check: { type: "question", prompt: { en: "parse_size cannot use ? for both of its failures the way the other three functions do. Explain the rule that decides when ? is available, and say which of the two failures in parse_size breaks it and why.", de: "parse_size kann ? nicht fuer beide Fehlschlaege so nutzen wie die anderen drei Funktionen. Erklaere die Regel, die entscheidet, wann ? verfuegbar ist, und sage, welcher der beiden Fehlschlaege in parse_size sie bricht und warum." }, rubric: "States that ? converts the error via From into the function's error type, so it works whenever such a conversion exists - here every parse yields ParseIntError, matching the declared error type. The missing 'x' produces no error value at all (split_once returns an Option), so it must first be turned into one with ok_or, and the error type Option<ParseIntError> has no From impl from ParseIntError, which is why map_err(Some) is needed on the parses.", bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:qmark:failed", question: { en: "Which one fails? For `sum_lines`, are blank lines skipped before the parse, and is surrounding whitespace trimmed?", de: "Welche scheitert? Werden in `sum_lines` Leerzeilen vor dem Parsen uebersprungen, und wird umgebender Leerraum entfernt?" }, hints: [ { en: "`line.trim()` first, then `if line.is_empty() { continue; }`, then parse with `?`.", de: "Zuerst `line.trim()`, dann `if line.is_empty() { continue; }`, dann mit `?` parsen." }, { en: "`double_parsed` is one line: `Ok(s.parse::<i32>()? * 2)`.", de: "`double_parsed` ist eine Zeile: `Ok(s.parse::<i32>()? * 2)`." }, { en: "`parse_size` needs `s.split_once('x')`, then `ok_or(None)?` for the missing separator and `map_err(Some)?` for each number.", de: "`parse_size` braucht `s.split_once('x')`, dann `ok_or(None)?` fuer das fehlende Trennzeichen und `map_err(Some)?` fuer jede Zahl." } ] }
misconceptions:
  - { pattern: "the `\\?` operator can only be used in a function that returns `Result`", question: { en: "You used ? in a function that does not return a Result. Should the function's signature change, or should this call site handle the error itself?", de: "Du hast ? in einer Funktion benutzt, die kein Result liefert. Soll sich die Signatur aendern, oder soll diese Aufrufstelle den Fehler selbst behandeln?" }, hints: [ { en: "`?` returns early from the enclosing function, so that function has to be able to carry an error.", de: "`?` kehrt vorzeitig aus der umgebenden Funktion zurueck, diese muss also einen Fehler tragen koennen." }, { en: "In a test or in main, handle the Result explicitly with `match`, `expect` or `unwrap_or`.", de: "In einem Test oder in main behandle das Result ausdruecklich mit `match`, `expect` oder `unwrap_or`." }, { en: "`?` also works in a function returning `Option`, where it propagates `None`.", de: "`?` funktioniert auch in einer Funktion mit Rueckgabetyp `Option`, wo es `None` weiterreicht." } ] }
  - { pattern: "the trait bound `.*: From<.*>` is not satisfied|`\\?` couldn't convert the error", question: { en: "? tried to convert one error type into another and found no conversion. Which two types are they, and do you want a From impl or a map_err at this one call site?", de: "? wollte einen Fehlertyp in einen anderen wandeln und fand keine Umwandlung. Welche zwei Typen sind das, und willst du ein From-Impl oder ein map_err an dieser einen Aufrufstelle?" }, hints: [ { en: "The diagnostic names both types in the `From<...>` bound it could not satisfy.", de: "Die Diagnose nennt beide Typen in der `From<...>`-Schranke, die sie nicht erfuellen konnte." }, { en: "`map_err(...)` before the `?` converts locally and needs no trait implementation.", de: "`map_err(...)` vor dem `?` wandelt lokal und braucht keine Trait-Implementierung." }, { en: "A `From` impl is the better answer when the same conversion is needed in many places - that is the next step.", de: "Ein `From`-Impl ist die bessere Antwort, wenn dieselbe Umwandlung an vielen Stellen gebraucht wird - das ist der naechste Step." } ] }
---
## Learning goal

Replace error-propagation boilerplate with `?`, and recognise the two situations in which it does not apply.

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

Two failures of different kinds. A missing `x` produces **no error value at all** - `split_once` returns an `Option` - so there is nothing for `?` to convert until you make one with `ok_or(None)`. And the numbers do produce a `ParseIntError`, but the function's error type is `Option<ParseIntError>`, and no `From` implementation relates the two, so each parse needs `map_err(Some)` before its `?`.

That is the honest boundary. When the conversion exists, `?` is invisible; when it does not, you write it once at the edge. The next step chooses the third option: define an error type and give it the `From` implementation, so `?` becomes free again everywhere inside your module.

## Style note

`?` makes the happy path the only path you read. `sum_lines` is a `for` loop, a `trim`, a skip and one `?`; the error handling is a single character and yet nothing is ignored.

## Your task

Implement the four functions, then explain the rule that decides when `?` is available.
