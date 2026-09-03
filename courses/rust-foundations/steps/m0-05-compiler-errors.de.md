---
id: m0-05-compiler-errors
title: "Eine Compilerfehlermeldung lesen und die Datei reparieren"
bloom: analyze
objectives: [ "rust-tooling-diagnostics" ]
requires: [ "m0-04-predict-output" ]
estimatedMinutes: 20
scaffold: independent
links:
  - { step: "m1-01-scope-and-move" }
  - { file: "repair/m0_05_type_mismatch.rs" }
  - { file: "README.md" }
  - { url: "https://doc.rust-lang.org/error_codes/E0308.html", title: "rustc error index: E0308" }
sources: [ "repair/m0_05_type_mismatch.rs", "README.md" ]
tasks:
  - id: repair
    title: "Die reparierte Datei kompiliert und gibt den Satz aus"
    check: { type: "command", command: "mkdir -p target/check && rustc --edition 2024 -o target/check/m0_05 repair/m0_05_type_mismatch.rs && target/check/m0_05", expectExitCode: 0, expectStdout: "Ada is 36 years old and 1 metre 62 tall\\.", timeoutMs: 120000 }
  - id: method
    title: "Du kannst beschreiben, wie du die Diagnose gelesen hast"
    check: { type: "question", prompt: { en: "rustc reported three E0308 errors, but you did not need three separate fixes. Explain which parts of one diagnostic - the code, the underlined span, the expected/found pair, the help line - told you what to change, and why fixing one line removed more than one error.", de: "rustc meldete drei E0308-Fehler, du brauchtest aber nicht drei getrennte Korrekturen. Erkläre, welche Teile einer Diagnose - Fehlercode, unterstrichene Stelle, expected/found-Paar, help-Zeile - dir sagten, was zu ändern ist, und warum eine korrigierte Zeile mehr als einen Fehler beseitigt hat." }, rubric: "Explains that the caret marks the expression whose type is wrong and expected/found names both sides, and that declaring name as &str (rather than String) fixed both the literal-assignment error and the argument-type error at the call site, because the second error was a consequence of the first declaration. Mentioning that the help line proposes a concrete edit is a plus; blindly following help without reading expected/found should not earn full credit.", bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:repair:failed", question: { en: "How many errors does rustc report now, and is it fewer than before? Which line does the first caret point at?", de: "Wie viele Fehler meldet rustc jetzt, und sind es weniger als zuvor? Auf welche Zeile zeigt das erste Caret?" }, hints: [ { en: "Work top down and rebuild after every single change: later errors are often consequences of the first one.", de: "Arbeite von oben nach unten und baue nach jeder einzelnen Änderung neu: spätere Fehler sind oft Folgen des ersten." }, { en: "A literal in double quotes has type `&str`. Either the annotation or the value has to give way - and the function's parameter says which.", de: "Ein Literal in Anführungszeichen hat den Typ `&str`. Entweder die Annotation oder der Wert muss weichen - und der Parameter der Funktion sagt, welcher." }, { en: "Do not change `describe`; it is correct. The three errors are all in `main`, and two of them are the same mistake.", de: "Ändere `describe` nicht; sie ist korrekt. Die drei Fehler stehen alle in `main`, und zwei davon sind derselbe Fehler." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Read the `expected ... found ...` line aloud. Which of the two is the annotation you wrote, and which is what the value actually is?", de: "Lies die Zeile `expected ... found ...` laut. Welches von beidem ist die Annotation, die du geschrieben hast, und welches der tatsächliche Wert?" }, hints: [ { en: "`expected` is what the surrounding context demands; `found` is what your expression produced.", de: "`expected` ist, was der Kontext verlangt; `found` ist, was dein Ausdruck geliefert hat." }, { en: "The dashes under a second span mark where the expectation came from - usually the type annotation or the parameter list.", de: "Die Striche unter einer zweiten Stelle markieren, woher die Erwartung stammt - meist die Typannotation oder die Parameterliste." }, { en: "rustc's `help:` line proposes a concrete edit; check it against the signature before you accept it.", de: "Die `help:`-Zeile von rustc schlägt eine konkrete Änderung vor; prüfe sie an der Signatur, bevor du sie übernimmst." } ] }
  - { pattern: "error\\[E0425\\]", question: { en: "A name in scope disappeared. Did you rename or delete a variable the rest of the function still uses?", de: "Ein Name im Gültigkeitsbereich ist verschwunden. Hast du eine Variable umbenannt oder gelöscht, die der Rest der Funktion noch nutzt?" }, hints: [ { en: "The task says to keep every variable; deleting one trades an E0308 for an E0425.", de: "Die Aufgabe verlangt, jede Variable zu behalten; eine zu löschen tauscht ein E0308 gegen ein E0425." }, { en: "`git diff repair/m0_05_type_mismatch.rs` shows exactly what you changed.", de: "`git diff repair/m0_05_type_mismatch.rs` zeigt genau, was du geändert hast." }, { en: "Restore the original with `git checkout -- repair/m0_05_type_mismatch.rs` and start again, changing only the types.", de: "Stelle das Original mit `git checkout -- repair/m0_05_type_mismatch.rs` wieder her und beginne neu, indem du nur die Typen änderst." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`pwd` prints the current folder; it has to be the rust-foundations workspace, the one holding Cargo.toml.", de: "`pwd` gibt den aktuellen Ordner aus; er muss der rust-foundations-Workspace sein, in dem die Cargo.toml liegt." }, { en: "A terminal opened with Terminal → New Terminal starts in the workspace folder; one you navigated away from does not.", de: "Ein über Terminal → Neues Terminal geöffnetes Terminal startet im Workspace-Ordner; eines, aus dem du herausnavigiert bist, nicht." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
---
## Lernziel

Behandle eine rustc-Diagnose als strukturierten Bericht, auf den du reagieren kannst, statt als Textwand - und repariere eine Datei, die nicht kompiliert, ohne etwas zu ändern, das der Compiler nicht bemängelt hat.

## Was eine Rust-Diagnose enthält

Jeder Fehler hat vier Teile, und jeder beantwortet eine andere Frage:

```text
error[E0308]: mismatched types
 --> repair/m0_05_type_mismatch.rs:24:24
   |
24 |     let name: String = "Ada";
   |               ------   ^^^^^ expected `String`, found `&str`
   |               |
   |               expected due to this
   |
help: try using a conversion method
   |
24 |     let name: String = "Ada".to_string();
```

- **`error[E0308]`** ist ein stabiler Code. `rustc --explain E0308` gibt eine Seite dazu aus, der Online-Fehlerindex enthält denselben Text.
- **Die Position** `Datei:Zeile:Spalte` ist die Stelle, an der der Compiler aufgab - nicht immer die Stelle, an der du den Fehler gemacht hast.
- **Die Spannen.** Die Carets `^^^^^` markieren den beanstandeten Ausdruck; eine zweite Spanne mit Strichen, beschriftet `expected due to this`, markiert, *warum* der Compiler erwartete, was er erwartete. Beide zusammen sind die ganze Diagnose: hier erzwingt etwas einen Typ, dort liefert etwas einen anderen.
- **`help:`** schlägt eine Änderung vor. Sie ist oft richtig und löst gelegentlich das falsche Problem - sie sieht nur den lokalen Ausdruck, nicht deine Absicht.

## Die Datei

`repair/m0_05_type_mismatch.rs` gehört nicht zum cargo-Paket; sie ist ein eigenständiges Programm, das du direkt übersetzt. Im jetzigen Zustand erzeugt sie drei E0308-Fehler. Ihre Funktion `describe` ist korrekt und darf nicht angefasst werden; alle drei Fehler stehen in `main`.

Übersetze und starte sie in einem Zug - genau das tut auch der Check:

```bash
mkdir -p target/check
rustc --edition 2024 -o target/check/m0_05 repair/m0_05_type_mismatch.rs
target/check/m0_05
```

Ausgegeben werden muss genau:

```text
Ada is 36 years old and 1 metre 62 tall.
```

## Wie du vorgehst

Behebe **einen** Fehler und übersetze neu. Fehler pflanzen sich fort: eine falsche Deklaration in Zeile 24 erzeugt eine zweite Beanstandung an der Aufrufstelle in Zeile 28, und die Korrektur der Deklaration beseitigt beide. Alle drei gleichzeitig zu jagen führt meist zu einer Datei mit drei unabhängigen Änderungen, von denen zwei überflüssig waren.

Zwei Vorgaben halten das ehrlich. Behalte jede Variable - eine zu löschen tauscht einen Typfehler gegen `E0425: cannot find value`. Und belasse den ausgegebenen Satz genau wie oben; der Check vergleicht ihn.

## Deine Aufgabe

Repariere die Datei, sodass sie kompiliert und den Satz ausgibt, und erkläre dann, welche Teile der Diagnose du tatsächlich benutzt hast. Ab hier werden die Fehler interessanter: das nächste Modul behandelt Ownership, und seine Fehler drehen sich darum, *wann* ein Wert aufhört, dir zu gehören.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1** (im Browser zuverlässiger als Strg+Umschalt+P), tippe `Terminal: Create New Terminal` und drücke die Eingabetaste. Das Terminal öffnet sich im Bereich unten, bereits im Workspace-Ordner. Führe dann aus:

```bash
mkdir -p target/check && rustc --edition 2024 -o target/check/m0_05 repair/m0_05_type_mismatch.rs && target/check/m0_05
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** die Ausgabe des Programms, darin `Ada is 36 years old and 1 metre 62 tall\.`.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, steht das Terminal im falschen Ordner - wechsle mit `cd` zurück in den Workspace-Ordner.
