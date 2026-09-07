---
id: m6-03-trait-bounds
title: "Trait-Schranken: genau das verlangen, was du brauchst"
bloom: apply
objectives: [ "rust-ch10-02-traits" ]
requires: [ "m6-02-traits" ]
estimatedMinutes: 25
scaffold: faded
recallFrom: [ "m6-02-traits", "m6-01-generics" ]
links:
  - { step: "m6-04-lifetimes" }
  - { file: "src/m6/m6_03_bounds.rs" }
  - { file: "tests/m6-03-trait-bounds.rs" }
  - { url: "https://doc.rust-lang.org/book/ch10-02-traits.html", title: "The Book, 10.2: Traits as Parameters" }
sources: [ "src/m6/m6_03_bounds.rs", "tests/m6-03-trait-bounds.rs", "src/m6/m6_02_traits.rs" ]
tasks:
  - id: bounds
    title: "Die vier beschränkten Funktionen bestehen"
    check: { type: "testSuite", runner: "cargo", command: "cargo test --test m6-03-trait-bounds", expectPass: [ "m6_03_trait_bounds::notify_accepts_any_summary", "m6_03_trait_bounds::summarize_all_joins_with_newlines", "m6_03_trait_bounds::longest_summary_picks_the_longest", "m6_03_trait_bounds::describe_pair_needs_two_bounds" ], minPass: 4, timeoutMs: 180000 }
  - id: impl-vs-generic
    title: "Du kannst sagen, wann &impl Trait nicht genügt"
    check: { type: "question", prompt: { en: "notify takes &impl Summary and summarize_all takes <T: Summary>. Name a signature that can only be written with the explicit generic form and not with impl Trait, and explain what the explicit form guarantees that the short form does not.", de: "notify nimmt &impl Summary, summarize_all nimmt <T: Summary>. Nenne eine Signatur, die sich nur mit der ausdrücklichen generischen Form schreiben lässt und nicht mit impl Trait, und erkläre, was die ausdrückliche Form zusichert, was die Kurzform nicht zusichert." }, rubric: "Bewertet wird die Antwort. Alle drei Kriterien müssen erfüllt sein: (1) sie schreibt eine Signatur aus, in der ein benannter Typparameter an zwei Stellen steht - zwei Argumente eines Typs, ein Slice oder ein Ergebnis, das an ein Argument gebunden ist; (2) sie begründet das aus der Namenlosigkeit der Kurzform: zwei Vorkommen davon müssen nicht denselben Typ bezeichnen; (3) sie nennt die Zusicherung, die daraus folgt, nämlich ein einziger Typ über diese Stellen hinweg, benennbar an der Stelle, an der die Funktion benutzt wird. Besteht nicht: eine Signatur, die die Kurzform sehr wohl schreiben kann; eine Argumentation aus Lesbarkeit oder Länge; der Turbofish genannt ohne eine Signatur, die ihn verlangt.", recallPrompt: { en: "One function takes &impl Trait, another takes <T: Trait>. Name a signature only the named form can write, and say what it guarantees that the short form does not.", de: "Eine Funktion nimmt &impl Trait, eine andere <T: Trait>. Nenne eine Signatur, die nur die benannte Form schreiben kann, und sage, was sie zusichert, was die Kurzform nicht zusichert." }, bloom: "analyze", minChars: 70 }
