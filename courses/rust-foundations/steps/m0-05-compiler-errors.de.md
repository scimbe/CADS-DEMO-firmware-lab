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
    check: { type: "question", prompt: { en: "You repaired three E0308 errors with fewer than three edits. Two sentences: which part of a diagnostic told you which line to change, and why one edit removed more than one error.", de: "Du hast drei E0308-Fehler mit weniger als drei Änderungen behoben. Zwei Sätze: welcher Teil einer Diagnose dir sagte, welche Zeile zu ändern ist, und warum eine Änderung mehr als einen Fehler beseitigt hat." }, rubric: "First sentence names a specific part of the diagnostic and what it told them - the expected/found pair, or the second span labelled `expected due to this`, which points at the declaration rather than at the use. Second sentence says that one of the three errors was a consequence of another, so repairing the cause removed the effect. Does not pass: naming the help line as the thing that told them what to change, listing all four parts of a diagnostic without choosing, or saying the errors were duplicates rather than cause and effect.", bloom: "analyze", minChars: 60 }
socratic:
  - { trigger: "task:method:failed", question: { en: "Which of the three errors disappeared without you touching its line?", de: "Welcher der drei Fehler verschwand, ohne dass du seine Zeile angefasst hast?" }, hints: [ { en: "Recompile after each single edit and write down how many errors remain. The jump from three to one is the answer.", de: "Übersetze nach jeder einzelnen Änderung neu und notiere, wie viele Fehler bleiben. Der Sprung von drei auf einen ist die Antwort." }, { en: "One diagnostic underlines two places at once. Ask which of the two the compiler is complaining about and which one it is quoting as its reason.", de: "Eine Diagnose unterstreicht zwei Stellen zugleich. Frage, welche der beiden der Compiler beanstandet und welche er als Begründung zitiert." }, { en: "A variable's declared type is used at every later mention of it, so a wrong declaration is reported once where it stands and again wherever it is passed on.", de: "Der deklarierte Typ einer Variablen gilt an jeder späteren Nennung, eine falsche Deklaration wird also einmal an ihrer Stelle gemeldet und erneut dort, wo sie weitergegeben wird." } ] }
  - { trigger: "task:repair:failed", question: { en: "How many errors does rustc report now, and is it fewer than before? Which line does the first caret point at?", de: "Wie viele Fehler meldet rustc jetzt, und sind es weniger als zuvor? Auf welche Zeile zeigt das erste Caret?" }, hints: [ { en: "Work top down and rebuild after every single change: later errors are often consequences of the first one.", de: "Arbeite von oben nach unten und baue nach jeder einzelnen Änderung neu: spätere Fehler sind oft Folgen des ersten." }, { en: "A literal in double quotes has type `&str`. Either the annotation or the value has to give way - and the function's parameter says which.", de: "Ein Literal in Anführungszeichen hat den Typ `&str`. Entweder die Annotation oder der Wert muss weichen - und der Parameter der Funktion sagt, welcher." }, { en: "Do not change `describe`; it is correct. The three errors are all in `main`, and two of them are the same mistake.", de: "Ändere `describe` nicht; sie ist korrekt. Die drei Fehler stehen alle in `main`, und zwei davon sind derselbe Fehler." } ] }
misconceptions:
  - { pattern: "error\\[E0308\\]: mismatched types", question: { en: "Read the `expected ... found ...` line aloud. Which of the two is the annotation you wrote, and which is what the value actually is?", de: "Lies die Zeile `expected ... found ...` laut. Welches von beidem ist die Annotation, die du geschrieben hast, und welches der tatsächliche Wert?" }, hints: [ { en: "`expected` is what the surrounding context demands; `found` is what your expression produced.", de: "`expected` ist, was der Kontext verlangt; `found` ist, was dein Ausdruck geliefert hat." }, { en: "The dashes under a second span mark where the expectation came from - usually the type annotation or the parameter list.", de: "Die Striche unter einer zweiten Stelle markieren, woher die Erwartung stammt - meist die Typannotation oder die Parameterliste." }, { en: "rustc's `help:` line proposes a concrete edit; check it against the signature before you accept it.", de: "Die `help:`-Zeile von rustc schlägt eine konkrete Änderung vor; prüfe sie an der Signatur, bevor du sie übernimmst." } ] }
  - { pattern: "error\\[E0425\\]", question: { en: "A name in scope disappeared. Did you rename or delete a variable the rest of the function still uses?", de: "Ein Name im Gültigkeitsbereich ist verschwunden. Hast du eine Variable umbenannt oder gelöscht, die der Rest der Funktion noch nutzt?" }, hints: [ { en: "The task says to keep every variable; deleting one trades an E0308 for an E0425.", de: "Die Aufgabe verlangt, jede Variable zu behalten; eine zu löschen tauscht ein E0308 gegen ein E0425." }, { en: "`git diff repair/m0_05_type_mismatch.rs` shows exactly what you changed.", de: "`git diff repair/m0_05_type_mismatch.rs` zeigt genau, was du geändert hast." }, { en: "Restore the original with `git checkout -- repair/m0_05_type_mismatch.rs` and start again, changing only the types.", de: "Stelle das Original mit `git checkout -- repair/m0_05_type_mismatch.rs` wieder her und beginne neu, indem du nur die Typen änderst." } ] }
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
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
- **Die Spannen.** Die Carets `^^^^^` markieren eine Stelle, eine zweite Spanne mit Strichen eine andere, beschriftet `expected due to this`. Finde heraus, welche der beiden du ändern musst, bevor du etwas änderst - genau das ist die Frage, die dieser Step dir stellt.
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

Behebe **einen** Fehler, übersetze neu und beobachte, wie viele übrig bleiben. Alle drei gleichzeitig zu jagen führt meist zu einer Datei mit drei unabhängigen Änderungen, von denen zwei überflüssig waren.

Zwei Vorgaben halten das ehrlich. Behalte jede Variable - eine zu löschen tauscht einen Typfehler gegen `E0425: cannot find value`. Und belasse den ausgegebenen Satz genau wie oben; der Check vergleicht ihn.

## Deine Aufgabe

Repariere die Datei, sodass sie kompiliert und den Satz ausgibt, und erkläre dann, welche Teile der Diagnose du tatsächlich benutzt hast. Ab hier werden die Fehler interessanter: das nächste Modul behandelt Ownership, und seine Fehler drehen sich darum, *wann* ein Wert aufhört, dir zu gehören.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
mkdir -p target/check && rustc --edition 2024 -o target/check/m0_05 repair/m0_05_type_mismatch.rs && target/check/m0_05
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** die Ausgabe des Programms, darin `Ada is 36 years old and 1 metre 62 tall\.`.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

*Die drei Handgriffe sind in jedem Step dieses Kurses dieselben - Terminal öffnen, mit `cd` in die Crate wechseln, den Befehl ausführen. Nur die letzte Zeile unterscheidet sich, und die Fassung dieses Steps steht im Block darüber.*

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
