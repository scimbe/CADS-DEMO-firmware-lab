---
id: m3-04-if-let
title: "if let und let ... else"
bloom: apply
objectives: [ "rust-ch06-03-if-let" ]
requires: [ "m3-03-match" ]
estimatedMinutes: 20
scaffold: independent
recallFrom: [ "m3-02-enums" ]
links:
  - { step: "m4-01-vectors" }
  - { file: "src/m3/m3_04_if_let.rs" }
  - { file: "tests/m3-04-if-let.rs" }
  - { url: "https://doc.rust-lang.org/book/ch06-03-if-let.html", title: "The Book, 6.3: Concise Control Flow with if let" }
sources: [ "src/m3/m3_04_if_let.rs", "tests/m3-04-if-let.rs" ]
tasks:
  - id: if-let
    title: "Die vier if-let-Übungen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m3-04-if-let", expectPass: [ "m3_04_if_let::config_or_default_falls_back_to_three", "m3_04_if_let::count_non_quit_skips_quit", "m3_04_if_let::longest_write_picks_the_longest", "m3_04_if_let::longest_write_keeps_the_first_on_a_tie", "m3_04_if_let::first_move_x_returns_minus_one_without_a_move" ], minPass: 5, timeoutMs: 180000 }
  - id: when
    title: "Du kannst sagen, wann if let dich etwas kostet"
    check: { type: "question", prompt: { en: "Name a variant you could add to Command that would make longest_write silently wrong while it still compiles, and one thing you would do to catch it. Two sentences.", de: "Nenne eine Variante, die du Command hinzufügen könntest, nach der longest_write stillschweigend falsch wäre und dennoch übersetzte, und eine Sache, mit der du das abfangen würdest. Zwei Sätze." }, rubric: "Erster Satz: eine Variante, die ebenfalls Text trägt - WriteLine(String), Append { text: String } -, die longest_write berücksichtigen müsste, aber übergeht, weil das if let nur auf Command::Write passt und alles andere durchfällt. Zweiter Satz: ein Gegenmittel, das tatsächlich griffe - das if let durch ein match mit benannten Zweigen ersetzen oder einen Test ergänzen, der das Verhalten der neuen Variante festhält. Besteht nicht: eine Variante ohne Text, denn die zu übergehen ist richtig; oder ein Gegenmittel, das auf Sorgfalt oder gründlicheres Review hinausläuft.", recallPrompt: { en: "A function uses if let to pick one text-carrying variant out of an enum. Name a variant that would make it silently wrong while it still compiles, and one thing that would catch that.", de: "Eine Funktion greift mit if let eine textführende Variante aus einem Enum heraus. Nenne eine Variante, die sie stillschweigend falsch machte, während sie weiter übersetzt, und eine Sache, die das abfinge." }, bloom: "evaluate", minChars: 70 }
socratic:
  - { trigger: "task:when:failed", question: { en: "Which of the four existing variants does longest_write look at, and what happens to the other three?", de: "Welche der vier vorhandenen Varianten sieht longest_write an, und was geschieht mit den drei anderen?" }, hints: [ { en: "The if let names one variant. Everything that does not match it is skipped without a word - no warning, no error.", de: "Das if let nennt eine Variante. Alles, was nicht passt, wird wortlos übersprungen - keine Warnung, kein Fehler." }, { en: "So invent a fifth variant that a reader would expect longest_write to include. What would it have to carry for that expectation to be reasonable?", de: "Erfinde also eine fünfte Variante, die ein Leser in longest_write erwarten würde. Was müsste sie tragen, damit diese Erwartung berechtigt ist?" }, { en: "A remedy has to be something the compiler or a test performs; anything that depends on somebody remembering is not one.", de: "Eine Abhilfe muss etwas sein, das der Compiler oder ein Test ausführt; alles, was davon abhängt, dass sich jemand erinnert, ist keine." } ] }
  - { trigger: "task:if-let:failed", question: { en: "Which one fails? For `longest_write` on a tie, does your comparison replace the current best when the lengths are equal?", de: "Welche scheitert? Ersetzt dein Vergleich in `longest_write` bei gleicher Länge den bisherigen Besten?" }, hints: [ { en: "Use a strict `>` so equal lengths keep the earlier candidate.", de: "Nutze ein striktes `>`, damit gleiche Längen den früheren Kandidaten behalten." }, { en: "`matches!(c, Command::Quit)` is the shortest way to ask whether a value has one particular variant.", de: "`matches!(c, Command::Quit)` ist der kürzeste Weg zu fragen, ob ein Wert eine bestimmte Variante hat." }, { en: "In `first_move_x`, `let ... else` must diverge in its else block: `continue` inside a loop, or `return`.", de: "In `first_move_x` muss der else-Block von `let ... else` divergieren: `continue` in einer Schleife oder `return`." } ] }