socratic:
  - { trigger: "task:impl-vs-generic:failed", question: { en: "Write a signature with two &impl Summary parameters. Must the two arguments be the same type?", de: "Schreibe eine Signatur mit zwei &impl Summary-Parametern. Müssen die beiden Argumente denselben Typ haben?" }, hints: [ { en: "Each `impl Trait` in a parameter list introduces its own anonymous parameter, so two of them are two independent types.", de: "Jedes `impl Trait` in einer Parameterliste führt seinen eigenen anonymen Parameter ein; zwei davon sind also zwei unabhängige Typen." }, { en: "Now find a place in this file where the same type has to appear twice - a slice is the shortest example.", de: "Finde nun eine Stelle in dieser Datei, an der derselbe Typ zweimal auftreten muss - ein Slice ist das kürzeste Beispiel." }, { en: "The test also calls one function with an explicit type after the name; ask whether an anonymous parameter could be named that way.", de: "Der Test ruft eine Funktion auch mit einem ausdrücklichen Typ hinter dem Namen auf; frage, ob ein anonymer Parameter so benannt werden könnte." } ] }
  - { trigger: "task:bounds:failed", question: { en: "Which one fails? For `describe_pair`, check the equality case - does your code reach the tie branch when a and b compare equal?", de: "Welche scheitert? Prüfe bei `describe_pair` den Gleichheitsfall - erreicht dein Code den Gleichstandszweig, wenn a und b gleich sind?" }, hints: [ { en: "Three branches: `a > b`, `b > a`, and everything else is the tie. Two branches cannot express it.", de: "Drei Zweige: `a > b`, `b > a`, und alles Übrige ist der Gleichstand. Mit zwei Zweigen ist das nicht ausdrückbar." }, { en: "`summarize_all` joins with `\\n` and gives the empty string for an empty slice - collecting into a `Vec<String>` and calling `join` does both.", de: "`summarize_all` verbindet mit `\\n` und liefert bei leerem Slice die leere Zeichenkette - in einen `Vec<String>` zu sammeln und `join` aufzurufen erledigt beides." }, { en: "`longest_summary` compares the summaries, not the items, and keeps the earlier one on a tie.", de: "`longest_summary` vergleicht die Zusammenfassungen, nicht die Elemente, und behält bei Gleichstand die frühere." } ] }
