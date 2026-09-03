---
id: m0-00-workbench
title: Die Oberfläche bedienen
bloom: apply
objectives: [cz.tooling.workbench]
requires: []
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m0-01-welcome }
  - { file: "scripts/check_ram_budget.py" }
  - { doc: "docs/reference/measurements.md" }
sources: [scripts/check_ram_budget.py, docs/reference/measurements.md]
tasks:
  - id: ran-a-task
    title: Du hast den Task „CaDS: RAM budget“ ausgeführt
    check: { type: task, label: "CaDS: RAM budget", expectExitCode: 0 }
  - id: read-the-output
    title: Lies die Zahl aus der Ausgabe
    check: { type: command, cwd: ".", command: "python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf", expectExitCode: 0, expectStdout: "margin" }
  - id: where-was-it
    title: Sage, wo die Ausgabe erschienen ist
    check: { type: question, prompt: { en: "In which of the four areas did the task's output appear, and what does its last line say?", de: "In welchem der vier Bereiche erschien die Ausgabe des Tasks, und was sagt ihre letzte Zeile?" }, rubric: "Die Ausgabe erschien unten im Terminal-Bereich, in einem eigenen Terminal, das den Namen des Tasks trägt — nicht im Tutor-Panel und nicht im Editor. Die letzte Zeile beginnt mit PASS und nennt die Marge in Byte. Ein Satz zum Ort, ein Satz zur Zeile.", bloom: apply }
socratic:
  - { trigger: "task:ran-a-task:failed", question: { en: "Did a new terminal open at the bottom, or did nothing happen at all?", de: "Hat sich unten ein neues Terminal geöffnet, oder ist gar nichts passiert?" }, hints: [ { en: "The most common cause is that the command palette never opened. Press F1 rather than the keyboard shortcut - a browser often keeps Ctrl+Shift+P for itself.", de: "Die häufigste Ursache ist, dass sich die Befehlspalette nie geöffnet hat. Drücke F1 statt des Tastenkürzels - Strg+Umschalt+P behält der Browser oft für sich." }, { en: "Second way, no keyboard at all: menu ☰ at the top left, then Terminal, then Run Task..., then pick CaDS: RAM budget from the list.", de: "Zweiter Weg, ganz ohne Tastatur: Menü ☰ oben links, dann Terminal, dann Run Task..., dann CaDS: RAM budget aus der Liste wählen." }, { en: "If a terminal did open and shows an error, the build has not run yet: run the task CaDS: Build first, it needs the ELF file.", de: "Wenn sich ein Terminal geöffnet hat und einen Fehler zeigt, ist der Build noch nicht gelaufen: führe zuerst den Task CaDS: Build aus, das Skript braucht die ELF-Datei." } ] }
  - { trigger: "task:read-the-output:failed", question: { en: "The script needs a built ELF file. Has the board build run in this workspace yet?", de: "Das Skript braucht eine gebaute ELF-Datei. Ist der Board-Build in diesem Arbeitsbereich schon gelaufen?" }, hints: [ { en: "Run the task CaDS: Build once - F1, then Tasks: Run Task, then CaDS: Build. It takes about a minute the first time.", de: "Führe den Task CaDS: Build einmal aus - F1, dann Tasks: Run Task, dann CaDS: Build. Beim ersten Mal dauert das etwa eine Minute." }, { en: "The file the script reads is build/itsboard/cads-zero.elf; if it is missing, the build has not finished.", de: "Die Datei, die das Skript liest, ist build/itsboard/cads-zero.elf; fehlt sie, ist der Build nicht durchgelaufen." }, { en: "Watch the build's own terminal to the end: the last line has to be the build tool's, not a compiler error.", de: "Sieh dem Build in seinem eigenen Terminal bis zum Ende zu: die letzte Zeile muss die des Build-Werkzeugs sein, keine Compilerfehlermeldung." } ] }
  - { trigger: "question:where-was-it:weak", question: { en: "Look at the bottom of the window. What is the tab of that panel called?", de: "Sieh unten im Fenster nach. Wie heißt der Reiter dieses Bereichs?" }, hints: [ { en: "The four areas are named in the section 'Was du vor dir hast' above, each with what belongs in it.", de: "Die vier Bereiche stehen im Abschnitt „Was du vor dir hast“ weiter oben, jeder mit dem, was hineingehört." }, { en: "A task always gets its own terminal, and the terminal is named after the task. There is a dropdown on the right listing all open terminals.", de: "Ein Task bekommt immer sein eigenes Terminal, und das Terminal trägt den Namen des Tasks. Rechts gibt es eine Auswahlliste mit allen offenen Terminals." }, { en: "The last line of this script always starts with PASS or FAIL, followed by a number in bytes.", de: "Die letzte Zeile dieses Skripts beginnt immer mit PASS oder FAIL, gefolgt von einer Zahl in Byte." } ] }
