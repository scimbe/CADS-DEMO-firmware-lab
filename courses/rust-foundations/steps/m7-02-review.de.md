---
id: m7-02-review
title: "Das eigene Werkzeug begutachten"
bloom: evaluate
objectives: [ "rust-project-cli", "rust-ch10-03-lifetime-syntax" ]
requires: [ "m7-01-wordstat" ]
estimatedMinutes: 40
scaffold: independent
recallFrom: [ "m1-02-move-vs-clone", "m5-04-custom-error", "m4-04-collections-report" ]
links:
  - { step: "m0-01-welcome" }
  - { file: "src/project/wordstat.rs" }
  - { file: "README.md" }
  - { url: "https://doc.rust-lang.org/book/ch10-02-traits.html", title: "The Book, 10.2: Traits: Defining Shared Behavior" }
sources: [ "src/project/wordstat.rs", "tests/m7-01-wordstat.rs", "README.md" ]
tasks:
  - id: fmt
    title: "Der Workspace ist formatiert"
    check: { type: "command", command: "cargo fmt --check", seedMustFail: false, expectExitCode: 0, timeoutMs: 120000 }
  - id: clippy
    title: "clippy ist sauber bei verbotenen Warnungen"
    check: { type: "command", command: "cargo clippy --all-targets -- -D warnings", expectExitCode: 0, timeoutMs: 300000 }
  - id: critique
    title: "Du kannst deinen eigenen Entwurf begutachten"
    check: { type: "question", prompt: { en: "Review your wordstat as if it were someone else's. Name one place where you allocate or clone more than the job needs and say what you would change; name one decision you made about errors (which failures panic, which return Err, what the messages say) and defend it; and name one thing the current design would make hard if the tool had to stream a file too large to hold in memory.", de: "Begutachte dein wordstat, als wäre es fremder Code. Nenne eine Stelle, an der du mehr allozierst oder klonst, als die Aufgabe verlangt, und sage, was du ändern würdest; nenne eine Entscheidung zur Fehlerbehandlung (was abstürzt, was Err liefert, was die Meldungen sagen) und verteidige sie; und nenne eine Sache, die der jetzige Entwurf erschweren würde, müsste das Werkzeug eine zu große Datei strömend verarbeiten." }, rubric: "All three parts answered concretely about the student's own code. The allocation point should name a real site - a clone per word in the ranking, the String built by normalize for every token, or read_to_string holding the whole file - with a plausible alternative. The error defence should state a contract, not a preference: which failures are the caller's business (missing file, empty file) and which would be bugs. The streaming answer should identify read_to_string as the blocker and note what changes with a line-by-line reader, ideally observing that count_words and report already work per-chunk while run does not.", bloom: "evaluate", minChars: 200 }
socratic:
  - { trigger: "task:clippy:failed", question: { en: "What does clippy name, and in which file? A lint on your own project code is worth fixing; one on an exercise file may be deliberate.", de: "Was benennt clippy, und in welcher Datei? Ein Lint im eigenen Projektcode lohnt die Korrektur; einer in einer Übungsdatei kann Absicht sein." }, hints: [ { en: "Every lint clippy reports names the rule; look it up with the link in its output before you silence it.", de: "Jeder von clippy gemeldete Lint nennt die Regel; schlage sie über den Link in der Ausgabe nach, bevor du sie stummschaltest." }, { en: "The workspace's existing `#[allow]` attributes all carry a comment saying why; a new one without a reason is a smell.", de: "Die vorhandenen `#[allow]`-Attribute des Workspace tragen alle einen Kommentar mit Begründung; ein neues ohne Grund ist ein schlechtes Zeichen." }, { en: "`cargo clippy --fix` applies the mechanical suggestions, but read the diff before you keep it.", de: "`cargo clippy --fix` übernimmt die mechanischen Vorschläge, aber lies den Diff, bevor du ihn behältst." } ] }
  - { trigger: "task:fmt:failed", question: { en: "Which file does cargo fmt want to change? Running it is the fix; reading the diff first is the lesson.", de: "Welche Datei will cargo fmt ändern? Es auszuführen ist die Lösung; den Diff zuerst zu lesen ist die Lektion." }, hints: [ { en: "`cargo fmt` rewrites the files; `cargo fmt --check` only reports.", de: "`cargo fmt` schreibt die Dateien um; `cargo fmt --check` meldet nur." }, { en: "The output lists each file and the line where the difference starts.", de: "Die Ausgabe nennt jede Datei und die Zeile, an der der Unterschied beginnt." }, { en: "Formatting is not a matter of taste in a shared codebase; it is what keeps diffs about behaviour.", de: "Formatierung ist in einer geteilten Codebasis keine Geschmacksfrage; sie hält Diffs bei der Sache." } ] }
