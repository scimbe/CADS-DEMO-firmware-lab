---
id: m1-04-ownership-and-functions
title: "Ownership across function boundaries"
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
    title: "join, longer and repeat_words pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m1-04-ownership-and-functions", expectPass: [ "m1_04_ownership_and_functions::join_concatenates", "m1_04_ownership_and_functions::join_with_empty", "m1_04_ownership_and_functions::longer_picks_longer", "m1_04_ownership_and_functions::longer_tie_returns_first", "m1_04_ownership_and_functions::repeat_words_joins_with_spaces" ], minPass: 5, timeoutMs: 180000 }
  - id: signature
    title: "You can justify the signatures"
    check: { type: "question", prompt: { en: "join_owned takes two Strings by value, but repeat_words takes its word as &str. Justify both choices from the caller's point of view: what does each signature demand of the caller, and what would change if you swapped them?", de: "join_owned nimmt zwei Strings per Wert, repeat_words dagegen sein Wort als &str. Begründe beide Entscheidungen aus Sicht des Aufrufers: was verlangt jede Signatur vom Aufrufer, und was würde sich ändern, wenn du sie vertauschst?" }, rubric: "Explains that a by-value String parameter demands the caller give up ownership, which is right when the function consumes or reuses the buffer (join_owned reuses a's allocation), while &str only borrows and additionally accepts literals and &String, which is right when the function only reads. Notes that making repeat_words take String would force callers to clone or allocate at every call site.", bloom: "evaluate", minChars: 60 }
socratic:
  - { trigger: "task:functions:failed", question: { en: "Which of the three is failing? For `repeat_words`, check the two edge cases first: n = 1 must not add a separator, n = 0 must give the empty string.", de: "Welche der drei scheitert? Prüfe bei `repeat_words` zuerst die beiden Randfälle: n = 1 darf kein Trennzeichen anhängen, n = 0 muss die leere Zeichenkette liefern." }, hints: [ { en: "Push the separator *before* every word except the first, rather than after every word and trimming at the end.", de: "Hänge das Trennzeichen *vor* jedes Wort außer dem ersten, statt es hinter jedes zu setzen und am Ende abzuschneiden." }, { en: "`longer_owned` must return `a` on a tie: compare with `>` in the direction that makes the tie fall to `a`.", de: "`longer_owned` muss bei Gleichstand `a` liefern: vergleiche mit `>` in der Richtung, die den Gleichstand `a` zuschlagen lässt." }, { en: "In `join_owned` the doc comment forbids cloning; take ownership of `a`, make the binding mutable, and push `b` onto it.", de: "In `join_owned` verbietet der Doc-Kommentar das Klonen; übernimm `a`, mache die Bindung veränderlich und hänge `b` daran." } ] }
misconceptions:
  - { pattern: "error\\[E0382\\]", question: { en: "Something is used after it was given away. Which of the two owned parameters did you move first, and does the code after that still need it?", de: "Etwas wird nach dem Weggeben benutzt. Welchen der beiden besitzenden Parameter hast du zuerst verschoben, und braucht der Code danach ihn noch?" }, hints: [ { en: "`out.push_str(&b)` borrows `b` instead of moving it - the `&` is what keeps it usable.", de: "`out.push_str(&b)` leiht `b` aus, statt ihn zu verschieben - das `&` erhält seine Nutzbarkeit." }, { en: "Reading `.len()` does not move anything; assigning the value to another binding does.", de: "`.len()` zu lesen verschiebt nichts; den Wert an eine andere Bindung zu binden schon." }, { en: "In an if/else that returns one of two owned values, each branch moves only the value it returns - that is allowed.", de: "In einem if/else, das einen von zwei besitzenden Werten liefert, verschiebt jeder Zweig nur seinen eigenen Wert - das ist erlaubt." } ] }
---
## Learning goal

Design a function signature that says who owns what, and defend the choice between an owned parameter and a borrowed one.

## What a signature promises

A signature is a contract about ownership, and the caller can read it without opening the body:

| Parameter | The caller must | The function may |
|---|---|---|
| `s: String` | give up the value | keep, mutate, drop or return it |
| `s: &str` | keep the value | read it, and nothing else |
| `s: &mut String` | keep the value, lend it exclusively | read and change it |

This module uses the first two; the third is M2.

## The three functions

`join_owned(a: String, b: String) -> String` consumes both. That is the right contract here, because the natural implementation *reuses* `a`'s existing allocation: take ownership, make the binding `mut`, push `b`'s bytes onto it, return it. The doc comment forbids cloning for exactly that reason - a clone would allocate a third buffer for no reason. Note that `push_str` takes a `&str`, so `out.push_str(&b)` borrows `b` rather than moving it; the `&` is not decoration.

`longer_owned(a: String, b: String) -> String` also consumes both, and drops the loser when it returns. Each branch of the `if` moves only the value it returns, which is allowed: the compiler tracks moves per path, not per function. The tie gös to `a`, so compare in the direction that makes that fall out naturally rather than adding a special case.

`repeat_words(word: &str, n: usize) -> String` borrows. It only reads the word, so demanding ownership would be rude: every caller with a literal would have to write `String::from("ho")`, and every caller with a string it still needs would have to clone. Taking `&str` costs the caller nothing and accepts literals, `&String` and slices alike.

Watch the two edge cases: `n = 1` must produce no separator, `n = 0` the empty string. Pushing the space *before* every word except the first handles both without a trailing trim.

## The habit to take away

Ask, for every parameter: does this function need to keep the value after it returns? If yes, take it by value. If it only looks at it, borrow. Taking ownership "just in case" pushes clones out to every call site, and those are the clones a reviewer notices.

## Your task

Implement the three functions, run `cargo test --test m1-04-ownership-and-functions`, and then justify the two different parameter styles. Module M2 introduces the third row of the table.
