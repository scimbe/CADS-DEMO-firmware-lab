---
id: m2-03-aliasing-rule
title: "Die Aliasing-Regel: Leser oder ein Schreiber"
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
    title: "Sage vorher, welche Zeilen der Compiler markiert"
    check: { type: "predict", prompt: { en: "snippets/m2_03_two_mut_borrows.rs is the minimal E0499. Before you run it: how many places will the diagnostic point at, and which lines are they?", de: "snippets/m2_03_two_mut_borrows.rs ist das minimale E0499. Bevor du es ausführst: auf wie viele Stellen zeigt die Diagnose, und welche Zeilen sind das?" }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_03_two_mut_borrows.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0499\\]: cannot borrow `s` as mutable more than once at a time", timeoutMs: 120000 }, rubric: "Sagt drei markierte Stellen vorher, nicht eine: das erste `&mut` als die zuerst genommene Leihe, das zweite `&mut` als die Stelle, an der der Fehler gemeldet wird, und das `println!` als die spätere Verwendung der ersten Leihe. Nur das zweite `&mut` zu nennen ist das verbreitete Modell und dasjenige, bei dem der Irrtum sich lohnt, denn die Überlappung entsteht gerade wegen dieser späteren Verwendung - ohne sie überlappen die beiden Leihen nicht mehr.", recallPrompt: { en: "Two &mut of the same String, then both are printed. How many places does the diagnostic point at, and which are they?", de: "Zwei &mut auf denselben String, danach werden beide ausgegeben. Auf wie viele Stellen zeigt die Diagnose, und welche sind das?" }, bloom: "evaluate" }
  - id: aliasing
    title: "Die drei Aliasing-Übungen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-03-aliasing-rule", expectPass: [ "m2_03_aliasing_rule::first_then_push_returns_first_and_pushes", "m2_03_aliasing_rule::longest_len_then_clear_works", "m2_03_aliasing_rule::longest_len_of_empty_is_zero", "m2_03_aliasing_rule::double_all_and_sum_mutates_and_sums" ], minPass: 4, timeoutMs: 180000 }
  - id: price
    title: "Du kannst benennen, was die Regel einbringt"
    check: { type: "question", prompt: { en: "E0502 rejects code that would usually run correctly. Two sentences: what push may do to the buffer, and why a test suite would not reliably catch the result.", de: "E0502 lehnt Code ab, der meistens korrekt liefe. Zwei Sätze: was push mit dem Puffer tun darf, und warum eine Testsuite das Ergebnis nicht verlässlich fände." }, rubric: "Erster Satz: push darf die Kapazität überschreiten, einen neuen Puffer anlegen, die Elemente verschieben und den alten freigeben, womit die frühere Referenz auf freigegebenen Speicher zeigt. Zweiter Satz: ob die Neuallokation eintritt, hängt von der Kapazität in diesem Moment ab, derselbe Code besteht also bei manchen Eingaben und beschädigt bei anderen den Speicher. Besteht nicht: nur sagen, der Borrow-Checker verbiete es; einen falschen Wert statt freigegebenen Speichers nennen; oder bei `undefiniertem Verhalten` stehenbleiben, ohne die Neuallokation.", recallPrompt: { en: "A shared reference into a vector is held while push is called on it. What may push do to the buffer, and why would a test suite not reliably catch the result?", de: "Eine geteilte Referenz in einen Vektor wird gehalten, während push darauf aufgerufen wird. Was darf push mit dem Puffer tun, und warum fände eine Testsuite das Ergebnis nicht verlässlich?" }, bloom: "analyze", minChars: 60 }
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
## Lernziel

Nenne die Aliasing-Regel, erkenne die beiden Fehler, die sie durchsetzen, und strukturiere Code so um, dass sich die Leihen nicht überlappen.

Vorausgesetzt ist `m2-02-mutable-references`, und gelesen wird wie in `m0-05-compiler-errors`: die beiden Fehler dieses Steps unterscheiden sich vor allem darin, wohin sie ihre Markierungen setzen.

## Die Regel

