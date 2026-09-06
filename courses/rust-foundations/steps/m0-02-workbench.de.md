---
id: m0-02-workbench
title: "Die Oberfläche bedienen"
bloom: apply
objectives: [ "rust-tooling-cargo" ]
requires: [ "m0-01-welcome" ]
estimatedMinutes: 20
scaffold: worked
links:
  - { step: "m0-03-first-test" }
  - { file: "README.md" }
  - { file: "Cargo.toml" }
  - { url: "https://code.visualstudio.com/docs/terminal/basics", title: "VS Code docs: Integrated Terminal" }
sources: [ "README.md", "Cargo.toml", "src/lib.rs" ]
tasks:
  - id: toolchain
    title: "Alle drei Werkzeuge antworten"
    check: { type: "command", command: "cargo --version && cargo fmt --version && cargo clippy --version", expectExitCode: 0, expectStdout: "clippy", seedMustFail: false, timeoutMs: 120000 }
  - id: build
    title: "Der Workspace übersetzt aus dem Terminal"
    check: { type: "command", command: "cargo build", expectExitCode: 0, seedMustFail: false, timeoutMs: 180000 }
  - id: panels
    title: "Du kannst sagen, wo Ausgabe erscheint"
    check: { type: "question", prompt: { en: "A classmate says a cargo command printed nothing. Give the three things you would have them check, in the order you would ask. One line each.", de: "Ein Kommilitone sagt, ein cargo-Befehl habe nichts ausgegeben. Nenne die drei Dinge, die du ihn prüfen ließest, in der Reihenfolge, in der du fragen würdest. Je eine Zeile." }, rubric: "Bewertet wird die Antwort, nicht der Steptext. Alle drei Kriterien müssen erfüllt sein: (1) drei verschiedene Prüfungen, je eine Zeile, jede davon etwas, das der Kommilitone ansehen oder eintippen kann, und nicht etwas, das er wissen soll; (2) die drei stehen in einer genannten Reihenfolge, und die Antwort gibt den Grund für diese Reihenfolge an, die Beobachtung, die nichts kostet, vor allem, was einen Befehl kostet; (3) die drei benennen drei verschiedene Ursachen und nicht dieselbe in drei Formulierungen. Anerkannt sind unter anderem der falsche Reiter, ein Befehl, der noch läuft, und ein Terminal im falschen Ordner; eine andere vertretbare Ursache zählt ebenso. Besteht nicht: die Namen der drei Reiter als die drei Prüfungen ausgegeben; eine Liste ohne Reihenfolge; eine Reihenfolge ohne Begründung; ein nacherzählter Abschnitt des Steps, in dem nichts steht, was ein Kommilitone ausführen könnte.", bloom: "understand", minChars: 60 }
