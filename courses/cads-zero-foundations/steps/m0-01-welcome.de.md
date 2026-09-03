---
id: m0-01-welcome
title: Willkommen im CaDS-Firmware-Labor
bloom: remember
objectives: [firmware-hardware]
requires: []
estimatedMinutes: 10
scaffold: worked
links:
  - { step: m0-02-connect }
  - { doc: "docs/HARDWARE.md" }
  - { doc: "docs/ROADMAP.md" }
  - { url: "command:workbench.action.openWalkthrough?%22cads.cads-tutor%23cadsTutor.gettingStarted%22", title: "Bedienung: Erste Schritte im Fenster" }
sources: [README.md, docs/HARDWARE.md, docs/ROADMAP.md]
tasks:
  - id: oriented
    title: Du hast die Aufgabenliste unten in diesem Panel gefunden
    check: { type: manual }
  - id: what-board
    title: Benenne die drei gestapelten Hardware-Teile
    check: { type: question, prompt: { en: "Three boards are stacked on your desk. Name each one and say what it contributes.", de: "Auf deinem Tisch liegen drei Platinen übereinander. Benenne jede und sage, was sie beisteuert." }, rubric: "Nennt den NUCLEO-F429ZI (trägt den Mikrocontroller STM32F429ZI und die Debug-Probe), das ITS-Adapterboard (Ausgänge, Eingänge, Interrupt-Leitungen) und das Waveshare-4-Zoll-Touch-Shield (Farbbildschirm mit Berührungserkennung). Die Zuordnung Teil → Beitrag muss stimmen; die genaue Schreibweise der Typnummern nicht.", bloom: remember }
socratic:
  - { trigger: "task:oriented:stuck", question: { en: "This panel scrolls. What is at the very bottom of it, under the heading 'Tasks'?", de: "Dieses Panel lässt sich scrollen. Was steht ganz unten darin, unter der Überschrift „Aufgaben“?" }, hints: [ { en: "Put the mouse pointer inside this panel and scroll all the way down.", de: "Setz den Mauszeiger in dieses Panel und scroll ganz nach unten." }, { en: "Under 'Tasks' every task has its own box with buttons on the right.", de: "Unter „Aufgaben“ hat jede Aufgabe einen eigenen Kasten mit Knöpfen auf der rechten Seite." }, { en: "The button on this first task is called 'Mark as done'.", de: "Der Knopf bei dieser ersten Aufgabe heißt „Als erledigt markieren“." } ] }
  - { trigger: "question:what-board:weak", question: { en: "Take them one at a time: which of the three carries the screen you can touch, and which one plugs into your computer by USB?", de: "Nimm sie einzeln: welche der drei trägt den Bildschirm, den du berühren kannst, und welche steckt per USB an deinem Rechner?" }, hints: [ { en: "The section 'The hardware, once' above lists all three in order, bottom to top.", de: "Der Abschnitt „Die Hardware, ein für alle Mal“ weiter oben zählt alle drei der Reihe nach auf, von unten nach oben." }, { en: "One board is the computer, one is the connector panel, one is the screen. Sort them into those three roles first, then look up the names.", de: "Eine Platine ist der Rechner, eine die Anschlussebene, eine der Bildschirm. Sortiere sie erst in diese drei Rollen, dann schlag die Namen nach." }, { en: "Open docs/HARDWARE.md, section 1 'What the board is'; the first sentence names all three.", de: "Öffne docs/HARDWARE.md, Abschnitt 1 „What the board is“; der erste Satz nennt alle drei." } ] }
---
## Lernziel

Verstehe, worauf du gleich aufbaust: die Firmware CaDS Zero, das Board, auf dem sie läuft, und wie dieses Labor verdrahtet ist.

## Was du gerade vor dir hast

Du siehst ein einziges Browser-Fenster. Darin steckt eine vollständige Programmier-Umgebung — sie sieht aus wie ein Programm auf deinem Rechner, läuft aber auf einem Server der Hochschule. Vier Bereiche brauchst du:

- **Ganz links** ist eine schmale Leiste mit Symbolen, die *Activity Bar*. Das Symbol mit dem Doktorhut öffnet den **CaDS Tutor** — die Kursliste mit Modulen und Steps.
- **Hier rechts** liest du gerade diesen Text: das **Tutor-Panel**. Ganz unten in diesem Panel stehen unter der Überschrift *Aufgaben* die Kästen, mit denen du diesen Step abschließt. Scroll ruhig einmal bis dorthin, damit du weißt, wo sie sind.
- **In der Mitte** öffnen sich später deine Quelltextdateien. Eine Datei öffnest du am schnellsten mit `Strg`/`Cmd`+`P`, dann den Dateinamen tippen.
- **Unten** kannst du über das Menü *Terminal → New Terminal* ein Eingabefenster aufklappen — das **Terminal**. Immer wenn in diesem Kurs steht „führe aus“ oder „sende“, ist entweder dieses Terminal oder die Board-Konsole gemeint; der Step sagt jedes Mal dazu, welches von beiden.

## Was du als Allererstes tust

1. Scroll in diesem Panel ganz nach unten bis zur Überschrift **Aufgaben**.
2. Klicke bei der ersten Aufgabe („Du hast die Aufgabenliste unten in diesem Panel gefunden“) auf **Als erledigt markieren**.
3. Lies dann die zweite Aufgabe und beantworte sie im Textfeld darunter mit dem, was in diesem Step über die Hardware steht.

## Woran du erkennst, dass es geklappt hat

Vor einer erledigten Aufgabe steht ein grüner Haken, und der linke Rand ihres Kastens wird grün. Sind alle Aufgaben eines Steps grün, wird der Knopf **Weiter** unten rechts aktiv, und der nächste Step in der Liste links ist nicht mehr grau. Bleibt etwas rot oder grau, ist der Step noch offen — das ist kein Fehler von dir, sondern nur der Stand der Dinge.