misconceptions:
  - pattern: "No such file or directory"
    question: { en: "The script cannot find the file it reads. Which step produces that file?", de: "Das Skript findet die Datei nicht, die es liest. Welcher Schritt erzeugt diese Datei?" }
    hints:
      - { en: "The build produces it. Nothing here works before the board build has run once.", de: "Der Build erzeugt sie. Vor dem ersten Board-Build funktioniert hier nichts." }
      - { en: "Run the task CaDS: Build - F1, then Tasks: Run Task, then CaDS: Build. About a minute the first time.", de: "Führe den Task CaDS: Build aus - F1, dann Tasks: Run Task, dann CaDS: Build. Beim ersten Mal etwa eine Minute." }
      - { en: "Afterwards build/itsboard/cads-zero.elf exists, and this task passes.", de: "Danach existiert build/itsboard/cads-zero.elf, und diese Aufgabe besteht." }
---
## Lernziel

Bediene dieses Fenster: einen Befehl finden, einen Task starten, seine Ausgabe lesen und ein Terminal wieder schließen. Ohne das kommst du in keinem späteren Step weiter.

## Was du vor dir hast

Vier Bereiche, mehr brauchst du nicht.

![Das Fenster mit allen vier Bereichen: Symbolleiste links, Kursbaum daneben, Steptext in der Mitte, Terminal unten](workbench-four-areas.png)

1. **Ganz links** eine schmale Leiste mit Symbolen, die *Activity Bar*. Das Symbol mit dem Doktorhut öffnet den **CaDS Tutor**. Das oberste Symbol öffnet den Datei-Explorer.
2. **Daneben** die **Seitenleiste** mit dem Kursbaum: unter `KURSE / COURSES` stehen Kurs, Module und Steps, unten `FORTSCHRITT / PROGRESS`. Ein Schloss vor einem Step heißt: noch gesperrt, der Step davor ist nicht fertig.
3. **In der Mitte** öffnet ein Klick auf einen Step den **Steptext** als eigenen Reiter, benannt `CaDS Tutor: <Titel>`. Dort steht oben der Pfad `Kurs › Modul › Step n von N`, daneben der Knopf **Run all checks** und ein Knopf zum Umschalten der Sprache. Ganz unten im Steptext stehen die Aufgaben mit ihren Knöpfen.
4. **Unten** der **Terminal-Bereich** mit den Reitern `PROBLEMS`, `OUTPUT`, `DEBUG CONSOLE`, `TERMINAL`, `PORTS`, `MEMORY`, `XRTOS`. Hier landet die Ausgabe von allem, was du startest. Er ist zu Beginn zugeklappt; `Strg`/`Cmd`+`J` klappt ihn auf und wieder zu.

![Der Steptext als Reiter in der Mitte, mit Pfadzeile, Bloom-Stufe und dem Knopf Run all checks](tutor-panel-step.png)

> **Die Bedienoberfläche ist auf Englisch, der Kurs auf Deutsch.** Menüs und Befehle heißen also `Terminal`, `Run Task...`, `New Terminal` — auch wenn der Text hier deutsch ist. Wo dieser Kurs einen Menüpunkt nennt, steht er so da, wie er auf dem Schirm steht.

## Drei Wege, etwas auszuführen

Alle drei führen zum selben Ergebnis. Nimm den ersten; die anderen zwei sind dein Ausweg, wenn er nicht funktioniert.

**Weg 1 — die Befehlspalette.** Drücke **`F1`**. Oben in der Mitte öffnet sich ein Eingabefeld: das ist die Befehlspalette. Tippe dort einen Befehlsnamen, und die Liste filtert mit. Enter führt den markierten Eintrag aus.

![Die geöffnete Befehlspalette mit eingetipptem Tasks: Run Task und der gefilterten Trefferliste](palette-open.png)

> **`F1` statt `Strg`/`Cmd`+`Umschalt`+`P`.** Beide Tastenkürzel tun dasselbe, aber diese Umgebung läuft im Browser, und Browser behalten `Strg`+`Umschalt`+`P` oft für sich — dann passiert nichts, oder es öffnet sich ein Browserfenster. `F1` ist der zuverlässige Weg.