socratic:
  - { trigger: "task:panels:failed", question: { en: "You are asked for an order, not a list. Which of your three checks costs the least to try?", de: "Gefragt ist eine Reihenfolge, keine Liste. Welche deiner drei Prüfungen kostet am wenigsten?" }, hints: [ { en: "A good order starts with what you can see without typing anything and ends with what needs a command.", de: "Eine gute Reihenfolge beginnt mit dem, was ohne Tippen zu sehen ist, und endet mit dem, was einen Befehl braucht." }, { en: "Three different situations all produce \"nothing happened\": you are looking somewhere else, it has not finished, or it never started in the right place.", de: "Drei verschiedene Lagen erzeugen alle \"es passiert nichts\": du schaust woanders hin, es ist nicht fertig, oder es hat nie an der richtigen Stelle begonnen." }, { en: "The third of those is what the instructions at the foot of every step warn about, and `pwd` settles it in one word.", de: "Das dritte davon ist das, wovor die Anweisungen am Fuß jedes Steps warnen, und `pwd` klärt es mit einem Wort." } ] }
  - { trigger: "task:build:failed", question: { en: "Which folder does the terminal say it is in, and is a Cargo.toml there?", de: "Welchen Ordner nennt das Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "Type `pwd` and press Enter; the answer must end in the rust-foundations folder.", de: "Tippe `pwd` und drücke die Eingabetaste; die Antwort muss auf den Ordner rust-foundations enden." }, { en: "Close the terminal with the bin icon on its right-hand side and open a fresh one with Terminal → New Terminal; a new terminal always starts in the workspace folder.", de: "Schließe das Terminal über das Papierkorbsymbol an seiner rechten Seite und öffne mit Terminal → Neues Terminal ein frisches; ein neues Terminal startet immer im Workspace-Ordner." }, { en: "If `cargo` itself is not found, the toolchain is missing from this container - that is an environment fault, not something you can fix in the editor.", de: "Wird `cargo` selbst nicht gefunden, fehlt die Toolchain in diesem Container - das ist ein Umgebungsfehler und nichts, was du im Editor beheben kannst." } ] }
  - { trigger: "task:toolchain:failed", question: { en: "Which of the three commands failed? Run them one at a time to find out.", de: "Welcher der drei Befehle ist gescheitert? Führe sie einzeln aus, um es herauszufinden." }, hints: [ { en: "`&&` stops at the first failure, so the last line you see is the one that broke.", de: "`&&` bricht beim ersten Fehlschlag ab, die letzte sichtbare Zeile ist also die gescheiterte." }, { en: "`cargo fmt --version` and `cargo clippy --version` need the rustfmt and clippy components; both belong in this image.", de: "`cargo fmt --version` und `cargo clippy --version` brauchen die Komponenten rustfmt und clippy; beide gehören in dieses Image." }, { en: "If one is genuinely absent, report it - the last step of the course checks formatting and lints with exactly these two.", de: "Fehlt eines wirklich, melde es - der letzte Step des Kurses prüft Formatierung und Lints mit genau diesen beiden." } ] }
misconceptions:
  - { pattern: "could not find `Cargo\\.toml`", question: { en: "cargo did not find a package. Which folder is your terminal in, and does that folder contain Cargo.toml?", de: "cargo hat kein Paket gefunden. In welchem Ordner steht dein Terminal, und liegt dort eine Cargo.toml?" }, hints: [ { en: "`cd ~/workspace/rust-foundations` gets you there; `pwd` afterwards shows where you are.", de: "`cd ~/workspace/rust-foundations` bringt dich dorthin; `pwd` zeigt danach, wo du stehst." }, { en: "A new terminal starts in ~/workspace, one level above the crate, because the lab window holds two workspaces side by side.", de: "Ein neues Terminal startet in ~/workspace, eine Ebene über der Crate, weil das Laborfenster zwei Workspaces nebeneinander hält." }, { en: "The message names the folder cargo searched, so compare that path with where the file actually is.", de: "Die Meldung nennt den Ordner, in dem cargo gesucht hat; vergleiche diesen Pfad damit, wo die Datei wirklich liegt." } ] }
---
## Lernziel

Bediene dieses Fenster mit Absicht: wisse, wofür jeder Bereich da ist, kenne die drei Wege, einen Befehl auszuführen, und erkenne, dass ein Befehl fertig ist.

## Was auf dem Bildschirm ist

Fünf Bereiche, von außen nach innen:

- **Aktivitätsleiste**, der Streifen mit Symbolen ganz links. Das Doktorhut-Symbol öffnet **CaDS Tutor**; das oberste Symbol öffnet den Datei-Explorer. Ein Klick auf ein bereits aktives Symbol blendet dessen Seitenleiste aus - das ist die übliche Erklärung für „meine Dateien sind weg".
- **Seitenleiste** daneben. Mit gewähltem Explorer listet sie den Workspace-Ordner: `src/`, `tests/`, `Cargo.toml`. Ein Klick zeigt eine Datei zur Vorschau, ein Doppelklick hält sie offen.
- **Editor**, der große Bereich in der Mitte. Hier änderst du Dateien. Ein Punkt statt des Schließkreuzes auf einem Reiter bedeutet ungesicherte Änderungen.
- **Bereich unten** mit den Reitern **Terminal**, **Problems** und **Output**. Er ist geschlossen, bis du ihn brauchst.
- **Statusleiste**, der schmale Streifen ganz unten.

Das Panel **CaDS Tutor** zeigt den Step, den du liest, die Aufgaben mit je einer Schaltfläche **Prüfen** und das Feld für eine Frage an den Tutor. Die Schaltfläche Prüfen führt den echten Befehl des Steps aus und zeigt dessen echte Ausgabe; sie simuliert nichts.

## Die drei Reiter unten sind nicht austauschbar

Das ist der häufigste Weg, zehn Minuten zu verlieren:

Klicke jetzt einmal auf **Terminal**, **Problems** und **Output**, während nichts läuft, und sieh nach, was darin steht. Einer der drei ist die Stelle, an die ein von dir getippter Befehl ausgibt; die beiden anderen enthalten Dinge, in die kein Befehl von dir jemals schreibt. Welcher welcher ist, findet man besser hier heraus als mitten in einem scheiternden Step.

## Drei Wege, dasselbe auszuführen

1. **Integriertes Terminal.** Menü **Terminal → Neues Terminal**. Es öffnet sich im Bereich unten - in `~/workspace`, eine Ebene **über** dieser Crate, denn das Laborfenster hält den Rust- und den JavaScript-Workspace nebeneinander. Das Erste, was du in einem neuen Terminal tippst, ist deshalb:

```bash
cd ~/workspace/rust-foundations
```

Ohne das antwortet cargo mit `could not find Cargo.toml` - der häufigste Weg, schon bei Schritt eins hängenzubleiben. Diesen Weg nutzt der Kurs durchgehend, weil du dabei genau das siehst, was die Prüfungen sehen.

2. **Befehlspalette.** Drücke **F1**. Im Browser ist das zuverlässiger als Strg+Umschalt+P, das der Browser für sich behalten kann. Die Palette öffnet in einem von zwei Modi und **merkt sich den zuletzt benutzten**: ohne vorangestelltes `>` sucht sie Dateien, mit `>` sucht sie Befehle. Ein Paletteneintrag wird also mit vorangestelltem `>` getippt, so wie der Block am Ende dieses Steps es zeigt. Vergisst du das `>`, erhältst du *No matching results* und es passiert nichts - so sagt dir die Palette, dass sie nach einer Datei dieses Namens sucht.

![Die Aufgabenliste des Tutor-Panels. Die erste Aufgabe ist grün abgehakt und
zeigt unter ihrer Schaltfläche Prüfen "exited with 0"; die zweite ist eine
Frage mit Textfeld, einer Schaltfläche zum Abschicken und einer Schaltfläche
für Hinweise.](task-check-result.png)

3. **Die Schaltfläche Prüfen** im Tutor-Panel neben einer Aufgabe. Sie führt den Befehl dieser Aufgabe aus und zeigt die Ausgabe im Panel. Sie nutzt immer den richtigen Ordner und braucht das `cd` daher nie.

Zum Schließen eines Terminals drückst du das Papierkorbsymbol an seinem rechten Rand oder tippst `exit`. Es geht nichts verloren, ein Terminal hält keinen Zustand, den du brauchst.

## Die Palette im Befehlsmodus

![Die Befehlspalette über dem Editor. Die Eingabe lautet
'>Terminal: Create New Terminal', das erste gleichnamige Ergebnis ist
ausgewählt; der Explorer links zeigt den Ordner
rust-foundations.](palette-new-terminal.png)

Achte auf das `>` ganz am Anfang der Eingabe und darauf, dass das oberste
Ergebnis der gesuchte Befehl ist. Ohne das `>` steht in derselben Liste
*No matching results*.

## Woran du erkennst, dass ein Befehl fertig ist

Die Eingabeaufforderung erscheint wieder unter der Ausgabe. Solange sie fehlt, läuft der Befehl noch: ein blinkender Cursor ohne Eingabeaufforderung ist laufende Arbeit, kein Hänger.

## Deine Aufgabe

Öffne ein Terminal und führe die beiden Befehle unten aus. Beantworte dann, wo Ausgabe erscheint und woran du einen fertigen Befehl erkennst. Der nächste Step bringt einen fehlschlagenden Test zum Bestehen.

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

::: do command="cargo --version && cargo fmt --version && cargo clippy --version" cwd="."
Führe den Befehl der Aufgabe *Alle drei Werkzeuge antworten* aus.
> expect: Der Befehl endet ohne Fehler, und seine Ausgabe enthält `clippy`.
> recover: Bleibt der Cursor stehen, ohne dass die Eingabeaufforderung zurückkommt, läuft er noch - das ist kein Hänger. Antwortet cargo mit `could not find Cargo.toml`, fehlt das `cd` von oben.
:::

::: do command="cargo build" cwd="."
Führe den Befehl der Aufgabe *Der Workspace übersetzt aus dem Terminal* aus.
> expect: Der Befehl endet ohne Fehler und ohne Meldung; darunter erscheint die Eingabeaufforderung wieder.
> recover: Bleibt der Cursor stehen, ohne dass die Eingabeaufforderung zurückkommt, läuft er noch - das ist kein Hänger. Antwortet cargo mit `could not find Cargo.toml`, fehlt das `cd` von oben.
:::

![Ein Terminal im Bereich unten: die Eingabeaufforderung zeigt coder@…:~/workspace/rust-foundations, darunter der cargo-Befehl und seine Ausgabe.](terminal-run-a-step.png)

Der Knopf **Prüfen** an der Aufgabe führt denselben Befehl aus und zeigt dieselbe Ausgabe im Tutor-Panel; er benutzt immer den richtigen Ordner und braucht das `cd` daher nie. Das Terminal ist dafür da, dass du es selbst siehst und wiederholen kannst. Die Ausgabe steht im Reiter **Terminal**, nicht in **Problems** und nicht in **Output** - diese beiden zeigen anderes und sind der übliche Grund für „es passiert nichts".