**Wenn du nicht weiterkommst:** Bei jeder Aufgabe gibt es einen Knopf **Hinweis anzeigen**. Nutze ihn erst, wenn du es einmal selbst versucht hast — er wird mit jedem Klick konkreter. Hilft auch das nicht, ist das kein Scheitern: frag im Labor nach und nenne dabei die Step-Nummer aus der Kopfzeile dieses Panels.

## Was dieses Labor ist

Du arbeitest in einer **Browser-IDE** — einer Entwicklungsumgebung, die im Browserfenster läuft statt als Programm auf deinem Rechner (hier: VS Code über code-server). Sie läuft auf einem Server, während **das Board an deinem eigenen Rechner steckt**. Das **Flashen** (das Übertragen deines Programms in den Speicher des Mikrocontrollers), das **Debuggen** (das schrittweise Anhalten und Untersuchen des laufenden Programms) und die **serielle Konsole** (ein Textkanal zum Board, über den es Meldungen schickt und Befehle annimmt) erreichen die Hardware durch den Browser.

Du brauchst keine lokale **Toolchain** — so heißt das Bündel aus Compiler und Hilfsprogrammen, das aus deinem C-Quelltext eine Datei macht, die der Mikrocontroller ausführen kann. Der **Container**, in dem diese Umgebung läuft, trägt sie bereits in sich: die Arm-GNU-Toolchain (den Compiler für Arm-Prozessoren), CMake und Ninja (die Werkzeuge, die den Bau steuern).

Die Firmware, die du untersuchst und veränderst, ist **CaDS Zero**. *Firmware* ist das Programm, das fest auf einem Gerät sitzt und es zu dem macht, was es ist — hier: eine Clean-Room-Firmware für das ITSboard, angelehnt an ein Flipper Zero, mit einem kleinen Kern, einem GUI-Framework, einem Menü aus in sich geschlossenen Apps und einem Maskottchen, Leo der Löwe. Sie ist keine Kopie; jeder Funktionsname trägt das Präfix `cads_`, und die Architektur folgt den realen Zwängen dieses Boards.

## Die Hardware, ein für alle Mal

Drei Teile sind zum Board gestapelt (siehe `docs/HARDWARE.md`):

1. Unten ein **NUCLEO-F429ZI**, dessen Mikrocontroller ein **STM32F429ZI** ist — ein Cortex-M4F mit 180 MHz. Das ist der Rechner: 2 MB Programmspeicher (**Flash** — er behält seinen Inhalt ohne Strom) in zwei getrennten Hälften, 192 KB Arbeitsspeicher (**SRAM**) und 64 KB besonders schneller Speicher direkt am Rechenkern (**CCM**). Was diese Unterschiede bedeuten, brauchst du erst in M2.
2. In der Mitte ein **ITS-Adapterboard**, das 16 Ausgänge, 8 Eingänge und 6 Interrupt-Leitungen herausführt — die Anschlussebene, an der du später Lampen leuchten und Taster reagieren siehst.
3. Oben ein **Waveshare-4-Zoll-TFT-Touch-Shield**: ein Farbpanel mit 480×320 Bildpunkten und Berührungserkennung.

Das Board hat kein Sub-GHz-Funk, kein NFC und kein Infrarot — dieses Silizium fehlt schlicht. Stattdessen hat es **100-Mbit-Ethernet**, einen Farb-Touchscreen und einen Grafikbeschleuniger, und genau darauf setzt die Firmware.

## Was „fertig“ hier bedeutet

CaDS Zero hält sich an eine harte Regel: **der Displaybus ist nur beschreibbar**, Software kann das Panel also nicht fragen, ob ein Schreibvorgang ankam. Jeder Meilenstein endet deshalb an einem Hardware-Gate — Code, der nur kompiliert wurde, zählt nicht als funktionierend. In M0 begegnest du diesem Gate selbst.

## Wie du den Kurs durcharbeitest

Jeder Step beginnt mit seinem Lernziel in einem Satz, gibt dir einen kompakten Text und stellt dir dann ein bis drei Aufgaben. Die meisten Aufgaben prüft der Tutor selbst — er baut die Firmware, sucht in Dateien oder liest die Antwort des Boards mit. Aufgaben, die mit **Als erledigt markieren** abgehakt werden, bestätigst du selbst; sie sind ein Merkposten, kein Nachweis. Lies `docs/ROADMAP.md`, wenn du die laufende Selbstbeschreibung des Projekts willst — es ist das Gedächtnis der Firmware über sich selbst.

**Was du mitbringen solltest:** Grundkenntnisse in C — Funktionen, `if` und `switch`, Datentypen — sowie die Bereitschaft, Dateien in einem Editor zu öffnen und Befehle in ein Terminal zu tippen. Hexadezimalzahlen, Bits und die Schreibweise für Hardware-Register führt der Kurs in M2 ein und setzt sie vorher nicht voraus.

## Dokumentation

Das Labor hat ein eigenes Handbuch mit Tutorials, How-tos und Troubleshooting: [https://scimbe.github.io/CADS-DEMO-firmware-lab-docs/de/](https://scimbe.github.io/CADS-DEMO-firmware-lab-docs/de/). Halte es in einem zweiten Tab offen; jeder Tutor-Step, der das Board berührt, verlinkt die passende Seite.

## Deine Aufgabe

Finde die Aufgabenliste unten in diesem Panel und hake die erste Aufgabe ab. Beantworte dann die Frage zur Hardware. Es gibt noch nichts zu bauen — der nächste Step verbindet das Board.