misconceptions:
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
---
## Lernziel

Beurteile selbst geschriebenen Code an Kriterien, die du benennen kannst - Allokation, Fehlervertrag und was der Entwurf als Nächstes erschwert.

## Zwei Werkzeuge, die zuerst für dich begutachten

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
```

`cargo fmt` regelt die Formatierung, damit Diffs vom Verhalten handeln und von nichts sonst. `--check` meldet, ohne umzuschreiben; `cargo fmt` schreibt um.

`cargo clippy` ist ein zweiter Compilerdurchgang mit einigen hundert Lints für Dinge, die übersetzen, aber schlechter sind als die Alternative: eine eigene Schleife, wo es eine Methode gibt, ein `&String`-Parameter, wo `&str` genügte, ein Klon, der nichts bewirkt. `-D warnings` macht jeden Lint zum Fehler - was ein ernsthaftes Projekt in der CI tut.

Beide müssen sauber sein, einschließlich der Übungsdateien, die du früher im Kurs geschrieben hast. Wo der Workspace clippy absichtlich widerspricht, sagt er es: eine Handvoll Funktionen trägt `#[allow(clippy::…)]` mit einem Kommentar, der den Grund nennt - m2-01 behält den `&String`-Parameter des Buchs, m3-03 behält das ausgeschriebene `match` aus Listing 6-5. Das ist die ehrliche Art, einem Lint zu widersprechen. Ein `#[allow]` ohne Kommentar ist der Weg, auf dem eine Codebasis aufhört, etwas zu bedeuten.

## Den eigenen Code begutachten

Drei Fragen, und die Aufgabe verlangt, alle drei über *deine* Implementierung zu beantworten.

**Wo alloziert er mehr als nötig?** Kandidaten in diesem Entwurf: `normalize` baut für jedes Token einen `String`, auch für Token, die sich als Wiederholungen bereits gezählter Wörter erweisen; die Rangfolge klont jeden Schlüssel, sofern du die Map nicht mit `into_iter` verbraucht hast; und `read_to_string` hält die gesamte Datei im Speicher, bevor ein einziges Wort gezählt ist. Nicht alles davon lohnt die Korrektur - nenne eines, sage, was du tätest, und sage, ob du es tatsächlich tätest.

**Wie lautet der Fehlervertrag?** Formuliere ihn als Vertrag, nicht als Vorliebe. Eine fehlende Datei geht den Aufrufer an, also ist sie ein `Err`. Eine Datei ohne Wörter ist ein Zustand, von dem der Aufrufer verständlicherweise wissen will, also ist sie eine zweite Variante und kein leerer Bericht. Nichts in der Bibliothek stürzt ab, weil nichts darin ein Programmfehler ist, den sie erkennen könnte. Das Binary wandelt Fehler in Exit-Code 1 und eine Meldung auf stderr - was eine Shell erwartet.

**Was würde der Entwurf erschweren?** Die interessante Frage. `count_words` und `report` arbeiten auf einem `&str` beliebiger Größe und funktionierten stückweise. `run` nicht: `read_to_string` ist die Zeile, die strömende Verarbeitung verbietet. Zu erkennen, welche Teile des eigenen Entwurfs das Hindernis sind - und welche beiläufig in Ordnung waren -, ist die Fähigkeit, um die es in diesem Step geht.

## Wie es weitergeht

Das Pack indiziert die Kapitel 4, 5, 6, 8, 9 und 10 von *The Rust Programming Language*, und Rückfragen an den Tutor bleiben darin belegt. Die naheliegenden nächsten Kapitel sind 13 (Closures und Iteratoren), das die Hälfte von `report` in drei Zeilen umschriebe, und 15 (Smart Pointer). Der Tutor sagt dir, wenn eine Frage außerhalb dessen liegt, was er belegen kann, statt zu raten - und darauf ist Verlass.

## Deine Aufgabe

Mache beide Werkzeuge sauber und schreibe dann die Begutachtung. Sie wird an einer Rubrik bewertet, sei also konkret zu deinem eigenen Code statt allgemein zu Rust.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** die Fortschrittszeilen von cargo und eine abschließende Zeile `Finished`.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
