---
id: m1-04-ownership-and-functions
title: "Ownership über Funktionsgrenzen hinweg"
bloom: apply
objectives: [ "rust-ch04-01-what-is-ownership" ]
requires: [ "m1-03-copy-types" ]
estimatedMinutes: 20
scaffold: independent
links:
  - { step: "m2-01-shared-references" }
  - { file: "src/m1/m1_04_ownership_functions.rs" }
  - { file: "tests/m1-04-ownership-and-functions.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html#ownership-and-functions", title: "The Book, 4.1: Ownership and Functions" }
sources: [ "src/m1/m1_04_ownership_functions.rs", "tests/m1-04-ownership-and-functions.rs" ]
tasks:
  - id: functions
    title: "join, longer und repeat_words bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m1-04-ownership-and-functions", expectPass: [ "m1_04_ownership_and_functions::join_concatenates", "m1_04_ownership_and_functions::join_with_empty", "m1_04_ownership_and_functions::longer_picks_longer", "m1_04_ownership_and_functions::longer_tie_returns_first", "m1_04_ownership_and_functions::repeat_words_joins_with_spaces" ], minPass: 5, timeoutMs: 180000 }
  - id: signature
    title: "Du kannst die Signaturen begründen"
    check: { type: "question", prompt: { en: "join_owned takes two Strings by value, but repeat_words takes its word as &str. Justify both choices from the caller's point of view: what does each signature demand of the caller, and what would change if you swapped them?", de: "join_owned nimmt zwei Strings per Wert, repeat_words dagegen sein Wort als &str. Begründe beide Entscheidungen aus Sicht des Aufrufers: was verlangt jede Signatur vom Aufrufer, und was würde sich ändern, wenn du sie vertauschst?" }, rubric: "Explains that a by-value String parameter demands the caller give up ownership, which is right when the function consumes or reuses the buffer (join_owned reuses a's allocation), while &str only borrows and additionally accepts literals and &String, which is right when the function only reads. Notes that making repeat_words take String would force callers to clone or allocate at every call site.", bloom: "evaluate", minChars: 60 }
socratic:
  - { trigger: "task:functions:failed", question: { en: "Which of the three is failing? For `repeat_words`, check the two edge cases first: n = 1 must not add a separator, n = 0 must give the empty string.", de: "Welche der drei scheitert? Prüfe bei `repeat_words` zuerst die beiden Randfälle: n = 1 darf kein Trennzeichen anhängen, n = 0 muss die leere Zeichenkette liefern." }, hints: [ { en: "Push the separator *before* every word except the first, rather than after every word and trimming at the end.", de: "Hänge das Trennzeichen *vor* jedes Wort außer dem ersten, statt es hinter jedes zu setzen und am Ende abzuschneiden." }, { en: "`longer_owned` must return `a` on a tie: compare with `>` in the direction that makes the tie fall to `a`.", de: "`longer_owned` muss bei Gleichstand `a` liefern: vergleiche mit `>` in der Richtung, die den Gleichstand `a` zuschlagen lässt." }, { en: "In `join_owned` the doc comment forbids cloning; take ownership of `a`, make the binding mutable, and push `b` onto it.", de: "In `join_owned` verbietet der Doc-Kommentar das Klonen; übernimm `a`, mache die Bindung veränderlich und hänge `b` daran." } ] }
misconceptions:
  - { pattern: "error\\[E0382\\]", question: { en: "Something is used after it was given away. Which of the two owned parameters did you move first, and does the code after that still need it?", de: "Etwas wird nach dem Weggeben benutzt. Welchen der beiden besitzenden Parameter hast du zuerst verschoben, und braucht der Code danach ihn noch?" }, hints: [ { en: "`out.push_str(&b)` borrows `b` instead of moving it - the `&` is what keeps it usable.", de: "`out.push_str(&b)` leiht `b` aus, statt ihn zu verschieben - das `&` erhält seine Nutzbarkeit." }, { en: "Reading `.len()` does not move anything; assigning the value to another binding does.", de: "`.len()` zu lesen verschiebt nichts; den Wert an eine andere Bindung zu binden schon." }, { en: "In an if/else that returns one of two owned values, each branch moves only the value it returns - that is allowed.", de: "In einem if/else, das einen von zwei besitzenden Werten liefert, verschiebt jeder Zweig nur seinen eigenen Wert - das ist erlaubt." } ] }
---
## Lernziel

Entwirf eine Funktionssignatur, die sagt, wem was gehört, und begründe die Wahl zwischen besitzendem und geliehenem Parameter.

## Was eine Signatur verspricht

Eine Signatur ist ein Vertrag über Ownership, und der Aufrufer liest ihn, ohne den Rumpf zu öffnen:

| Parameter | Der Aufrufer muss | Die Funktion darf |
|---|---|---|
| `s: String` | den Wert abgeben | ihn behalten, ändern, verwerfen oder zurückgeben |
| `s: &str` | den Wert behalten | ihn lesen, sonst nichts |
| `s: &mut String` | den Wert behalten, exklusiv verleihen | ihn lesen und ändern |

Dieses Modul nutzt die ersten beiden; das dritte ist M2.

## Die drei Funktionen

`join_owned(a: String, b: String) -> String` verbraucht beide. Das ist hier der richtige Vertrag, denn die natürliche Implementierung *verwendet* die vorhandene Allokation von `a` weiter: übernehmen, Bindung `mut` machen, die Bytes von `b` anhängen, zurückgeben. Genau deshalb verbietet der Doc-Kommentar das Klonen - ein Klon würde grundlos einen dritten Puffer allozieren. Beachte, dass `push_str` einen `&str` nimmt: `out.push_str(&b)` leiht `b` aus, statt ihn zu verschieben; das `&` ist keine Verzierung.

`longer_owned(a: String, b: String) -> String` verbraucht ebenfalls beide und verwirft den Verlierer beim Verlassen. Jeder Zweig des `if` verschiebt nur den Wert, den er zurückgibt, und das ist erlaubt: der Compiler verfolgt Moves pro Pfad, nicht pro Funktion. Bei Gleichstand gewinnt `a`; vergleiche daher in der Richtung, die das von selbst ergibt, statt einen Sonderfall zu ergänzen.

`repeat_words(word: &str, n: usize) -> String` leiht. Sie liest das Wort nur, Ownership zu verlangen wäre also unhöflich: jeder Aufrufer mit einem Literal müsste `String::from("ho")` schreiben, jeder mit einer noch benötigten Zeichenkette klonen. `&str` zu nehmen kostet den Aufrufer nichts und akzeptiert Literale, `&String` und Slices gleichermaßen.

Achte auf die beiden Randfälle: `n = 1` darf kein Trennzeichen erzeugen, `n = 0` die leere Zeichenkette. Das Leerzeichen *vor* jedes Wort außer dem ersten zu setzen erledigt beides ohne abschließendes Abschneiden.

## Die Gewohnheit, die bleibt

Frage bei jedem Parameter: muss diese Funktion den Wert über ihr Ende hinaus behalten? Wenn ja, nimm ihn per Wert. Sieht sie ihn nur an, leihe. Ownership "sicherheitshalber" zu nehmen schiebt Klone an jede Aufrufstelle - und genau die fallen einem Reviewer auf.

## Deine Aufgabe

Implementiere die drei Funktionen, führe `cargo test --test m1-04-ownership-and-functions` aus und begründe dann die beiden unterschiedlichen Parameterstile. Modul M2 führt die dritte Zeile der Tabelle ein.
