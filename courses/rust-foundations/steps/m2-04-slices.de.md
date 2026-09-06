---
id: m2-04-slices
title: "Slices: eine Leihe auf einen Teil einer Sammlung"
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
    title: "Sage das Schicksal eines Slice vorher, dessen Quelle geleert wird"
    check: { type: "predict", prompt: { en: "snippets/m2_04_slice_then_clear.rs takes a slice with first_word(&s), then calls s.clear(), then prints the slice. Does it compile? If not, which error, and which of the three statements does the compiler underline?", de: "snippets/m2_04_slice_then_clear.rs holt mit first_word(&s) einen Slice, ruft dann s.clear() auf und gibt den Slice aus. Kompiliert das? Wenn nein: welcher Fehler, und welche der drei Anweisungen unterstreicht der Compiler?" }, then: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 --emit=metadata --out-dir target/check snippets/m2_04_slice_then_clear.rs", seedMustFail: false, expectExitCode: 1, expectStderr: "error\\[E0502\\]: cannot borrow `s` as mutable because it is also borrowed as immutable", timeoutMs: 120000 }, rubric: "Sagt E0502 vorher, mit der Markierung auf s.clear(), und erkennt das println! als den Grund, warum die geteilte Leihe an dieser Stelle noch lebt. Die Vorhersage, es kompiliere und gebe ein veraltetes Wort aus, ist das Modell aus C und verdient, ausdrücklich benannt zu werden.", bloom: "evaluate" }
  - id: slices
    title: "first_word, last_word, sum und tail bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m2-04-slices", expectPass: [ "m2_04_slices::first_word_of_sentence", "m2_04_slices::first_word_of_single_word", "m2_04_slices::last_word_of_sentence", "m2_04_slices::sum_and_tail_of_slices" ], minPass: 4, timeoutMs: 180000 }
  - id: boundary
    title: "Du kannst sagen, was der Borrow-Checker nicht prüft"
    check: { type: "question", prompt: { en: "Slicing with an offset you worked out yourself can panic at run time. Two sentences: what the borrow checker does check about that slice, and why the panic lies beyond it.", de: "Ein Slice mit einem selbst berechneten Offset kann zur Laufzeit abstürzen. Zwei Sätze: was der Borrow-Checker an diesem Slice prüft, und warum der Absturz jenseits davon liegt." }, rubric: "Bewertet wird die Antwort. Alle drei Kriterien müssen erfüllt sein: (1) sie sagt, was geprüft wird, nämlich dass der Slice die Sammlung leiht und weder länger leben noch neben einer widersprechenden Leihe stehen darf; (2) sie sagt, was nicht geprüft wird, nämlich ob die Zahl auf einer Zeichengrenze landet, was eine Eigenschaft des Wertes ist und sich erst entscheidet, während das Programm läuft; (3) sie zieht die Grenze an der richtigen Stelle, zwischen der Frage, wer was wie lange halten darf, auf der einen Seite und der Frage, welche Zahlen gültig sind, auf der anderen. Besteht nicht: eine Antwort, in der der Borrow-Checker den schlechten Offset zurückweist; eine Antwort, die die Panic-Meldung zitiert, ohne zu sagen, welche der beiden Fragen ein Compiler beantworten kann; eine Antwort, die aus unsicherem Code oder aus der Standardbibliothek heraus argumentiert statt aus dem, was eine statische Prüfung sehen kann.", bloom: "analyze", minChars: 60 }
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
## Lernziel

Gib eine Referenz auf einen Teil einer Sammlung zurück und sieh, wie der Borrow-Checker diese Referenz mit der Sammlung verknüpft, aus der sie stammt.

Gebraucht werden `m2-02-mutable-references` und `m2-03-aliasing-rule`: ein Slice ist eine Leihe, und jede Regel dieser beiden Steps gilt für ihn unverändert weiter.

## Das Problem aus dem Buch

Kapitel 4.3 beginnt mit einem `first_word`, das einen `usize`-Index liefert. Es kompiliert und ist eine Falle: der Index ist nur eine Zahl, ohne Verbindung zur Zeichenkette. Leere die Zeichenkette, und der Index überlebt - nun bedeutungslos. Bei zwei Indizes für ein zweites Wort verdoppelt sich der Fehler.

Ein Slice löst das, indem er eine Referenz ist:

```rust
pub fn first_word(s: &str) -> &str
```

`&s[0..5]` speichert einen Zeiger auf Byte 0 und die Länge 5. Er leiht `s`, der Compiler kennt also die Verbindung, und jede Regel des vorigen Steps gilt.

## Was das einbringt

`snippets/m2_04_slice_then_clear.rs`:

```rust
let word = first_word(&s);
s.clear();
println!("the first word is: {word}");
```

Sage das Ergebnis vor dem Übersetzen vorher: drei Anweisungen, und die Frage ist, ob sie in dieser Reihenfolge nebeneinander bestehen dürfen. Was hier abgelehnt wird, ist die *Form* und nicht ein Wert - der Fehler, der in einer anderen Sprache ein veralteter Index geworden wäre, entsteht gar nicht erst.

## `&str` ist ein Slice

Deshalb ist `&str` seit m2-01 der empfohlene Parametertyp. Ein String-Literal ist ein `&str`, der in das Binary zeigt. `&my_string[..]` ist ein `&str` über den ganzen `String`. `&my_string[0..5]` ist ein `&str` über einen Teil davon. Ein Parametertyp nimmt alle drei, und `first_word(&s)` funktioniert, ob `s` nun ein `String` oder ein Literal ist.

Dasselbe gilt für Arrays und Vektoren: `&[i32]` ist ein Slice, und `sum(&v)`, `sum(&v[1..3])` und `sum(&[])` passen alle auf die eine Signatur.

## Byte-Offsets, nicht Zeichen-Offsets

String-Slicing arbeitet in Bytes. `s.find(' ')` und `s.rfind(' ')` liefern Offsets, die garantiert gültige Zeichengrenzen sind; selbst berechnete nicht unbedingt, und mitten in ein mehrbyteiges Zeichen zu schneiden stürzt zur Laufzeit mit `byte index N is not a char boundary` ab. Modul M4 behandelt das gründlich; hier genügt es, die Offsets von `find` zu beziehen.

## Die Randfälle, die die Tests festnageln

`first_word("hello")` - kein Leerzeichen, also die ganze Zeichenkette. `first_word("")` - die leere Zeichenkette. `last_word("fox")` - wieder die ganze Zeichenkette. `tail(&[])` - der leere Slice, und beachte, dass `&xs[1..]` auf einem leeren Slice abstürzt, es braucht also eine Absicherung.

## Deine Aufgabe

Sage das Snippet vorher, implementiere die vier Funktionen und sage dann in zwei Sätzen, was der Borrow-Checker an einem Slice prüft und was nicht. Modul M3 lässt Borrowing eine Weile ruhen und baut eigene Datentypen.

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

::: do command="cargo test --test m2-04-slices" cwd="."
Führe die Tests dieses Steps aus. Derselbe Befehl steckt hinter dem Knopf **Prüfen** an der Aufgabe *first_word, last_word, sum und tail bestehen*.
> expect: Je Test eine Zeile `test … ok` oder `… FAILED`, darunter die Zusammenfassung `test result: ok. 4 passed; 0 failed`, sobald alle 4 bestehen. Der erste Lauf braucht ein paar Sekunden, weil die Crate einmal übersetzt wird; jeder weitere bleibt deutlich unter einer Sekunde.
> recover: Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - hole es nach. Meldet es `no test target named`, stimmt der Name hinter `--test` nicht; `ls tests/` listet die gültigen Namen auf.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
