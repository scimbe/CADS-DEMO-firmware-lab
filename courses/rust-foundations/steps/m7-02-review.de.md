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
    check: { type: "question", prompt: { en: "Review your wordstat as if it were someone else's. Name one place where you allocate or clone more than the job needs and say what you would change; name one decision you made about errors (which failures panic, which return Err, what the messages say) and defend it; and name one thing the current design would make hard if the tool had to stream a file too large to hold in memory.", de: "Begutachte dein wordstat, als waere es fremder Code. Nenne eine Stelle, an der du mehr allozierst oder klonst, als die Aufgabe verlangt, und sage, was du aendern wuerdest; nenne eine Entscheidung zur Fehlerbehandlung (was abstuerzt, was Err liefert, was die Meldungen sagen) und verteidige sie; und nenne eine Sache, die der jetzige Entwurf erschweren wuerde, muesste das Werkzeug eine zu grosse Datei stroemend verarbeiten." }, rubric: "All three parts answered concretely about the student's own code. The allocation point should name a real site - a clone per word in the ranking, the String built by normalize for every token, or read_to_string holding the whole file - with a plausible alternative. The error defence should state a contract, not a preference: which failures are the caller's business (missing file, empty file) and which would be bugs. The streaming answer should identify read_to_string as the blocker and note what changes with a line-by-line reader, ideally observing that count_words and report already work per-chunk while run does not.", bloom: "evaluate", minChars: 200 }
socratic:
  - { trigger: "task:clippy:failed", question: { en: "What does clippy name, and in which file? A lint on your own project code is worth fixing; one on an exercise file may be deliberate.", de: "Was benennt clippy, und in welcher Datei? Ein Lint im eigenen Projektcode lohnt die Korrektur; einer in einer Uebungsdatei kann Absicht sein." }, hints: [ { en: "Every lint clippy reports names the rule; look it up with the link in its output before you silence it.", de: "Jeder von clippy gemeldete Lint nennt die Regel; schlage sie ueber den Link in der Ausgabe nach, bevor du sie stummschaltest." }, { en: "The workspace's existing `#[allow]` attributes all carry a comment saying why; a new one without a reason is a smell.", de: "Die vorhandenen `#[allow]`-Attribute des Workspace tragen alle einen Kommentar mit Begruendung; ein neues ohne Grund ist ein schlechtes Zeichen." }, { en: "`cargo clippy --fix` applies the mechanical suggestions, but read the diff before you keep it.", de: "`cargo clippy --fix` uebernimmt die mechanischen Vorschlaege, aber lies den Diff, bevor du ihn behaeltst." } ] }
  - { trigger: "task:fmt:failed", question: { en: "Which file does cargo fmt want to change? Running it is the fix; reading the diff first is the lesson.", de: "Welche Datei will cargo fmt aendern? Es auszufuehren ist die Loesung; den Diff zuerst zu lesen ist die Lektion." }, hints: [ { en: "`cargo fmt` rewrites the files; `cargo fmt --check` only reports.", de: "`cargo fmt` schreibt die Dateien um; `cargo fmt --check` meldet nur." }, { en: "The output lists each file and the line where the difference starts.", de: "Die Ausgabe nennt jede Datei und die Zeile, an der der Unterschied beginnt." }, { en: "Formatting is not a matter of taste in a shared codebase; it is what keeps diffs about behaviour.", de: "Formatierung ist in einer geteilten Codebasis keine Geschmacksfrage; sie haelt Diffs bei der Sache." } ] }
---
## Lernziel

Beurteile selbst geschriebenen Code an Kriterien, die du benennen kannst - Allokation, Fehlervertrag und was der Entwurf als Naechstes erschwert.

## Zwei Werkzeuge, die zuerst fuer dich begutachten

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
```

`cargo fmt` regelt die Formatierung, damit Diffs vom Verhalten handeln und von nichts sonst. `--check` meldet, ohne umzuschreiben; `cargo fmt` schreibt um.

`cargo clippy` ist ein zweiter Compilerdurchgang mit einigen hundert Lints fuer Dinge, die uebersetzen, aber schlechter sind als die Alternative: eine eigene Schleife, wo es eine Methode gibt, ein `&String`-Parameter, wo `&str` genuegte, ein Klon, der nichts bewirkt. `-D warnings` macht jeden Lint zum Fehler - was ein ernsthaftes Projekt in der CI tut.

Beide muessen sauber sein, einschliesslich der Uebungsdateien, die du frueher im Kurs geschrieben hast. Wo der Workspace clippy absichtlich widerspricht, sagt er es: eine Handvoll Funktionen traegt `#[allow(clippy::…)]` mit einem Kommentar, der den Grund nennt - m2-01 behaelt den `&String`-Parameter des Buchs, m3-03 behaelt das ausgeschriebene `match` aus Listing 6-5. Das ist die ehrliche Art, einem Lint zu widersprechen. Ein `#[allow]` ohne Kommentar ist der Weg, auf dem eine Codebasis aufhoert, etwas zu bedeuten.

## Den eigenen Code begutachten

Drei Fragen, und die Aufgabe verlangt, alle drei ueber *deine* Implementierung zu beantworten.

**Wo alloziert er mehr als noetig?** Kandidaten in diesem Entwurf: `normalize` baut fuer jedes Token einen `String`, auch fuer Token, die sich als Wiederholungen bereits gezaehlter Woerter erweisen; die Rangfolge klont jeden Schluessel, sofern du die Map nicht mit `into_iter` verbraucht hast; und `read_to_string` haelt die gesamte Datei im Speicher, bevor ein einziges Wort gezaehlt ist. Nicht alles davon lohnt die Korrektur - nenne eines, sage, was du taetest, und sage, ob du es tatsaechlich taetest.

**Wie lautet der Fehlervertrag?** Formuliere ihn als Vertrag, nicht als Vorliebe. Eine fehlende Datei geht den Aufrufer an, also ist sie ein `Err`. Eine Datei ohne Woerter ist ein Zustand, von dem der Aufrufer verstaendlicherweise wissen will, also ist sie eine zweite Variante und kein leerer Bericht. Nichts in der Bibliothek stuerzt ab, weil nichts darin ein Programmfehler ist, den sie erkennen koennte. Das Binary wandelt Fehler in Exit-Code 1 und eine Meldung auf stderr - was eine Shell erwartet.

**Was wuerde der Entwurf erschweren?** Die interessante Frage. `count_words` und `report` arbeiten auf einem `&str` beliebiger Groesse und funktionierten stueckweise. `run` nicht: `read_to_string` ist die Zeile, die stroemende Verarbeitung verbietet. Zu erkennen, welche Teile des eigenen Entwurfs das Hindernis sind - und welche beilaeufig in Ordnung waren -, ist die Faehigkeit, um die es in diesem Step geht.

## Wie es weitergeht

Das Pack indiziert die Kapitel 4, 5, 6, 8, 9 und 10 von *The Rust Programming Language*, und Rueckfragen an den Tutor bleiben darin belegt. Die naheliegenden naechsten Kapitel sind 13 (Closures und Iteratoren), das die Haelfte von `report` in drei Zeilen umschriebe, und 15 (Smart Pointer). Der Tutor sagt dir, wenn eine Frage ausserhalb dessen liegt, was er belegen kann, statt zu raten - und darauf ist Verlass.

## Deine Aufgabe

Mache beide Werkzeuge sauber und schreibe dann die Begutachtung. Sie wird an einer Rubrik bewertet, sei also konkret zu deinem eigenen Code statt allgemein zu Rust.
