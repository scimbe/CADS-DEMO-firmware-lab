---
id: m2-03-aliasing-rule
title: "The aliasing rule: readers or one writer"
bloom: analyze
objectives: [ "rust-ch04-02-references-and-borrowing" ]
requires: [ "m2-02-mutable-references" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m2-02-mutable-references", "m0-05-compiler-errors" ]
links:
  - { step: "m2-04-slices" }
  - { file: "src/m2/m2_03_aliasing.rs" }
  - { file: "examples/m2_borrow_scopes.rs" }
  - { url: "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html", title: "The Book, 4.2: The Rules of References" }
sources: [ "src/m2/m2_03_aliasing.rs", "tests/m2-03-aliasing-rule.rs", "examples/m2_borrow_scopes.rs", "snippets/m2_03_two_mut_borrows.rs" ]
tasks:
  - id: two-mut
    title: "Predict which lines the compiler marks"
    check: { type: "predict", prompt: { en: "snippets/m2_03_two_mut_borrows.rs is the minimal E0499. Before you run it: how many places will the diagnostic point at, and which lines are they?", de: "snippets/m2_03_two_mut_borrows.rs ist das minimale E0499. Bevor du es ausführst: auf wie viele Stellen zeigt die Diagnose, und welche Zeilen sind das?" }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_03_two_mut_borrows.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0499\\]: cannot borrow `s` as mutable more than once at a time", timeoutMs: 120000 }, rubric: "Predicts three marked places, not one: the first `&mut` as the borrow that came first, the second `&mut` as the one the error is reported at, and the `println!` as the later use of the first borrow. Naming only the second `&mut` is the common model and the useful one to be wrong about, because the overlap exists precisely on account of that later use - without it the two borrows no longer overlap.", recallPrompt: { en: "Two &mut of the same String, then both are printed. How many places does the diagnostic point at, and which are they?", de: "Zwei &mut auf denselben String, danach werden beide ausgegeben. Auf wie viele Stellen zeigt die Diagnose, und welche sind das?" }, bloom: "evaluate" }
  - id: aliasing
    title: "The three aliasing exercises pass"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-03-aliasing-rule", expectPass: [ "m2_03_aliasing_rule::first_then_push_returns_first_and_pushes", "m2_03_aliasing_rule::longest_len_then_clear_works", "m2_03_aliasing_rule::longest_len_of_empty_is_zero", "m2_03_aliasing_rule::double_all_and_sum_mutates_and_sums" ], minPass: 4, timeoutMs: 180000 }
  - id: price
    title: "You can name what the rule buys"
    check: { type: "question", prompt: { en: "E0502 rejects code that would usually run correctly. Two sentences: what push may do to the buffer, and why a test suite would not reliably catch the result.", de: "E0502 lehnt Code ab, der meistens korrekt liefe. Zwei Sätze: was push mit dem Puffer tun darf, und warum eine Testsuite das Ergebnis nicht verlässlich fände." }, rubric: "First sentence: push may exceed the capacity, allocate a new buffer, move the elements and free the old one, leaving the earlier reference pointing at freed memory. Second sentence: whether the reallocation happens depends on the capacity at that moment, so the same code passes on some inputs and corrupts memory on others. Does not pass: saying only that the borrow checker forbids it, or naming a wrong value rather than freed memory, or stopping at 'undefined behaviour' without the reallocation.", recallPrompt: { en: "A shared reference into a vector is held while push is called on it. What may push do to the buffer, and why would a test suite not reliably catch the result?", de: "Eine geteilte Referenz in einen Vektor wird gehalten, während push darauf aufgerufen wird. Was darf push mit dem Puffer tun, und warum fände eine Testsuite das Ergebnis nicht verlässlich?" }, bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:two-mut:failed", question: { en: "Your prediction and the diagnostic do not agree. Is the number of marked places wrong, or the lines they sit on?", de: "Deine Vorhersage und die Diagnose gehen auseinander. Stimmt die Zahl der markierten Stellen nicht, oder stimmen die Zeilen nicht, auf denen sie sitzen?" }, hints: [ { en: "An error needs two things that overlap, and an overlap has two ends. Ask how the compiler could show you an overlap by pointing at a single line.", de: "Ein Fehler braucht zwei Dinge, die sich überlappen, und eine Überlappung hat zwei Enden. Frage, wie der Compiler dir eine Überlappung zeigen könnte, indem er auf eine einzige Zeile zeigt." }, { en: "Open `snippets/m2_03_two_mut_borrows.rs`; it is four lines of code. Run the check and read the block under the message from top to bottom - every line of code it reprints carries its own label underneath.", de: "Öffne `snippets/m2_03_two_mut_borrows.rs`; es sind vier Zeilen Code. Führe die Prüfung aus und lies den Block unter der Meldung von oben nach unten - jede Codezeile, die er wiederholt, trägt darunter ihre eigene Beschriftung." }, { en: "The label most predictions miss sits on neither borrow. Ask yourself when an overlap begins to exist at all: taking the second borrow is not enough on its own, something has to happen to the first one afterwards.", de: "Die Beschriftung, die den meisten Vorhersagen fehlt, sitzt auf keiner der beiden Leihen. Frage dich, wann eine Überlappung überhaupt entsteht: die zweite Leihe zu nehmen genügt für sich nicht, mit der ersten muss danach noch etwas geschehen." } ] }
  - { trigger: "task:price:failed", question: { en: "A vector that is full has to grow somewhere. Where does the old content go?", de: "Ein voller Vektor muss irgendwo wachsen. Wohin gerät der alte Inhalt?" }, hints: [ { en: "`Vec` stores its elements in one contiguous block with a fixed capacity. Ask what has to happen when the block is full and one more element arrives.", de: "`Vec` speichert seine Elemente in einem zusammenhängenden Block mit fester Kapazität. Frage, was passieren muss, wenn der Block voll ist und ein Element hinzukommt." }, { en: "A reference is an address. If the elements move to a different address, ask what the old reference now names.", de: "Eine Referenz ist eine Adresse. Wandern die Elemente an eine andere Adresse, frage, was die alte Referenz jetzt benennt." }, { en: "Whether the block was full at that moment depends on how many elements were pushed before - which is why the failure is not reproducible from the code alone.", de: "Ob der Block in diesem Moment voll war, hängt davon ab, wie viele Elemente vorher eingefügt wurden - deshalb ist der Fehlschlag aus dem Code allein nicht reproduzierbar." } ] }
  - { trigger: "task:aliasing:failed", question: { en: "Which function does not compile, and which two borrows overlap in it? Ask for each: could the reading one end before the writing one starts?", de: "Welche Funktion kompiliert nicht, und welche beiden Leihen überlappen darin? Frage jeweils: könnte die lesende enden, bevor die schreibende beginnt?" }, hints: [ { en: "Copy the value out first: `let first = v[0];` (no `&`) reads an `i32` and ends the borrow immediately.", de: "Kopiere den Wert zuerst heraus: `let first = v[0];` (ohne `&`) liest ein `i32` und beendet die Leihe sofort." }, { en: "In `longest_len_then_clear`, finish the loop over `words.iter()` completely before calling `clear`.", de: "Beende in `longest_len_then_clear` die Schleife über `words.iter()` vollständig, bevor du `clear` aufrufst." }, { en: "`double_all_and_sum` needs one loop with `iter_mut()`; write through `*x` and add to the running total in the same pass.", de: "`double_all_and_sum` braucht eine Schleife mit `iter_mut()`; schreibe über `*x` und addiere im selben Durchgang zur Summe." } ] }
misconceptions:
  - { pattern: "error\\[E0502\\]: cannot borrow `\\w+` as mutable because it is also borrowed as immutable", question: { en: "A reader and a writer overlap. Where is the reader's last use - and can you move it earlier, or replace the reference with a copied value?", de: "Ein Leser und ein Schreiber überlappen. Wo liegt die letzte Verwendung des Lesers - und kannst du sie vorziehen oder die Referenz durch einen kopierten Wert ersetzen?" }, hints: [ { en: "The diagnostic's third label, `immutable borrow later used here`, is what keeps the borrow alive; that line is the real constraint.", de: "Die dritte Beschriftung der Diagnose, `immutable borrow later used here`, hält die Leihe am Leben; diese Zeile ist die eigentliche Einschränkung." }, { en: "For a `Copy` element, dropping the `&` turns a borrow into an independent value and the conflict disappears.", de: "Bei einem `Copy`-Element macht das Weglassen des `&` aus einer Leihe einen unabhängigen Wert, und der Konflikt verschwindet." }, { en: "For a non-Copy element, compute what you need from it - a length, a clone of just that field - before the mutation.", de: "Bei einem Nicht-Copy-Element berechne vor der Änderung, was du brauchst - eine Länge, einen Klon nur dieses Felds." } ] }
  - { pattern: "error\\[E0499\\]", question: { en: "Two writers at once. Can the work be done in one pass with a single mutable borrow instead of two?", de: "Zwei Schreiber gleichzeitig. Lässt sich die Arbeit in einem Durchgang mit einer einzigen veränderlichen Leihe erledigen statt mit zweien?" }, hints: [ { en: "One `for x in v.iter_mut()` loop holds exactly one mutable borrow for its whole duration.", de: "Eine Schleife `for x in v.iter_mut()` hält für ihre gesamte Dauer genau eine veränderliche Leihe." }, { en: "Accumulate into a local variable inside the loop rather than borrowing the collection a second time to sum it.", de: "Sammle in einer lokalen Variablen innerhalb der Schleife, statt die Sammlung ein zweites Mal zum Summieren zu leihen." }, { en: "Methods that take indices (`swap`, `split_at_mut`) exist to express two-element access under one borrow.", de: "Methoden mit Indizes (`swap`, `split_at_mut`) gibt es, um Zugriff auf zwei Elemente unter einer Leihe auszudrücken." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Learning goal

State the aliasing rule, recognise the two errors that enforce it, and restructure code so the borrows do not overlap.

It assumes `m2-02-mutable-references`, and it reads its diagnostics the way `m0-05-compiler-errors` did: this step's two errors differ mainly in where they put their marks.

## The rule

At any point, for any value, you may have **either** any number of shared references (`&T`) **or** exactly one mutable reference (`&mut T`) - never both. Two errors enforce it:

- **E0499** - two mutable borrows at once.
- **E0502** - a mutable borrow while a shared one is still live.

`snippets/m2_03_two_mut_borrows.rs` is the minimal E0499. The first check has you predict which lines the compiler will mark before it compiles the file, so you meet the message in your own terminal rather than only in this text - and the file stays as it is, because a check that wants to see an error is red once the error is gone.

## Why "would work anyway" is not an argument

The obvious way to write `first_then_push` is:

```rust
let first = &v[0];
v.push(x);
*first          // error[E0502]
```

Run that in a language without the rule and it usually works. Usually. What `push` is allowed to do to the vector's buffer decides whether `first` still points at anything - and *whether* it does depends on the capacity at that moment, which is why the rule is enforced at compile time rather than detected at run time. The question below asks you to spell that out.

## Non-lexical lifetimes

The rule is about *overlap*, not about scopes. A borrow ends after its last use:

```rust
let r1 = &s;
let r2 = &s;
println!("{r1} and {r2}");   // last use of r1 and r2
let r3 = &mut s;             // fine
```

`examples/m2_borrow_scopes.rs` is exactly this, runnable. Reading it next to the failing snippet is the fastest way to see that the difference is *when the last use is*, not how many braces are involved.

## Restructuring, three ways

The exercises are three shapes of the same fix.

`first_then_push`: copy the value out. `let first = v[0];` without the `&` reads an `i32` - a `Copy` type, so there is no borrow left to conflict with `push`.

`longest_len_then_clear`: finish reading before writing. Loop over `words.iter()`, keep the maximum in a local `usize`, and only then call `clear()`. The local outlives the borrow because it is a number, not a reference into the vector.

`double_all_and_sum`: do both jobs in one pass. `for x in v.iter_mut()` holds a single mutable borrow; write through `*x` and add to a local total inside the same loop, instead of mutating and then borrowing again to sum.

## Your task

Predict what the snippet check will report, implement the three functions, and then name what can actually go wrong if E0502 were allowed. The next step introduces slices, whose whole purpose is to make a borrow of *part* of a collection safe.

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

::: do command="cargo test --test m2-03-aliasing-rule" cwd="."
Run this step's tests. The same command sits behind the **Check** button on the *The three aliasing exercises pass* task.
> expect: One line per test, `test … ok` or `… FAILED`, then the summary `test result: ok. 4 passed; 0 failed` once all 4 pass. The first run takes a few seconds while the crate compiles once; every run after that stays well under a second.
> recover: If cargo answers `could not find Cargo.toml`, this terminal never got the `cd` above - do it now. If it says `no test target named`, the name after `--test` is wrong; `ls tests/` lists the valid ones.
:::

![A terminal in the bottom panel: the prompt reads coder@…:~/workspace/rust-foundations, with the cargo command and its output below it.](terminal-run-a-step.png)

The **Check** button on the task runs the same command and shows the same output in the tutor panel; it always uses the right folder, so it never needs the `cd`. The terminal is there so you can see it yourself and repeat it. The output appears on the **Terminal** tab, not in **Problems** and not in **Output** - those two show other things and are the usual reason for "nothing happens".
