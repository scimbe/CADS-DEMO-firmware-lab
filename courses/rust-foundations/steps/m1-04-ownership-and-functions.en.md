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
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
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

## Running it

Open a terminal with the menu **Terminal → New Terminal**, or press **F1**, type `>Terminal: Create New Terminal` and press Enter. The leading `>` is what switches the palette from searching files to searching commands, and F1 remembers whichever mode you used last - without it you get *No matching results*. In a browser F1 is more reliable than Ctrl+Shift+P, which the browser may keep for itself.

The terminal opens in the panel at the bottom, in `~/workspace` - the folder **above** this crate, because the lab window holds the Rust and the JavaScript workspace side by side. Change into the crate first, or cargo answers `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

You only need that once per terminal. Then run:

```bash
cargo test --test m1-04-ownership-and-functions
```

The **Check** button next to the task above runs exactly these commands for you and shows the same output in the tutor panel; the terminal is there so you can see it yourself and repeat it.

**What you see:** one `test … ok` or `… FAILED` line per test, then the summary `test result: ok. 5 passed; 0 failed` once you are done.

**How long:** a few seconds the first time, because the crate is compiled once; well under a second on every later run.

**Finished when:** the shell prompt reappears below the output. Until it does, the command is still running - a blinking cursor with no prompt is not a hang.

![A terminal in the panel at the bottom: the prompt reads coder@…:~/workspace/rust-foundations, then the cargo command, then its output.](terminal-run-a-step.png)

*The three moves are the same in every step of this course - open a terminal, `cd` into the crate, run the command. Only the last line differs, and this step's version of it is in the block above.*

**If something is off:** the output is in the **Terminal** tab at the bottom, not in **Problems** and not in **Output** - those two show different things and are the usual reason for "nothing happened". If you closed the terminal by accident, open a new one the same way; nothing is lost. If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - run it and try again.
