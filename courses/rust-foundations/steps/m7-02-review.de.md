---
id: m7-02-review
title: "Das eigene Werkzeug begutachten"
bloom: evaluate
objectives: [ "rust-project-cli", "rust-ch10-03-lifetime-syntax" ]
requires: [ "m7-01-wordstat" ]
estimatedMinutes: 40
scaffold: independent
recallFrom: [ "m1-02-move-vs-clone", "m5-04-custom-error", "m4-04-collections-report", "m6-01-generics" ]
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
    check: { type: "question", prompt: { en: "Review your wordstat as if it were someone else's. Name one place where you allocate or clone more than the job needs and say what you would change; name one decision you made about errors (which failures panic, which return Err, what the messages say) and defend it; and name one thing the current design would make hard if the tool had to stream a file too large to hold in memory.", de: "Begutachte dein wordstat, als wäre es fremder Code. Nenne eine Stelle, an der du mehr allozierst oder klonst, als die Aufgabe verlangt, und sage, was du ändern würdest; nenne eine Entscheidung zur Fehlerbehandlung (was abstürzt, was Err liefert, was die Meldungen sagen) und verteidige sie; und nenne eine Sache, die der jetzige Entwurf erschweren würde, müsste das Werkzeug eine zu große Datei als Datenstrom verarbeiten." }, rubric: "Alle drei Teile konkret am eigenen Code beantwortet. Die Allokationsstelle nennt eine wirkliche Stelle - ein clone je Wort in der Rangliste, die von normalize für jedes Token gebaute Zeichenkette, oder read_to_string, das die ganze Datei hält - samt einer plausiblen Alternative. Die Verteidigung der Fehlerbehandlung nennt einen Vertrag, keine Vorliebe: welche Fehlschläge Sache des Aufrufers sind (fehlende Datei, leere Datei) und welche Fehler im Programm wären. Die Antwort zum Datenstrom erkennt read_to_string als das Hindernis und hält fest, was sich mit einem zeilenweisen Leser ändert, im besten Fall mit der Beobachtung, dass count_words und report bereits stückweise arbeiten und run nicht. Besteht nicht: drei Antworten über Rust im Allgemeinen statt über diese Datei; eine Allokationsstelle ohne angebotene Alternative; oder eine Fehlerverteidigung, die eine Vorliebe statt eines Vertrags nennt.", bloom: "evaluate", minChars: 200 }
socratic:
  - { trigger: "task:clippy:failed", question: { en: "What does clippy name, and in which file? A lint on your own project code is worth fixing; one on an exercise file may be deliberate.", de: "Was benennt clippy, und in welcher Datei? Ein Lint im eigenen Projektcode lohnt die Korrektur; einer in einer Übungsdatei kann Absicht sein." }, hints: [ { en: "Every lint clippy reports names the rule; look it up with the link in its output before you silence it.", de: "Jeder von clippy gemeldete Lint nennt die Regel; schlage sie über den Link in der Ausgabe nach, bevor du sie stummschaltest." }, { en: "The workspace's existing `#[allow]` attributes all carry a comment saying why; a new one without a reason is a smell.", de: "Die vorhandenen `#[allow]`-Attribute des Workspace tragen alle einen Kommentar mit Begründung; ein neues ohne Grund ist ein schlechtes Zeichen." }, { en: "`cargo clippy --fix` applies the mechanical suggestions, but read the diff before you keep it.", de: "`cargo clippy --fix` übernimmt die mechanischen Vorschläge, aber lies den Diff, bevor du ihn behältst." } ] }
  - { trigger: "task:critique:failed", question: { en: "Open your wordstat.rs and find every place a String is created. How many of them survive the call?", de: "Öffne deine wordstat.rs und finde jede Stelle, an der ein String entsteht. Wie viele davon überleben den Aufruf?" }, hints: [ { en: "`normalize` builds a String for every token, including tokens that turn out to be words already counted.", de: "`normalize` baut für jedes Token einen String, auch für Token, die sich als bereits gezählte Wörter erweisen." }, { en: "For the error part, state the contract rather than the preference: which failures are the caller's business, and which would mean your own code is wrong?", de: "Formuliere beim Fehlerteil den Vertrag statt der Vorliebe: welche Fehlschläge gehen den Aufrufer an, und welche hiessen, dass dein eigener Code falsch ist?" }, { en: "For the streaming part, find the one line that needs the whole file present before anything else can happen.", de: "Suche für den Datenstrom-Teil die eine Zeile, die die ganze Datei benötigt, bevor überhaupt etwas anderes passieren kann." } ] }
  - { trigger: "task:fmt:failed", question: { en: "Which file does cargo fmt want to change? Running it is the fix; reading the diff first is the lesson.", de: "Welche Datei will cargo fmt ändern? Es auszuführen ist die Lösung; den Diff zuerst zu lesen ist die Lektion." }, hints: [ { en: "`cargo fmt` rewrites the files; `cargo fmt --check` only reports.", de: "`cargo fmt` schreibt die Dateien um; `cargo fmt --check` meldet nur." }, { en: "The output lists each file and the line where the difference starts.", de: "Die Ausgabe nennt jede Datei und die Zeile, an der der Unterschied beginnt." }, { en: "Formatting is not a matter of taste in a shared codebase; it is what keeps diffs about behaviour.", de: "Formatierung ist in einer geteilten Codebasis keine Geschmacksfrage; sie hält Diffs bei der Sache." } ] }