misconceptions:
  - { pattern: "error\\[E0277\\]: `.*` doesn't implement `std::fmt::Display`", question: { en: "You are printing a value whose type has no Display. Is the bound missing from the signature, or is Debug what you actually want here?", de: "Du gibst einen Wert aus, dessen Typ kein Display hat. Fehlt die Schranke in der Signatur, oder willst du hier eigentlich Debug?" }, hints: [ { en: "`{}` needs `Display`; `{:?}` needs `Debug`. The bound in the signature has to match the placeholder you used.", de: "`{}` braucht `Display`, `{:?}` braucht `Debug`. Die Schranke in der Signatur muss zum verwendeten Platzhalter passen." }, { en: "Two bounds are joined with `+`: `T: Display + PartialOrd`.", de: "Zwei Schranken werden mit `+` verbunden: `T: Display + PartialOrd`." }, { en: "`describe_pair` prints and compares, so it needs both.", de: "`describe_pair` gibt aus und vergleicht, braucht also beide." } ] }
  - { pattern: "error\\[E0282\\]|type annotations needed", question: { en: "The compiler cannot pin down a generic parameter. Is it a call on an empty collection, where nothing tells it what T is?", de: "Der Compiler kann einen generischen Parameter nicht festlegen. Ist es ein Aufruf auf einer leeren Sammlung, bei dem nichts sagt, was T ist?" }, hints: [ { en: "`summarize_all(&[])` gives no element to infer from; the test writes `summarize_all::<Tweet>(&[])` for that reason.", de: "`summarize_all(&[])` bietet kein Element zum Herleiten; der Test schreibt deshalb `summarize_all::<Tweet>(&[])`." }, { en: "The turbofish `::<Type>` names the parameter explicitly at the call site.", de: "Der Turbofish `::<Type>` benennt den Parameter an der Aufrufstelle ausdrücklich." }, { en: "This is one thing `impl Trait` cannot do: an anonymous parameter has no name to give.", de: "Das ist eines, was `impl Trait` nicht kann: ein anonymer Parameter hat keinen Namen, den man angeben könnte." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
  - { pattern: "no test target named", question: { en: "cargo knows no test target of that name. Is the name after --test exactly the step id, without the .rs?", de: "cargo kennt kein Testziel dieses Namens. Ist der Name hinter --test genau die Step-ID, ohne das .rs?" }, hints: [ { en: "cargo prints `a target with a similar name exists` and names it - that line is usually the whole answer.", de: "cargo gibt `a target with a similar name exists` aus und nennt es - diese Zeile ist meist die ganze Antwort." }, { en: "The target name is the file name in tests/ without the extension, and it matches the step id exactly.", de: "Der Zielname ist der Dateiname in tests/ ohne Endung und stimmt genau mit der Step-ID überein." }, { en: "`ls tests/` lists every name that is valid after --test.", de: "`ls tests/` listet jeden Namen auf, der hinter --test gültig ist." } ] }
---
## Lernziel

Schreibe die drei Formen einer Trait-Schranke, kombiniere zwei Schranken und wähle die Form, die sagt, was du meinst.

Zusammen gelesen mit `m6-01-generics` und `m6-02-traits`: der Typparameter von dort und das Trait von hier treffen sich in der Schranke.

## Drei Schreibweisen, eine Idee

```rust
pub fn notify(item: &impl Summary) -> String { … }

pub fn summarize_all<T: Summary>(items: &[T]) -> String { … }

pub fn longest_summary<T>(items: &[T]) -> Option<String>
where
    T: Summary,
{ … }
```

Alle drei sagen "irgendein Typ, der `Summary` implementiert". `impl Trait` ist Zucker für die zweite; die `where`-Klausel ist die zweite unter die Signatur verschoben - dorthin gehören lange Schrankenlisten, bevor sie den Rückgabetyp aus der Zeile drängen.

## Was `impl Trait` nicht kann

`&impl Summary` führt **bei jedem Auftreten einen neuen anonymen Parameter** ein. Daraus folgt zweierlei, und beides steht hier nur als Tatsache: zwei Vorkommen in derselben Parameterliste sind zwei voneinander unabhängige Typen, und ein anonymer Parameter trägt keinen Namen, den man irgendwo angeben könnte.

Mehr brauchst du nicht, um selbst zu bestimmen, welche Signaturen die Kurzform nicht schreiben kann. Die Frage dieses Steps verlangt genau eine solche; zwei der drei Funktionen oben sind Fälle davon, und was diese beiden gemeinsam haben, ist die Antwort.

## Schranken kombinieren

```rust
pub fn describe_pair<T: Display + PartialOrd>(a: T, b: T) -> String
```

`+` heißt "und". Der Rumpf gibt aus, was `Display` braucht, und vergleicht, was `PartialOrd` braucht. Verlange genau das, was der Rumpf nutzt: eine unnötige Schranke weist Aufrufer ohne Gegenwert ab, und eine fehlende ist `error[E0277]`.

Beachte, dass `{}` `Display` braucht und `{:?}` `Debug` - zwei verschiedene Traits, und die Schranke muss zum geschriebenen Platzhalter passen.

## Die Zusage der statischen Bindung

Jede Form hier wird monomorphisiert: der Compiler erzeugt je konkretem Typ eine Kopie, löst die Aufrufe zur Übersetzungszeit auf und kann sie einbetten. Es gibt keine vtable und kein Nachschlagen zur Laufzeit. (`&dyn Summary` ist die andere Wahl, mit einer Kopie des Codes und einem Nachschlagen zur Laufzeit - außerhalb des belegten Materials dieses Kurses, aber den Namen wert.)

## Deine Aufgabe

Implementiere die vier Funktionen - achte auf den dreiwertigen Vergleich in `describe_pair`, wo der Gleichheitsfall einen eigenen Zweig braucht - und nenne dann eine Signatur, die `impl Trait` nicht ausdrücken kann. Ein Step bleibt vor dem Projekt: Lifetimes.

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

::: do command="cargo test --test m6-03-trait-bounds" cwd="."
Führe die Tests dieses Steps aus. Derselbe Befehl steckt hinter dem Knopf **Prüfen** an der Aufgabe *Die vier beschränkten Funktionen bestehen*.
> expect: Je Test eine Zeile `test … ok` oder `… FAILED`, darunter die Zusammenfassung `test result: ok. 4 passed; 0 failed`, sobald alle 4 bestehen. Der erste Lauf braucht ein paar Sekunden, weil die Crate einmal übersetzt wird; jeder weitere bleibt deutlich unter einer Sekunde.
> recover: Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - hole es nach. Meldet es `no test target named`, stimmt der Name hinter `--test` nicht; `ls tests/` listet die gültigen Namen auf.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
