---
id: m0-01-welcome
title: "Wo du bist und was du zuerst drückst"
bloom: remember
objectives: [ "rust-tooling-cargo" ]
requires: [  ]
estimatedMinutes: 10
scaffold: worked
links:
  - { step: "m0-02-workbench" }
  - { file: "README.md" }
  - { file: "Cargo.toml" }
  - { url: "https://doc.rust-lang.org/book/ch01-03-hello-cargo.html", title: "The Book, 1.3: Hello, Cargo!" }
sources: [ "README.md", "Cargo.toml", "src/lib.rs", "tests/m0-03-first-test.rs" ]
tasks:
  - id: version
    title: "cargo antwortet"
    check: { type: "command", command: "cargo --version", seedMustFail: false, expectExitCode: 0, expectStdout: "cargo \\d+\\.\\d+\\.\\d+", timeoutMs: 60000 }
  - id: orient
    title: "Du findest den Test des nächsten Steps"
    check: { type: "question", prompt: { en: "Name the file that holds the tests for the next step, m0-03-first-test, and the exact command that runs only those tests.", de: "Nenne die Datei, die die Tests des nächsten Steps m0-03-first-test enthält, und den genauen Befehl, der nur diese Tests ausführt." }, rubric: "Names tests/m0-03-first-test.rs as the file and `cargo test --test m0-03-first-test` as the command. This is a remember-level check on the step just read, so the wording may come straight from it. Does not pass: naming src/m0/m0_03_first_test.rs (the exercise, not the test), naming plain `cargo test`, or giving only one of the two.", bloom: "remember", minChars: 20 }
socratic:
  - { trigger: "task:orient:failed", question: { en: "Two answers are wanted, a file and a command. Which of the two are you unsure about?", de: "Verlangt sind zwei Antworten, eine Datei und ein Befehl. Bei welchem der beiden bist du unsicher?" }, hints: [ { en: "Both are in this step's text: the paragraph about the tests/ directory, and the block that runs a single step.", de: "Beide stehen im Text dieses Steps: im Abschnitt über das Verzeichnis tests/ und im Block, der einen einzelnen Step ausführt." }, { en: "The file lives in tests/ and its name is the step id plus .rs. The command names that same id after --test.", de: "Die Datei liegt in tests/ und heißt wie die Step-ID plus .rs. Der Befehl nennt dieselbe ID hinter --test." }, { en: "`ls tests/` prints every valid name, and the step you are asked about is the one directly after this one.", de: "`ls tests/` gibt jeden gültigen Namen aus, und gefragt ist der Step direkt nach diesem." } ] }
  - { trigger: "task:version:failed", question: { en: "cargo did not answer. Is cargo on this container's PATH?", de: "cargo hat nicht geantwortet. Liegt cargo im PATH dieses Containers?" }, hints: [ { en: "cargo works on the package in the current directory: run `pwd`, and if it is not the rust-foundations folder, change into it.", de: "cargo arbeitet am Paket im aktuellen Verzeichnis: führe `pwd` aus, und wechsle in den Ordner rust-foundations, falls du woanders stehst." }, { en: "`cargo --version` failing as well means cargo is not on your PATH at all, which is a setup problem, not a code problem.", de: "Schlägt auch `cargo --version` fehl, liegt cargo gar nicht im PATH - das ist ein Einrichtungs-, kein Codeproblem." }, { en: "If the build fails with a real compiler error, someone edited a file: `git status` shows what changed, `git checkout -- <file>` restores it.", de: "Scheitert der Build an einem echten Compilerfehler, wurde eine Datei geändert: `git status` zeigt was, `git checkout -- <Datei>` stellt sie wieder her." } ] }
misconceptions:
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
---
## Lernziel

Wisse, was du vor dir hast, welcher Befehl die Arbeit startet und wo die Tests eines Steps liegen - damit es in jedem weiteren Step nur noch um Rust geht und nie um das Werkzeug.

![Das Laborfenster. Links listet das Panel CaDS Tutor den Kurs Rust -
Foundations mit den Modulen M0 bis M7; in der Mitte dieser Step mit seinem
Bloom-Abzeichen, seinem Scaffold-Abzeichen und seiner Aufgabenliste.](tutor-panel-and-tree.png)

## Was du siehst

Du bist in einem Rust-*Paket* namens `rust_foundations`. Alles, was der Kurs von dir verlangt, passiert in diesem einen Ordner. Vier Stellen sind wichtig:

- **`Cargo.toml`** ist das Manifest: Paketname, Rust-Edition und die Liste der Abhängigkeiten (hier: keine, mit Absicht - alles in diesem Kurs kommt aus der Standardbibliothek).
- **`src/`** enthält die Übungen, eine Datei je Step, gruppiert in `m0/` … `m6/` und `project/`. **Du bearbeitest diese Dateien, und nur diese.**
- **`tests/`** enthält eine Datei je Step, benannt wie der Step: `tests/m0-03-first-test.rs`. Sie sind fertig und du änderst sie nicht. Lies sie - sie sagen genau, was dein Code leisten muss.
- **`README.md`** ist die Karte des Ordners, samt der Verzeichnisse, die dir später begegnen (`examples/`, `snippets/`, `repair/`, `samples/`).

## Der erste Schritt, konkret

Öffne ein Terminal in diesem Ordner und führe aus:

```bash
cargo --version
cargo build
```

`cargo --version` gibt etwa `cargo 1.94.0` aus. Tut es das nicht, funktioniert nichts weiter in diesem Kurs, und das Problem liegt an deiner Umgebung, nicht an deinem Code. Der nächste Step, [Die Oberfläche bedienen](step:m0-02-workbench), geht das Fenster Bereich für Bereich durch und zeigt die drei Wege, einen Befehl auszuführen; dieser Step stellt nur fest, dass die Toolchain überhaupt antwortet.

Beachte, dass das Paket übersetzt, **obwohl noch nichts implementiert ist**: unfertige Übungen sind `todo!()`, ein Makro, das sich als beliebiger Typ typprüfen lässt und abstürzt, sobald es erreicht wird. Das Paket baut also immer; fehlschlagen tun die Tests.

## Wohin cargo seine Ausgabe legt

Alles, was cargo erzeugt, landet in `target/`, das von git ignoriert wird und jederzeit gelöscht werden darf. Der nächste Step baut das Paket und liest, was es ausgibt.

## Die Tests eines einzelnen Steps ausführen

`cargo test` führt alles aus, auch die gut zwanzig Steps, die du noch nicht begonnen hast, und meldet entsprechend eine Wand aus Fehlschlägen. Das ist erwartbar und hilft dir gerade nicht. Führe stattdessen **einen** Step aus:

```bash
cargo test --test m0-03-first-test
```

Der Name hinter `--test` ist der Dateiname in `tests/` ohne `.rs` und identisch mit der Step-ID. Der Tutor zeigt diesen Befehl für den Step an, an dem du gerade bist; raten musst du nie.

## Deine Aufgabe

Führe `cargo --version` aus; der erste Check bestätigt es. Beantworte dann, wo die Tests des nächsten Steps liegen und wie du nur sie ausführst. Der nächste Step führt dich durch das Fenster selbst.

## So führst du das aus

Öffne ein Terminal über das Menü **Terminal → Neues Terminal**, oder drücke **F1**, tippe `>Terminal: Create New Terminal` und drücke die Eingabetaste. Das vorangestellte `>` schaltet die Palette von der Dateisuche auf die Befehlssuche um, und F1 merkt sich den zuletzt benutzten Modus - ohne das Zeichen erhältst du *No matching results*. Im Browser ist F1 zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann.

Das Terminal öffnet sich im Bereich unten, in `~/workspace` - dem Ordner **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Wechsle zuerst in die Crate, sonst antwortet cargo mit `could not find Cargo.toml`:

```bash
cd ~/workspace/rust-foundations
```

Das brauchst du nur einmal je Terminal. Führe dann aus:

```bash
cargo --version
```

Die Schaltfläche **Prüfen** neben der Aufgabe oben führt genau diese Befehle für dich aus und zeigt dieselbe Ausgabe im Tutor-Panel; das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst.

**Was du siehst:** die Ausgabe des Programms, darin `cargo \d+\.\d+\.\d+`.

**Wie lange:** beim ersten Mal ein paar Sekunden, weil die Crate einmal übersetzt wird; bei jedem weiteren Lauf deutlich unter einer Sekunde.

**Fertig ist es, wenn:** die Eingabeaufforderung unter der Ausgabe wieder erscheint. Solange sie fehlt, läuft der Befehl noch - ein blinkender Cursor ohne Eingabeaufforderung ist kein Hänger.

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

*Die drei Handgriffe sind in jedem Step dieses Kurses dieselben - Terminal öffnen, mit `cd` in die Crate wechseln, den Befehl ausführen. Nur die letzte Zeile unterscheidet sich, und die Fassung dieses Steps steht im Block darüber.*

**Wenn etwas nicht stimmt:** die Ausgabe steht im Reiter **Terminal** unten, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts". Hast du das Terminal versehentlich geschlossen, öffne auf demselben Weg ein neues; es geht nichts verloren. Antwortet cargo mit `could not find Cargo.toml`, hat dieses Terminal das `cd` von oben nicht bekommen - führe es aus und versuche es erneut.