misconceptions:
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
---
## Lernziel

Beurteile selbst geschriebenen Code an Kriterien, die du benennen kannst - Allokation, Fehlervertrag und was der Entwurf als Nächstes erschwert.

Begutachtet wird gegen vier frühere Steps: `m1-02-move-vs-clone` für die Frage, was ein Klon kostet, `m4-04-collections-report` für die Reproduzierbarkeit einer Ausgabe, `m5-04-custom-error` für den Fehlervertrag und `m6-01-generics` für die Schranke, die eine Signatur wirklich braucht.

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

**Wo alloziert er mehr als nötig?** Lies deine eigene Datei und finde die Stellen, an denen etwas gebaut und dann weggeworfen wird, oder etwas ganz gehalten wird, von dem nur ein Teil gebraucht wird. Nicht alles davon lohnt die Korrektur - nenne eines, sage, was du tätest, und sage, ob du es tatsächlich tätest.

**Wie lautet der Fehlervertrag?** Formuliere ihn als Vertrag, nicht als Vorliebe. Eine fehlende Datei geht den Aufrufer an, also ist sie ein `Err`. Eine Datei ohne Wörter ist ein Zustand, von dem der Aufrufer verständlicherweise wissen will, also ist sie eine zweite Variante und kein leerer Bericht. Nichts in der Bibliothek stürzt ab, weil nichts darin ein Programmfehler ist, den sie erkennen könnte. Das Binary wandelt Fehler in Exit-Code 1 und eine Meldung auf stderr - was eine Shell erwartet.

**Was würde der Entwurf erschweren?** Die interessante Frage. Gehe deine vier Funktionen durch und frage bei jeder, ob sie mit jeweils einem Stück der Datei arbeiten könnte. Zu erkennen, welche Teile des eigenen Entwurfs das Hindernis sind - und welche beiläufig in Ordnung waren -, ist die Fähigkeit, um die es in diesem Step geht.

## Wie es weitergeht

Das Pack indiziert die Kapitel 4, 5, 6, 8, 9 und 10 von *The Rust Programming Language*, und Rückfragen an den Tutor bleiben darin belegt. Die naheliegenden nächsten Kapitel sind 13 (Closures und Iteratoren), das die Hälfte von `report` in drei Zeilen umschriebe, und 15 (Smart Pointer). Der Tutor sagt dir, wenn eine Frage außerhalb dessen liegt, was er belegen kann, statt zu raten - und darauf ist Verlass.

## Deine Aufgabe

Mache beide Werkzeuge sauber und schreibe dann die Begutachtung. Sie wird an einer Rubrik bewertet, sei also konkret zu deinem eigenen Code statt allgemein zu Rust.

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

::: do command="cargo fmt --check" cwd="."
Führe den Befehl der Aufgabe *Der Workspace ist formatiert* aus.
> expect: Der Befehl endet ohne Fehler und ohne Meldung; darunter erscheint die Eingabeaufforderung wieder.
> recover: Bleibt der Cursor stehen, ohne dass die Eingabeaufforderung zurückkommt, läuft er noch - das ist kein Hänger. Antwortet cargo mit `could not find Cargo.toml`, fehlt das `cd` von oben.
:::

::: do command="cargo clippy --all-targets -- -D warnings" cwd="."
Führe den Befehl der Aufgabe *clippy ist sauber bei verbotenen Warnungen* aus.
> expect: Der Befehl endet ohne Fehler und ohne Meldung; darunter erscheint die Eingabeaufforderung wieder.
> recover: Bleibt der Cursor stehen, ohne dass die Eingabeaufforderung zurückkommt, läuft er noch - das ist kein Hänger. Antwortet cargo mit `could not find Cargo.toml`, fehlt das `cd` von oben.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
