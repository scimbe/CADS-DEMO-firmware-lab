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
    check: { type: "question", prompt: { en: "join_owned takes String, repeat_words takes &str. One sentence each: what the first demands of its caller, and what the second would cost every call site if it took String too.", de: "join_owned nimmt String, repeat_words nimmt &str. Je ein Satz: was das Erste von seinem Aufrufer verlangt, und was das Zweite jede Aufrufstelle kosten würde, nähme es ebenfalls String." }, rubric: "Judged on the answer. All three criteria must be met: (1) for the consuming signature it names what the caller gives up, that the value is unusable to them afterwards, rather than describing the type; (2) it says why that is acceptable here, and points for it at what the body does with the value it was handed; (3) for the borrowing signature it names a cost that recurs and says where it recurs, at each call site rather than once inside the function. Does not pass: the two types described with no cost named to anyone; &str asserted to be better without the reason the other signature is right; a cost placed inside the function rather than at its callers.", bloom: "evaluate", minChars: 60 }
socratic:
  - { trigger: "task:signature:failed", question: { en: "Look at the two call sites in the test. Which of them would have to change if the signature changed?", de: "Sieh dir die beiden Aufrufstellen im Test an. Welche müsste sich ändern, wenn sich die Signatur änderte?" }, hints: [ { en: "`repeat_words(\"ho\", 3)` passes a literal. Write out what that call would look like if the parameter were a String.", de: "`repeat_words(\"ho\", 3)` übergibt ein Literal. Schreibe auf, wie dieser Aufruf aussähe, wäre der Parameter ein String." }, { en: "For join_owned, ask what its body does with `a` - whether it builds something new or keeps what it was handed.", de: "Frage bei join_owned, was der Rumpf mit `a` tut - baut er etwas Neues oder behält er das Übergebene?" }, { en: "One signature is paid for once inside the function; the other is paid again at every place the function is called.", de: "Eine Signatur wird einmal in der Funktion bezahlt, die andere an jeder Stelle erneut, an der die Funktion aufgerufen wird." } ] }
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

`join_owned(a: String, b: String) -> String` consumes both, and the doc comment forbids cloning. Whether that is the right contract is the question below, and the implementation is where the answer is: watch what the body does with `a` rather than what its type says. Note that `push_str` takes a `&str`, so `out.push_str(&b)` borrows `b` rather than moving it; the `&` is not decoration.

`longer_owned(a: String, b: String) -> String` also consumes both, and drops the loser when it returns. Each branch of the `if` moves only the value it returns, which is allowed: the compiler tracks moves per path, not per function. The tie goes to `a`, so compare in the direction that makes that fall out naturally rather than adding a special case.

`repeat_words(word: &str, n: usize) -> String` borrows; it only reads the word. `&str` accepts literals, `&String` and slices alike. Look at the two call sites in the test and ask what each of them would have to write if this parameter demanded ownership - that is the second half of the question below.

Watch the two edge cases: `n = 1` must produce no separator, `n = 0` the empty string. Pushing the space *before* every word except the first handles both without a trailing trim.

## The habit to take away

Ask, for every parameter: does this function need to keep the value after it returns? Then ask what your answer costs the people calling it. The question below is that second half.

## Your task

Implement the three functions, run this step's tests from the block below, and then justify the two different parameter styles. Module M2 introduces the third row of the table.

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

::: do command="cargo test --test m1-04-ownership-and-functions" cwd="."
Run this step's tests. The same command sits behind the **Check** button on the *join, longer and repeat_words pass* task.
> expect: One line per test, `test … ok` or `… FAILED`, then the summary `test result: ok. 5 passed; 0 failed` once all 5 pass. The first run takes a few seconds while the crate compiles once; every run after that stays well under a second.
> recover: If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - do it now. If it says `no test target named`, the name after `--test` is wrong; `ls tests/` lists the valid ones.
:::

![A terminal in the bottom panel: the prompt reads coder@…:~/workspace/rust-foundations, with the cargo command and its output below it.](terminal-run-a-step.png)

The **Check** button on the task runs the same command and shows the same output in the tutor panel; it always uses the right folder, so it never needs the `cd`. The terminal is there so you can see it yourself and repeat it. The output appears on the **Terminal** tab, not in **Problems** and not in **Output** - those two show other things and are the usual reason for "nothing happens".
