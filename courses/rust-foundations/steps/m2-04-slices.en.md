---
id: m2-04-slices
title: "Slices: a borrow of part of a collection"
bloom: apply
objectives: [ "rust-ch04-03-slices" ]
requires: [ "m2-03-aliasing-rule" ]
estimatedMinutes: 25
scaffold: independent
recallFrom: [ "m2-03-aliasing-rule", "m2-02-mutable-references" ]
links:
  - { step: "m3-01-structs" }
  - { file: "src/m2/m2_04_slices.rs" }
  - { file: "snippets/m2_04_slice_then_clear.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-03-slices.html", title: "The Book, 4.3: The Slice Type" }
sources: [ "src/m2/m2_04_slices.rs", "tests/m2-04-slices.rs", "snippets/m2_04_slice_then_clear.rs" ]
tasks:
  - id: guess
    title: "Predict the fate of a slice whose source is cleared"
    check: { type: "predict", prompt: { en: "snippets/m2_04_slice_then_clear.rs takes a slice with first_word(&s), then calls s.clear(), then prints the slice. Does it compile? If not, which error, and which of the three statements does the compiler underline?", de: "snippets/m2_04_slice_then_clear.rs holt mit first_word(&s) einen Slice, ruft dann s.clear() auf und gibt den Slice aus. Kompiliert das? Wenn nein: welcher Fehler, und welche der drei Anweisungen unterstreicht der Compiler?" }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_04_slice_then_clear.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0502\\]: cannot borrow `s` as mutable because it is also borrowed as immutable", timeoutMs: 120000 }, rubric: "Predicts E0502 with the caret on s.clear(), and identifies the println! as the reason the shared borrow is still alive at that point. A prediction that it compiles and prints a stale word is the C-style model and worth naming explicitly.", recallPrompt: { en: "A slice points at the first word of a String; then clear() is called and the slice is printed. Does it compile? If not: which error, and which of the three statements is marked?", de: "Ein Slice zeigt auf das erste Wort eines String; danach wird clear() gerufen und der Slice ausgegeben. Kompiliert das? Wenn nein: welcher Fehler, und welche der drei Anweisungen wird markiert?" }, bloom: "evaluate" }
  - id: slices
    title: "first_word, last_word, sum and tail pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-04-slices", expectPass: [ "m2_04_slices::first_word_of_sentence", "m2_04_slices::first_word_of_single_word", "m2_04_slices::last_word_of_sentence", "m2_04_slices::sum_and_tail_of_slices" ], minPass: 4, timeoutMs: 180000 }
  - id: boundary
    title: "You can say what the borrow checker does not check"
    check: { type: "question", prompt: { en: "Slicing with an offset you worked out yourself can panic at run time. Two sentences: what the borrow checker does check about that slice, and why the panic lies beyond it.", de: "Ein Slice mit einem selbst berechneten Offset kann zur Laufzeit abstürzen. Zwei Sätze: was der Borrow-Checker an diesem Slice prüft, und warum der Absturz jenseits davon liegt." }, rubric: "Judged on the answer. All three criteria must be met: (1) it states what is checked, that the slice borrows the collection and may neither outlive it nor sit beside a conflicting borrow; (2) it states what is not checked, whether the number lands on a character boundary, which is a property of the value and settled only while the program runs; (3) it draws the line in the right place, between who may hold what and for how long on one side and which numbers are valid on the other. Does not pass: an answer in which the borrow checker rejects the bad offset; an answer that quotes the panic message without saying which of the two questions a compiler can answer; an answer that argues from unsafe code or from the standard library rather than from what a static check can see.", recallPrompt: { en: "Slicing a string with an offset you computed yourself can panic at run time. What does the borrow checker check about that slice, and why does the panic lie beyond it?", de: "Ein Slice mit einem selbst berechneten Offset kann zur Laufzeit abstürzen. Was prüft der Borrow-Checker an diesem Slice, und warum liegt der Absturz jenseits davon?" }, bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:boundary:failed", question: { en: "Two questions are on the table: may this reference exist, and does this number point at something sensible? Which of the two does a compiler settle before the program runs?", de: "Zwei Fragen stehen im Raum: darf diese Referenz existieren, und zeigt diese Zahl auf etwas Sinnvolles? Welche der beiden entscheidet ein Compiler, bevor das Programm läuft?" }, hints: [ { en: "A slice carries two things, a pointer and a length. Ask which of them the compiler can reason about from the source alone, and which one only takes on a value once the program has read some input.", de: "Ein Slice trägt zwei Dinge, einen Zeiger und eine Länge. Frage, über welches von beiden der Compiler allein aus dem Quelltext urteilen kann und welches erst einen Wert bekommt, wenn das Programm etwas eingelesen hat." }, { en: "Look at the two functions in this step that take their offset from `find` and compare them with a version that computes one. The types are the same in both, and so is everything the borrow checker sees.", de: "Sieh dir die beiden Funktionen dieses Steps an, die ihren Offset aus `find` nehmen, und vergleiche sie mit einer Fassung, die einen berechnet. Die Typen sind in beiden dieselben, und ebenso alles, was der Borrow-Checker sieht." }, { en: "The step already tells you the failure is a run-time panic and not a compile error. That is the answer to the second half: put it the other way round and say what a check that runs before any input arrives could possibly know about a number that arrives later.", de: "Der Step sagt dir bereits, dass der Fehlschlag eine Panic zur Laufzeit ist und kein Übersetzungsfehler. Das ist die Antwort auf die zweite Hälfte: dreh es um und sage, was eine Prüfung, die vor jeder Eingabe läuft, über eine Zahl wissen könnte, die erst später eintrifft." } ] }
  - { trigger: "task:guess:failed", question: { en: "The slice and the clear touch the same String. Which line uses the slice last?", de: "Der Slice und das clear betreffen denselben String. Welche Zeile benutzt den Slice zuletzt?" }, hints: [ { en: "A borrow lives until its last use, not until the closing brace. Find the last use of `word`.", de: "Eine Leihe lebt bis zu ihrer letzten Verwendung, nicht bis zur schließenden Klammer. Finde die letzte Verwendung von `word`." }, { en: "`clear` needs to change the String, and the rule from the previous step says what may not be alive at that moment.", de: "`clear` muss den String ändern, und die Regel aus dem vorigen Step sagt, was in diesem Moment nicht leben darf." }, { en: "Two error codes are plausible here; the one that names a mutable borrow colliding with an immutable one is in the 05xx range.", de: "Zwei Fehlercodes sind hier denkbar; derjenige, der eine veränderliche mit einer unveränderlichen Leihe kollidieren lässt, liegt im Bereich 05xx." } ] }
  - { trigger: "task:slices:failed", question: { en: "Which function fails, and on which input? The single-word and empty-string cases are the ones most solutions miss.", de: "Welche Funktion scheitert, und bei welcher Eingabe? Die Fälle mit einem Wort und mit leerer Zeichenkette werden von den meisten Lösungen übersehen." }, hints: [ { en: "`s.find(' ')` returns `Option<usize>`; the `None` arm is the no-space case, where the answer is the whole string.", de: "`s.find(' ')` liefert `Option<usize>`; der `None`-Zweig ist der Fall ohne Leerzeichen, in dem die ganze Zeichenkette die Antwort ist." }, { en: "For `last_word`, `rfind` searches from the end; the slice starts one byte after the separator.", de: "Für `last_word` sucht `rfind` von hinten; der Slice beginnt ein Byte hinter dem Trennzeichen." }, { en: "`tail` on an empty slice must stay empty: `&xs[1..]` on an empty slice panics, so check `is_empty()` first.", de: "`tail` muss beim leeren Slice leer bleiben: `&xs[1..]` auf einem leeren Slice stürzt ab, prüfe also zuerst `is_empty()`." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]", question: { en: "A slice is still alive when the collection is modified. Where is the slice used last, and does the modification have to happen before that?", de: "Ein Slice lebt noch, während die Sammlung verändert wird. Wo wird der Slice zuletzt benutzt, und muss die Änderung wirklich davor passieren?" }, hints: [ { en: "A slice is a borrow of the collection, not a copy of the data - which is precisely why this is caught.", de: "Ein Slice ist eine Leihe auf die Sammlung, keine Kopie der Daten - genau deshalb wird das erkannt." }, { en: "If you need the text after the collection changes, make it owned with `.to_string()` first.", de: "Brauchst du den Text nach der Änderung der Sammlung, mache ihn zuvor mit `.to_string()` besitzend." }, { en: "Reordering the statements so the last use of the slice comes before the mutation is usually the better fix.", de: "Die Anweisungen so umzuordnen, dass die letzte Verwendung des Slice vor der Änderung liegt, ist meist die bessere Lösung." } ] }
  - { pattern: "byte index \\d+ is out of bounds|byte index \\d+ is not a char boundary", question: { en: "A slice index is not where you assumed. Are you indexing by bytes into text whose characters are not all one byte, or past the end?", de: "Ein Slice-Index liegt nicht dort, wo du annimmst. Indizierst du byteweise in Text, dessen Zeichen nicht alle ein Byte lang sind - oder hinter das Ende?" }, hints: [ { en: "String slicing uses byte offsets; the offsets from `find`/`rfind` are always valid boundaries, hand-computed ones may not be.", de: "String-Slicing nutzt Byte-Offsets; die Offsets von `find`/`rfind` sind stets gültige Grenzen, selbst berechnete nicht unbedingt." }, { en: "`&s[i + 1..]` is right after a single-byte space, but not after a multi-byte separator.", de: "`&s[i + 1..]` stimmt hinter einem Ein-Byte-Leerzeichen, aber nicht hinter einem mehrbyteigen Trennzeichen." }, { en: "Check the empty-input case separately before you index at all.", de: "Prüfe den Fall der leeren Eingabe gesondert, bevor du überhaupt indizierst." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

Return a reference to part of a collection, and see the borrow checker connect that reference back to the collection it came from.

It needs `m2-02-mutable-references` and `m2-03-aliasing-rule`: a slice is a borrow, and every rule from those two steps applies to it unchanged.

## The problem in the book

Chapter 4.3 opens with `first_word` returning a `usize` index. It compiles and it is a trap: the index is just a number, unconnected to the string. Clear the string and the index survives, now meaningless. With two indices for a second word, the bug doubles.

A slice fixes this by being a reference:

```rust
pub fn first_word(s: &str) -> &str
```

`&s[0..5]` stores a pointer to byte 0 and a length of 5. It borrows `s`, so the compiler knows the two are connected, and every rule from the previous step applies.

## What that buys you

`snippets/m2_04_slice_then_clear.rs`:

```rust
let word = first_word(&s);
s.clear();
println!("the first word is: {word}");
```

Predict the outcome before compiling: three statements, and the question is whether they are allowed to stand next to each other in that order. What is rejected here is the *shape* and not a value - the bug that would have been a stale index in another language never exists.

## `&str` is a slice

This is why `&str` has been the recommended parameter type since m2-01. A string literal is a `&str` pointing into the binary. `&my_string[..]` is a `&str` over the whole `String`. `&my_string[0..5]` is a `&str` over part of it. One parameter type takes all three, and `first_word(&s)` works whether `s` is a `String` or a literal.

The same applies to arrays and vectors: `&[i32]` is a slice, and `sum(&v)`, `sum(&v[1..3])` and `sum(&[])` all fit the one signature.

## Byte offsets, not character offsets

String slicing works in bytes. `s.find(' ')` and `s.rfind(' ')` give you offsets that are guaranteed to be valid character boundaries; offsets you compute yourself may not be, and slicing into the middle of a multi-byte character panics at runtime with `byte index N is not a char boundary`. Module M4 goes into this properly; here it is enough to take your offsets from `find`.

## The edge cases the tests pin down

`first_word("hello")` - no space, so the whole string. `first_word("")` - the empty string. `last_word("fox")` - the whole string again. `tail(&[])` - the empty slice, and note that `&xs[1..]` on an empty slice panics, so it needs a guard.

## Your task

Predict the snippet, implement the four functions, and then say in two sentences what the borrow checker does and does not check about a slice. Module M3 leaves borrowing behind for a while and builds data types of your own.

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

::: do command="cargo test --test m2-04-slices" cwd="."
Run this step's tests. The same command sits behind the **Check** button on the *first_word, last_word, sum and tail pass* task.
> expect: One line per test, `test … ok` or `… FAILED`, then the summary `test result: ok. 4 passed; 0 failed` once all 4 pass. The first run takes a few seconds while the crate compiles once; every run after that stays well under a second.
> recover: If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - do it now. If it says `no test target named`, the name after `--test` is wrong; `ls tests/` lists the valid ones.
:::

![A terminal in the bottom panel: the prompt reads coder@…:~/workspace/rust-foundations, with the cargo command and its output below it.](terminal-run-a-step.png)

The **Check** button on the task runs the same command and shows the same output in the tutor panel; it always uses the right folder, so it never needs the `cd`. The terminal is there so you can see it yourself and repeat it. The output appears on the **Terminal** tab, not in **Problems** and not in **Output** - those two show other things and are the usual reason for "nothing happens".
