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
    check: { type: "question", prompt: { en: "join_owned takes String, repeat_words takes &str. One sentence each: what the first demands of its caller, and what the second would cost every call site if it took String too.", de: "join_owned nimmt String, repeat_words nimmt &str. Je ein Satz: was das Erste von seinem Aufrufer verlangt, und was das Zweite jede Aufrufstelle kosten würde, nähme es ebenfalls String." }, rubric: "Bewertet wird die Antwort. Alle drei Kriterien müssen erfüllt sein: (1) bei der verbrauchenden Signatur nennt sie, was der Aufrufer aufgibt, nämlich dass der Wert für ihn danach unbrauchbar ist, statt den Typ zu beschreiben; (2) sie sagt, warum das hier vertretbar ist, und zeigt dafür auf das, was der Rumpf mit dem übergebenen Wert tut; (3) bei der leihenden Signatur nennt sie Kosten, die sich wiederholen, und sagt wo sie sich wiederholen: an jeder Aufrufstelle statt einmal in der Funktion. Besteht nicht: die beiden Typen beschrieben, ohne dass jemandem Kosten entstünden; &str für besser erklärt, ohne den Grund zu nennen, aus dem die andere Signatur richtig ist; Kosten in der Funktion verortet statt bei ihren Aufrufern.", bloom: "evaluate", minChars: 60 }
socratic:
  - { trigger: "task:signature:failed", question: { en: "Look at the two call sites in the test. Which of them would have to change if the signature changed?", de: "Sieh dir die beiden Aufrufstellen im Test an. Welche müsste sich ändern, wenn sich die Signatur änderte?" }, hints: [ { en: "`repeat_words(\"ho\", 3)` passes a literal. Write out what that call would look like if the parameter were a String.", de: "`repeat_words(\"ho\", 3)` übergibt ein Literal. Schreibe auf, wie dieser Aufruf aussähe, wäre der Parameter ein String." }, { en: "For join_owned, ask what its body does with `a` - whether it builds something new or keeps what it was handed.", de: "Frage bei join_owned, was der Rumpf mit `a` tut - baut er etwas Neues oder behält er das Übergebene?" }, { en: "One signature is paid for once inside the function; the other is paid again at every place the function is called.", de: "Eine Signatur wird einmal in der Funktion bezahlt, die andere an jeder Stelle erneut, an der die Funktion aufgerufen wird." } ] }
  - { trigger: "task:functions:failed", question: { en: "Which of the three is failing? For `repeat_words`, check the two edge cases first: n = 1 must not add a separator, n = 0 must give the empty string.", de: "Welche der drei scheitert? Prüfe bei `repeat_words` zuerst die beiden Randfälle: n = 1 darf kein Trennzeichen anhängen, n = 0 muss die leere Zeichenkette liefern." }, hints: [ { en: "Push the separator *before* every word except the first, rather than after every word and trimming at the end.", de: "Hänge das Trennzeichen *vor* jedes Wort außer dem ersten, statt es hinter jedes zu setzen und am Ende abzuschneiden." }, { en: "`longer_owned` must return `a` on a tie: compare with `>` in the direction that makes the tie fall to `a`.", de: "`longer_owned` muss bei Gleichstand `a` liefern: vergleiche mit `>` in der Richtung, die den Gleichstand `a` zuschlagen lässt." }, { en: "In `join_owned` the doc comment forbids cloning; take ownership of `a`, make the binding mutable, and push `b` onto it.", de: "In `join_owned` verbietet der Doc-Kommentar das Klonen; übernimm `a`, mache die Bindung veränderlich und hänge `b` daran." } ] }
misconceptions:
  - { pattern: "error\\[E0382\\]", question: { en: "Something is used after it was given away. Which of the two owned parameters did you move first, and does the code after that still need it?", de: "Etwas wird nach dem Weggeben benutzt. Welchen der beiden besitzenden Parameter hast du zuerst verschoben, und braucht der Code danach ihn noch?" }, hints: [ { en: "`out.push_str(&b)` borrows `b` instead of moving it - the `&` is what keeps it usable.", de: "`out.push_str(&b)` leiht `b` aus, statt ihn zu verschieben - das `&` erhält seine Nutzbarkeit." }, { en: "Reading `.len()` does not move anything; assigning the value to another binding does.", de: "`.len()` zu lesen verschiebt nichts; den Wert an eine andere Bindung zu binden schon." }, { en: "In an if/else that returns one of two owned values, each branch moves only the value it returns - that is allowed.", de: "In einem if/else, das einen von zwei besitzenden Werten liefert, verschiebt jeder Zweig nur seinen eigenen Wert - das ist erlaubt." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
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

`join_owned(a: String, b: String) -> String` verbraucht beide, und der Doc-Kommentar verbietet das Klonen. Ob das der richtige Vertrag ist, fragt die Aufgabe unten, und die Antwort steht in der Implementierung: sieh darauf, was der Rumpf mit `a` tut, nicht darauf, was sein Typ sagt. Beachte, dass `push_str` einen `&str` nimmt: `out.push_str(&b)` leiht `b` aus, statt ihn zu verschieben; das `&` ist keine Verzierung.

`longer_owned(a: String, b: String) -> String` verbraucht ebenfalls beide und verwirft den Verlierer beim Verlassen. Jeder Zweig des `if` verschiebt nur den Wert, den er zurückgibt, und das ist erlaubt: der Compiler verfolgt Moves pro Pfad, nicht pro Funktion. Bei Gleichstand gewinnt `a`; vergleiche daher in der Richtung, die das von selbst ergibt, statt einen Sonderfall zu ergänzen.

`repeat_words(word: &str, n: usize) -> String` leiht; sie liest das Wort nur. `&str` akzeptiert Literale, `&String` und Slices gleichermaßen. Sieh dir die beiden Aufrufstellen im Test an und frage, was jede von ihnen schreiben müsste, verlangte dieser Parameter Ownership - das ist die zweite Hälfte der Aufgabe unten.

Achte auf die beiden Randfälle: `n = 1` darf kein Trennzeichen erzeugen, `n = 0` die leere Zeichenkette. Das Leerzeichen *vor* jedes Wort außer dem ersten zu setzen erledigt beides ohne abschließendes Abschneiden.

## Die Gewohnheit, die bleibt

Frage bei jedem Parameter: muss diese Funktion den Wert über ihr Ende hinaus behalten? Frage dann, was deine Antwort die Aufrufer kostet. Die Frage unten ist diese zweite Hälfte.

## Deine Aufgabe

Implementiere die drei Funktionen, führe die Tests dieses Steps aus dem Block unten aus und begründe dann die beiden unterschiedlichen Parameterstile. Modul M2 führt die dritte Zeile der Tabelle ein.

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

::: do command="cargo test --test m1-04-ownership-and-functions" cwd="."
Führe die Tests dieses Steps aus. Derselbe Befehl steckt hinter dem Knopf **Prüfen** an der Aufgabe *join, longer und repeat_words bestehen*.
> expect: Je Test eine Zeile `test … ok` oder `… FAILED`, darunter die Zusammenfassung `test result: ok. 5 passed; 0 failed`, sobald alle 5 bestehen. Der erste Lauf braucht ein paar Sekunden, weil die Crate einmal übersetzt wird; jeder weitere bleibt deutlich unter einer Sekunde.
> recover: Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - hole es nach. Meldet es `no test target named`, stimmt der Name hinter `--test` nicht; `ls tests/` listet die gültigen Namen auf.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