misconceptions:
  - { pattern: "`else` clause of `let\\.\\.\\.else` does not diverge", question: { en: "The else block of a let ... else has to leave the enclosing block. What does yours do instead - fall through, or produce a value?", de: "Der else-Block eines let ... else muss den umgebenden Block verlassen. Was tut deiner stattdessen - durchfallen oder einen Wert liefern?" }, hints: [ { en: "`return`, `continue`, `break` and `panic!` all diverge; an ordinary expression does not.", de: "`return`, `continue`, `break` und `panic!` divergieren alle; ein gewöhnlicher Ausdruck nicht." }, { en: "Inside a `for` loop over the commands, `continue` is the natural way out.", de: "In einer `for`-Schleife über die Kommandos ist `continue` der natürliche Ausweg." }, { en: "If you wanted a value rather than an exit, `if let ... else` is the construct you want instead.", de: "Willst du einen Wert statt eines Ausstiegs, ist `if let ... else` das passende Konstrukt." } ] }
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "An `if let` used as an expression: do both branches produce the same type, and does the else branch produce one at all?", de: "Ein `if let` als Ausdruck: liefern beide Zweige denselben Typ, und liefert der else-Zweig überhaupt einen?" }, hints: [ { en: "`if let Some(v) = o { v } else { 3 }` has type `u8`; without the `else` it would have type `()`.", de: "`if let Some(v) = o { v } else { 3 }` hat den Typ `u8`; ohne das `else` hätte es den Typ `()`." }, { en: "Inside the branch, `v` is the unwrapped value, not the Option.", de: "Im Zweig ist `v` der ausgepackte Wert, nicht das Option." }, { en: "`longest_write` returns `Option<String>`, so the accumulator has that type from the start.", de: "`longest_write` liefert `Option<String>`, der Akkumulator hat diesen Typ also von Anfang an." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Wähle zwischen `match`, `if let` und `let ... else` und benenne, was jede Wahl aufgibt.

Das Gegenstück ist `m3-02-enums`: dieselben Varianten, nur interessiert hier eine einzige davon und der Rest soll schweigen dürfen.

## Die Zeremonie, die `if let` erspart

```rust
match config {
    Some(v) => v,
    None => 3,
}
```

Zwei Zweige, einer davon ein Platzhalter. `if let` sagt dasselbe:

```rust
if let Some(v) = config { v } else { 3 }
```

Beide Zweige liefern ein `u8`, das Ganze ist also ein Ausdruck. Lässt du das `else` weg, wird der Typ `()` - nützlich, wenn du nur einen Seiteneffekt willst, nutzlos, wenn du einen Wert willst.

Clippy bemerkt, dass genau diese Form `config.unwrap_or(3)` ist, und sagt es. Es hat recht, und die Referenzlösung folgt dem Hinweis; erst die lange Form zu schreiben und dann den Vorschlag anzunehmen ist der gedachte Weg, kein Umweg.

## `if let` in einer Schleife

```rust
for c in commands {
    if let Command::Write(text) = c {
        // nur Write kommt hierher; alles andere wird übersprungen
    }
}
```

Das ist die Form für "mit einer Variante etwas tun, den Rest ignorieren". `matches!(c, Command::Quit)` ist die noch kürzere Form, wenn nur ein Ja oder Nein gebraucht wird - was `count_non_quit` will.

## `let ... else`

Wenn der *gute Fall* weiterlaufen und alles andere aussteigen soll:

```rust
let Command::Move { x, .. } = c else {
    continue;
};
return *x;
```

Die Bindung bleibt für den Rest des Blocks sichtbar, es gibt also keine Einrückung nach rechts. Die Regel ist, dass der `else`-Block **divergieren** muss - `return`, `continue`, `break` oder `panic!`. Ihn mit einem gewöhnlichen Ausdruck zu beenden ist ein Übersetzungsfehler, der besagt, dass die else-Klausel nicht divergiert. Das `..` im Muster ignoriert die nicht genannten Felder.

## Was du aufgibst

`match` prüft, dass du jede Variante abgedeckt hast. `if let` nicht: alles, was nicht dem Muster entspricht, fällt in das `else` - stillschweigend und dauerhaft. Das ist der ganze Handel, und die Frage unten verlangt, ihn an `longest_write` konkret zu machen - der einen Funktion dieses Steps, die sich auf eine einzige Variante festlegt.

Ob dieser Handel vertretbar ist, hängt davon ab, ob die Korrektheit des Codes auf der ganzen Menge der Varianten ruht oder auf einer einzelnen. Die Frageaufgabe verlangt, dieses Argument konkret an dieser Datei zu führen.

## Deine Aufgabe

Implementiere die vier Funktionen und beschreibe dann eine Änderung an `Command`, die `longest_write` stillschweigend brechen würde. Modul M4 lässt eigene Typen hinter sich und wendet sich den Sammlungen der Standardbibliothek zu.

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

::: do command="cargo test --test m3-04-if-let" cwd="."
Führe die Tests dieses Steps aus. Derselbe Befehl steckt hinter dem Knopf **Prüfen** an der Aufgabe *Die vier if-let-Übungen bestehen*.
> expect: Je Test eine Zeile `test … ok` oder `… FAILED`, darunter die Zusammenfassung `test result: ok. 5 passed; 0 failed`, sobald alle 5 bestehen. Der erste Lauf braucht ein paar Sekunden, weil die Crate einmal übersetzt wird; jeder weitere bleibt deutlich unter einer Sekunde.
> recover: Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - hole es nach. Meldet es `no test target named`, stimmt der Name hinter `--test` nicht; `ls tests/` listet die gültigen Namen auf.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