**Weg 2 — das Menü.** Die Menüleiste ist hinter dem Symbol mit den drei Strichen (**☰**) ganz oben links versteckt. Ein Klick darauf öffnet `File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal`, `Help`. Fahre auf **`Terminal`**, dann auf **`Run Task...`** — es öffnet sich die Liste aller Tasks dieses Projekts. Ganz ohne Tastatur.

![Das Menü hinter dem Drei-Striche-Symbol, Terminal aufgeklappt, mit New Terminal und Run Task](menu-run-task.png)

**Weg 3 — das Terminal selbst.** **☰ → `Terminal` → `New Terminal`** klappt unten ein Terminal auf, in dem du Befehle tippst und mit Enter ausführst. Das brauchst du, wenn ein Step ein Skript nennt, für das es keinen Task gibt.

## Was ein Task ist, und woran du erkennst, dass er fertig ist

Ein **Task** ist ein fertig hinterlegter Befehl mit einem Namen. Dieses Projekt bringt sechs mit, darunter `CaDS: Build` (baut die Firmware für das Board) und `CaDS: RAM budget` (rechnet nach, wie viel Arbeitsspeicher übrig bleibt). Du musst den Befehl dahinter nicht kennen, nur den Namen.

![Die Liste aller Tasks des Projekts, von CaDS: Build bis CaDS: RAM budget](task-picker.png)

Startest du einen Task, öffnet sich unten **ein eigenes Terminal, das den Namen des Tasks trägt**. Dort läuft er, dort steht seine Ausgabe. Rechts im Terminal-Bereich stehen alle offenen Terminals untereinander — dort wechselst du zwischen ihnen.

**Fertig ist ein Task,** wenn keine neuen Zeilen mehr erscheinen und wieder eine Eingabeaufforderung dasteht. `CaDS: RAM budget` braucht dafür weniger als eine Sekunde, `CaDS: Build` beim ersten Mal etwa eine Minute.

![Der Terminal-Bereich mit der Ausgabe des RAM-Budget-Skripts: margin = 928 B und PASS](task-terminal-output.png)

## Drei Bedienfehler, die fast jeder einmal macht

- **Der Task lief, aber du suchst die Ausgabe im falschen Fenster.** Sie steht *nicht* im Steptext und *nicht* im Editor, sondern unten im Terminal-Bereich, in dem Terminal mit dem Namen des Tasks. Ist der Bereich zugeklappt: `Strg`/`Cmd`+`J` klappt ihn auf, dann rechts in der Liste das richtige Terminal wählen.
- **Du hast das Terminal geschlossen und damit den laufenden Vorgang beendet.** Das Kreuz am Terminal beendet den Prozess darin — mitten im Build heißt das: der Build ist abgebrochen. Willst du das Terminal nur wegklappen, nimm `Strg`/`Cmd`+`J`; das lässt den Vorgang weiterlaufen.
- **Das Tastenkürzel für die Palette tut nichts.** Der Browser hat es abgefangen. Nimm `F1`, oder Weg 2 über **☰ → `Terminal`**.

## Deine Aufgabe

Führe den Task **`CaDS: RAM budget`** aus und lies seine Ausgabe.

Der bequemste Weg: **`F1`**, dann `Tasks: Run Task` tippen, Enter, dann `CaDS: RAM budget` aus der Liste wählen. Ohne Tastatur: **☰ → `Terminal` → `Run Task...` → `CaDS: RAM budget`**. Es dauert unter einer Sekunde.

Unten öffnet sich ein Terminal mit dem Namen des Tasks. Darin stehen vier Zeilen; die letzte beginnt mit `PASS` und nennt eine Marge in Byte. Das ist der Spielraum, der dem Netzwerkstack und der Grafik im Arbeitsspeicher noch bleibt — in M4 rechnest du selbst damit.

Danach beantwortest du eine Frage dazu, wo die Ausgabe erschienen ist. Wenn eine Aufgabe rot bleibt: der Knopf **Hinweis anzeigen** an der Aufgabe hilft weiter, und die erste Stufe fragt genau nach dem, was am häufigsten schiefgeht.

**Wo du arbeitest:** Datei öffnen `Strg`/`Cmd`+`P` · Terminal auf- und zuklappen `Strg`/`Cmd`+`J` · Befehlspalette `F1` · Menü **☰** oben links · Task starten **☰ → `Terminal` → `Run Task...`** · Aufgaben prüfen mit dem Knopf **Prüfen** an der Aufgabe oder **Run all checks** oben im Steptext.
