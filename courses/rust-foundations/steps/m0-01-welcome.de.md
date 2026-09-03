---
id: m0-01-welcome
title: "Wo du bist und was du zuerst drückst"
bloom: remember
objectives: [ "rust-tooling-cargo" ]
requires: [  ]
estimatedMinutes: 10
scaffold: worked
links:
  - { step: "m0-02-first-test" }
  - { file: "README.md" }
  - { file: "Cargo.toml" }
  - { url: "https://doc.rust-lang.org/book/ch01-03-hello-cargo.html", title: "The Book, 1.3: Hello, Cargo!" }
sources: [ "README.md", "Cargo.toml", "src/lib.rs", "tests/m0-02-first-test.rs" ]
tasks:
  - id: version
    title: "cargo antwortet"
    check: { type: "command", command: "cargo --version", seedMustFail: false, expectExitCode: 0, expectStdout: "cargo \\d+\\.\\d+\\.\\d+", timeoutMs: 60000 }
  - id: build
    title: "Der Workspace kompiliert"
    check: { type: "command", command: "cargo build", seedMustFail: false, expectExitCode: 0, timeoutMs: 180000 }
  - id: orient
    title: "Du findest den Test des nächsten Steps"
    check: { type: "question", prompt: { en: "Name the file that holds the tests for the next step, m0-02-first-test, and the exact command that runs only those tests.", de: "Nenne die Datei, die die Tests des nächsten Steps m0-02-first-test enthält, und den genauen Befehl, der nur diese Tests ausführt." }, rubric: "Names tests/m0-02-first-test.rs as the file and `cargo test --test m0-02-first-test` as the command. Naming src/m0/m0_02_first_test.rs instead of the tests file, or plain `cargo test`, is incomplete.", bloom: "remember", minChars: 20 }
socratic:
  - { trigger: "task:build:failed", question: { en: "cargo could not build the workspace. Which directory is your terminal in, and does it contain a Cargo.toml?", de: "cargo konnte den Workspace nicht bauen. In welchem Verzeichnis steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "cargo works on the package in the current directory: run `pwd`, and if it is not the rust-foundations folder, change into it.", de: "cargo arbeitet am Paket im aktuellen Verzeichnis: führe `pwd` aus, und wechsle in den Ordner rust-foundations, falls du woanders stehst." }, { en: "`cargo --version` failing as well means cargo is not on your PATH at all, which is a setup problem, not a code problem.", de: "Schlägt auch `cargo --version` fehl, liegt cargo gar nicht im PATH - das ist ein Einrichtungs-, kein Codeproblem." }, { en: "If the build fails with a real compiler error, someone edited a file: `git status` shows what changed, `git checkout -- <file>` restores it.", de: "Scheitert der Build an einem echten Compilerfehler, wurde eine Datei geändert: `git status` zeigt was, `git checkout -- <Datei>` stellt sie wieder her." } ] }
---
## Lernziel

Wisse, was du vor dir hast, welcher Befehl die Arbeit startet und wo die Tests eines Steps liegen - damit es in jedem weiteren Step nur noch um Rust geht und nie um das Werkzeug.

## Was du siehst

Du bist in einem Rust-*Paket* namens `rust_foundations`. Alles, was der Kurs von dir verlangt, passiert in diesem einen Ordner. Vier Stellen sind wichtig:

- **`Cargo.toml`** ist das Manifest: Paketname, Rust-Edition und die Liste der Abhängigkeiten (hier: keine, mit Absicht - alles in diesem Kurs kommt aus der Standardbibliothek).
- **`src/`** enthält die Übungen, eine Datei je Step, gruppiert in `m0/` … `m6/` und `project/`. **Du bearbeitest diese Dateien, und nur diese.**
- **`tests/`** enthält eine Datei je Step, benannt wie der Step: `tests/m0-02-first-test.rs`. Sie sind fertig und du änderst sie nicht. Lies sie - sie sagen genau, was dein Code leisten muss.
- **`README.md`** ist die Karte des Ordners, samt der Verzeichnisse, die dir später begegnen (`examples/`, `snippets/`, `repair/`, `samples/`).

## Der erste Schritt, konkret

Öffne ein Terminal in diesem Ordner und führe aus:

```bash
cargo --version
cargo build
```

`cargo --version` gibt etwa `cargo 1.94.0` aus. Tut es das nicht, funktioniert nichts weiter in diesem Kurs, und das Problem liegt an deiner Umgebung, nicht an deinem Code.

`cargo build` kompiliert das Paket. Es gibt eine Zeile je Crate aus und endet mit `Finished`. Es gelingt, **obwohl noch nichts implementiert ist**: unfertige Übungen sind `todo!()`, ein Makro, das sich als beliebiger Typ typprüfen lässt und abstürzt, sobald es erreicht wird. Das Paket kompiliert also immer; fehlschlagen tun die Tests.

## Die Ausgabe von cargo lesen

Der erste Build lädt nichts herunter und dauert ein bis zwei Sekunden. Zu sehen ist:

```text
   Compiling rust_foundations v0.1.0 (/home/coder/workspace/rust-foundations)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.42s
```

`dev`-Profil heißt: keine Optimierung, volle Debug-Informationen - der richtige Kompromiss für einen Kurs. Alles, was cargo erzeugt, landet in `target/`, das von git ignoriert wird und jederzeit gelöscht werden darf.

## Die Tests eines einzelnen Steps ausführen

`cargo test` führt alles aus, auch die gut zwanzig Steps, die du noch nicht begonnen hast, und meldet entsprechend eine Wand aus Fehlschlägen. Das ist erwartbar und hilft dir gerade nicht. Führe stattdessen **einen** Step aus:

```bash
cargo test --test m0-02-first-test
```

Der Name hinter `--test` ist der Dateiname in `tests/` ohne `.rs` und identisch mit der Step-ID. Der Tutor zeigt diesen Befehl für den Step an, an dem du gerade bist; raten musst du nie.

## Deine Aufgabe

Führe die beiden Befehle oben aus; die ersten beiden Checks bestätigen das. Beantworte dann, wo die Tests des nächsten Steps liegen und wie du nur sie ausführst. Der nächste Step bringt diese Tests zum Bestehen.