Zu jedem Zeitpunkt darfst du für einen Wert **entweder** beliebig viele geteilte Referenzen (`&T`) **oder** genau eine veränderliche Referenz (`&mut T`) halten - nie beides. Zwei Fehler setzen das durch:

- **E0499** - zwei veränderliche Leihen gleichzeitig.
- **E0502** - eine veränderliche Leihe, während eine geteilte noch lebt.

`snippets/m2_03_two_mut_borrows.rs` ist das minimale E0499. Der erste Check lässt dich vorhersagen, welche Zeilen der Compiler markieren wird, und übersetzt die Datei erst danach, damit du der Meldung im eigenen Terminal begegnest und nicht nur in diesem Text - und die Datei bleibt, wie sie ist, denn ein Check, der einen Fehler sehen will, wird rot, sobald der Fehler weg ist.

## Warum "funktioniert doch trotzdem" kein Argument ist

Der naheliegende Weg für `first_then_push` ist:

```rust
let first = &v[0];
v.push(x);
*first          // error[E0502]
```

In einer Sprache ohne die Regel funktioniert das meistens. Meistens. Was `push` mit dem Puffer des Vektors tun darf, entscheidet, ob `first` überhaupt noch auf etwas zeigt - und *ob* es das tut, hängt von der Kapazität in diesem Moment ab; deshalb wird die Regel zur Übersetzungszeit durchgesetzt und nicht zur Laufzeit erkannt. Die Frage unten verlangt, das auszuformulieren.

## Nicht-lexikalische Lebensdauern

Die Regel betrifft *Überlappung*, nicht Gültigkeitsbereiche. Eine Leihe endet nach ihrer letzten Verwendung:

```rust
let r1 = &s;
let r2 = &s;
println!("{r1} and {r2}");   // letzte Verwendung von r1 und r2
let r3 = &mut s;             // in Ordnung
```

`examples/m2_borrow_scopes.rs` ist genau das, ausführbar. Es neben dem scheiternden Snippet zu lesen ist der schnellste Weg zu sehen, dass der Unterschied darin liegt, *wann die letzte Verwendung ist*, nicht wie viele Klammern beteiligt sind.

## Umstrukturieren, drei Wege

Die Übungen sind drei Formen derselben Lösung.

`first_then_push`: den Wert herauskopieren. `let first = v[0];` ohne das `&` liest ein `i32` - ein `Copy`-Typ, es bleibt also keine Leihe, die mit `push` kollidieren könnte.

`longest_len_then_clear`: das Lesen abschließen, bevor geschrieben wird. Iteriere über `words.iter()`, halte das Maximum in einem lokalen `usize` und rufe erst dann `clear()` auf. Die lokale Variable überlebt die Leihe, weil sie eine Zahl ist und keine Referenz in den Vektor.

`double_all_and_sum`: beide Aufgaben in einem Durchgang. `for x in v.iter_mut()` hält eine einzige veränderliche Leihe; schreibe über `*x` und addiere in derselben Schleife zu einer lokalen Summe, statt zu ändern und danach erneut zum Summieren zu leihen.

## Deine Aufgabe

Sage vorher, was der Snippet-Check melden wird, implementiere die drei Funktionen und benenne dann, was tatsächlich schiefgehen kann, wäre E0502 erlaubt. Der nächste Step führt Slices ein, deren ganzer Zweck es ist, das Leihen eines *Teils* einer Sammlung sicher zu machen.

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

::: do command="cargo test --test m2-03-aliasing-rule" cwd="."
Führe die Tests dieses Steps aus. Derselbe Befehl steckt hinter dem Knopf **Prüfen** an der Aufgabe *Die drei Aliasing-Übungen bestehen*.
> expect: Je Test eine Zeile `test … ok` oder `… FAILED`, darunter die Zusammenfassung `test result: ok. 4 passed; 0 failed`, sobald alle 4 bestehen. Der erste Lauf braucht ein paar Sekunden, weil die Crate einmal übersetzt wird; jeder weitere bleibt deutlich unter einer Sekunde.
> recover: Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - hole es nach. Meldet es `no test target named`, stimmt der Name hinter `--test` nicht; `ls tests/` listet die gültigen Namen auf.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
