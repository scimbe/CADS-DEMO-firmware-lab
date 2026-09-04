---
id: m1-01-module-layout
title: Das Modul-Layout
bloom: understand
objectives: [firmware-reference-module-layout]
requires: [m0-05-explorer]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m1-02-hal-boundary }
  - { doc: "docs/reference/module-layout.md" }
  - { file: "core/cads_hal.h", line: 1 }
  - { file: "modules/storage/CMakeLists.txt", line: 34 }
sources: [docs/reference/module-layout.md, CMakeLists.txt, README.md, modules/toolbox/CMakeLists.txt, modules/storage/CMakeLists.txt]
tasks:
  - id: navigated
    title: Sage voraus, welches der beiden Include-Verzeichnisse privat ist
    check: { type: predict, prompt: { en: "modules/toolbox publishes its API and hides its implementation with one CMake call, target_include_directories. Predict which of its two include directories carries PRIVATE, and say what a dependent library could reach if both carried PUBLIC. Two sentences - the prediction, then the consequence.", de: "modules/toolbox veröffentlicht seine API und verbirgt seine Implementierung mit einem einzigen CMake-Aufruf, target_include_directories. Sage voraus, welches seiner beiden Include-Verzeichnisse PRIVATE trägt, und sag, was eine abhängige Bibliothek erreichen könnte, wenn beide PUBLIC trügen. Zwei Sätze - die Vorhersage, dann die Folge." }, then: { type: command, cwd: ".", command: "grep -n 'PRIVATE .*/src' modules/toolbox/CMakeLists.txt", expectExitCode: 0 }, rubric: "Die Ausgabe zeigt genau eine Zeile - src/ steht als PRIVATE im Include-Pfad. Bestanden, wenn die Antwort nach dem Vergleich benennt, was PRIVATE bewirkt: das Verzeichnis mit den privaten Headern gilt nur beim Übersetzen dieser Bibliothek selbst und wird nicht an abhängige Ziele weitergereicht. Und was der Gegenfall kostet: mit PUBLIC könnte jedes abhängige Ziel die privaten Header aus src/ einbinden, und die Grenze wäre wieder bloße Konvention. Wer PUBLIC für beide vorhersagte und danach diese Folge benennt, besteht ebenso.", bloom: understand }
  - id: layer-rule
    title: Zusicherung - keine Datei in gui, apps oder services bindet stm32f4xx.h ein
    check: { type: command, cwd: ".", command: "! grep -rq 'stm32f4xx.h' gui apps services", expectExitCode: 0 }
  - id: downward-only
    title: Erkläre, warum der Host-Build die eine Ausnahme verträgt
    check: { type: question, prompt: { en: "modules/storage/src/cads_flash_stm32f4.c includes stm32f4xx.h. Why does that not break the host build? Two sentences - which mechanism selects, and where it stands.", de: "modules/storage/src/cads_flash_stm32f4.c bindet stm32f4xx.h ein. Warum bricht das den Host-Build nicht? Zwei Sätze - welcher Mechanismus auswählt und wo er steht." }, rubric: "Nennt, dass modules/storage/CMakeLists.txt zwei Quelldateien hinter demselben öffentlichen Header führt und beim Konfigurieren genau eine davon auswählt: für den Cross-Build (CMAKE_SYSTEM_NAME ist Generic) src/cads_flash_stm32f4.c, sonst src/cads_flash_host.c. Der Host-Compiler bekommt die Registerfassung deshalb nie zu sehen; die Auswahl trifft der Build, nicht ein #include im Quelltext. Wer nur antwortet, es gebe eben zwei Dateien, hat den auswählenden Mechanismus nicht benannt.", bloom: understand }
socratic:
  - { trigger: "task:navigated:stuck", question: { en: "Which of the two directories does a dependent target need in order to include the public header - and would it ever need the other one?", de: "Welches der beiden Verzeichnisse braucht ein abhängiges Ziel, um den öffentlichen Header einzubinden - und bräuchte es das andere je?" }, hints: [ { en: "Are you predicting about the folder names, or about who is allowed to see them? Only the second question has an answer in CMake.", de: "Sagst du etwas über die Ordnernamen voraus oder darüber, wer sie sehen darf? Nur die zweite Frage hat in CMake eine Antwort." }, { en: "Open modules/toolbox/CMakeLists.txt with Ctrl/Cmd+P and read target_include_directories; the two keywords stand directly under each other, one per directory.", de: "Öffne modules/toolbox/CMakeLists.txt mit Strg/Cmd+P und lies target_include_directories; die beiden Schlüsselwörter stehen direkt untereinander, eines je Verzeichnis." }, { en: "CMake hands a PUBLIC include directory on to every dependent target and keeps a PRIVATE one to the library itself. What follows for the two directories is yours to say.", de: "CMake reicht ein PUBLIC-Include-Verzeichnis an jedes abhängige Ziel weiter und behält ein PRIVATE-Verzeichnis bei der Bibliothek selbst. Was daraus für die beiden Verzeichnisse folgt, sagst du." } ] }
  - { trigger: "task:layer-rule:failed", question: { en: "Something under gui, apps or services now names the vendor register header. Did an edit of yours add it, or did the check run outside the firmware root?", de: "Irgendetwas unter gui, apps oder services nennt jetzt den Registerheader des Herstellers. Hat eine deiner Änderungen ihn ergänzt, oder lief der Check außerhalb des Firmware-Wurzelverzeichnisses?" }, hints: [ { en: "Does the failure name a file you touched? If the three directories do not exist where the check ran, the answer is the working directory, not the tree.", de: "Nennt der Fehlschlag eine Datei, die du angefasst hast? Existieren die drei Verzeichnisse dort nicht, wo der Check lief, liegt es am Arbeitsverzeichnis, nicht am Baum." }, { en: "Run the search by hand from the firmware root: grep -rn stm32f4xx.h gui apps services names the file and the line.", de: "Führ die Suche von Hand im Wurzelverzeichnis der Firmware aus: grep -rn stm32f4xx.h gui apps services nennt Datei und Zeile." }, { en: "Register code belongs below the HAL - in targets/ or behind an interface in core/. Nothing above it may name a vendor register header.", de: "Registercode gehört unter die HAL - nach targets/ oder hinter eine Schnittstelle in core/. Nichts darüber darf einen Registerheader des Herstellers nennen." } ] }
  - { trigger: "question:downward-only:weak", question: { en: "Look for a second source file in modules/storage that implements the same public header. What separates the two?", de: "Such im Modul storage nach einer zweiten Quelldatei, die denselben öffentlichen Header implementiert. Was unterscheidet die beiden?" }, hints: [ { en: "The commonest wrong turn is to look for the answer in the C file. Is there anything in it that could rule the host out?", de: "Der häufigste Irrweg ist, die Antwort in der C-Datei zu suchen. Steht dort überhaupt etwas, das den Host ausschließen könnte?" }, { en: "Open modules/storage/CMakeLists.txt with Ctrl/Cmd+P and read the block from line 34; it sets one variable to a file name, twice, under different conditions.", de: "Öffne modules/storage/CMakeLists.txt mit Strg/Cmd+P und lies den Block ab Zeile 34; er setzt dieselbe Variable zweimal auf einen Dateinamen, unter verschiedenen Bedingungen." }, { en: "CMAKE_SYSTEM_NAME is Generic in a cross build and carries your operating system's name in a host build. The condition needs to know nothing else.", de: "CMAKE_SYSTEM_NAME hat im Cross-Build den Wert Generic und im Host-Build den Namen deines Betriebssystems. Mehr muss die Bedingung nicht wissen." } ] }
---
## Lernziel

Lies den Quellbaum der Firmware als **Abhängigkeitsgraphen** — als Bild davon, wer wen benutzt — und verstehe, warum die Grenzen zwischen den Teilen vom Build erzwungen werden statt nur vereinbart zu sein.

## Wo du in diesem Step arbeitest

Dieser Step verlangt zwei Handgriffe: Dateien öffnen und eine Vorhersage prüfen lassen.

**Eine Datei öffnen.** Drücke `Strg`/`Cmd`+`P`, tippe den Dateinamen (Teile davon genügen) und wähle den Treffer mit `Enter`. Die Datei öffnet sich als Reiter **in der Mitte**, neben dem Reiter dieses Steptextes; über die Reiterleiste wechselst du zurück. Ohne Tastatur: das oberste Symbol der schmalen Leiste ganz links öffnet den **Datei-Explorer**, in dem du dich durch die Ordner klickst.

**Eine Aufgabe prüfen.** Die erste Aufgabe unten in diesem Steptext ist eine **Vorhersage**: schreib deine Erwartung in das Feld — ohne Text passiert nichts, der Check verlangt sie zuerst — und drücke dann **Prüfen**. Erst jetzt führt der Tutor den Suchlauf aus, der deine Erwartung mit dem echten Baum vergleicht. **Die Ausgabe erscheint direkt an der Aufgabe im Steptext, nicht in einem Terminal**; die Zeilennummer darin sagt dir, wohin du im Editor springst. Denselben Suchlauf kannst du von Hand nachvollziehen: **☰ → `Terminal` → `New Terminal`** (☰ ist das Symbol mit den drei Strichen ganz oben links, eine Menüleiste gibt es nicht) und dort

```
grep -n 'PRIVATE .*/src' modules/toolbox/CMakeLists.txt
```

Die zweite Aufgabe ist keine Aufgabe an dich, sondern eine **Zusicherung** über das Repository — sie besteht, solange die Schichtregel im Baum hält, und ist ohne dein Zutun heute grün.

## Bibliotheken, kein Klumpen

CaDS Zero ist als Satz unabhängiger CMake-**Bibliotheken** gebaut. Eine Bibliothek ist ein Bündel übersetzter Quelldateien, das später als Ganzes zum Programm dazugebunden wird; dieses Dazubinden heißt **linken**. Jede Bibliothek hat eine deklarierte **öffentliche API** — die Menge der Funktionen und Typen, die andere benutzen dürfen. Sichtbar wird sie über `#include`, die Zeile, mit der eine C-Datei eine Header-Datei hereinholt.

Das oberste `CMakeLists.txt` fügt die Bibliotheken in Abhängigkeitsreihenfolge hinzu: `modules/toolbox`, `modules/storage`, `modules/config`, `modules/net`, `modules/cli`, `modules/diag`, den Kernel (nur Board), dann die portable GUI-Schicht (`gui/`), die Dienste (`services/`), die Apps unter `apps/` und zuletzt genau ein Target-Verzeichnis — `targets/itsboard` oder `targets/sim`.

Der Aufbau eines Moduls ist festgelegt (`docs/reference/module-layout.md`):

```
modules/<name>/
  include/cads/<name>/*.h    öffentliche API, das Einzige, was Abhängige einbinden dürfen
  src/*.c *.h                Implementierung, private Header liegen hier
  tests/*.c                  Host-Unit-Tests, von ctest ausgeführt
  README.md                  was, warum, wie, Grenzen
  CMakeLists.txt
```

Der Include-Pfad lautet `cads/<name>/...` statt eines nackten Dateinamens, damit ein `#include` sagt, woher ein Typ stammt.

## Die Regel, die der Build erzwingt

Abhängigkeiten zeigen **nur nach unten**, und der Graph ist **azyklisch**: kein Weg führt über mehrere Pfeile wieder zu seinem Ausgangspunkt zurück.

```
        apps/            Desktop, Menü, Werkzeuge
          │
        gui/             Views, Widgets, Compositor
          │
   canvas ─┴─ input ─ storage ─ net        Feature-Module
     └─────────┴────┬────┴────────┘
                 hal_api            die Schnittstelle, keine Implementierung
        ┌───────────┴───────────┐
   targets/itsboard        targets/sim
```

Ein Feature-Modul bindet nie einen Target-Header ein. `hal_api` besteht **nur aus Headern**, und genau das lässt dieselben **Objektdateien** gegen beide **Backends** linken. Eine Objektdatei ist das Zwischenergebnis für genau eine übersetzte C-Datei; ein Backend ist hier einer der beiden austauschbaren Unterbauten `targets/itsboard` und `targets/sim`.

Der Mechanismus ist ein einziges CMake-Schlüsselwort: das `src/` eines Moduls wird als `PRIVATE`-Include-Verzeichnis eingetragen. `PRIVATE` heißt in CMake „gilt nur beim Übersetzen dieses Moduls selbst“, im Gegensatz zu `PUBLIC`: „gilt auch für alle, die mich benutzen“. Die eigenen Header eines Moduls sind damit von außen unerreichbar, und der öffentliche Header bleibt der einzige Weg hinein.

Genau diese Zeile enthüllt der Vergleich der ersten Aufgabe. Die zweite Aufgabe ist die Gegenprobe: in `gui/`, `apps/` und `services/` bindet keine einzige Datei den Registerheader `stm32f4xx.h` des Chipherstellers ein. Solange beides gilt, hält die Regel nicht nur im Diagramm, sondern im echten Baum.

## Warum es kostet, das zu ignorieren

1. **Der Simulator.** Alles oberhalb der HAL muss für den Host genauso bauen wie für das Board. Das bleibt nur wahr, wenn die Hardwareabhängigkeit auf ein Modul mit deklarierter Schnittstelle beschränkt ist — nicht verstreut über `#include "stm32f4xx.h"` in jeder Datei, die ein Register brauchte.
2. **Parallele Arbeit.** Ein Modul mit schmalem öffentlichem Header lässt sich implementieren, prüfen und mergen, ohne den Rest des Baums zu lesen.
3. **Wiederverwendung.** Canvas, Font-Renderer und Toolbox sind nicht spezifisch für diese Firmware; die Referenz markiert, welche Module über dieses Projekt hinaus taugen und wovon jedes abhängt.

## Die eine Datei, die auszuscheren scheint

Genau eine Quelldatei unterhalb von `modules/` bindet den Registerheader `stm32f4xx.h` doch ein: `modules/storage/src/cads_flash_stm32f4.c`, der Treiber für den internen Flash-Speicher des Chips. Trotzdem baut `modules/storage` auch für den Host, und der Host-Compiler bekommt diese Datei nie zu sehen. Wie das zugeht, steht nicht in der C-Datei, sondern in `modules/storage/CMakeLists.txt`.

## Deine Aufgabe

1. Schreib bei der ersten Aufgabe deine Vorhersage in das Feld, drücke **Prüfen** und öffne dann mit `Strg`/`Cmd`+`P` die Datei aus der Ausgabe (`modules/toolbox/CMakeLists.txt`). Sieh dir dort `PUBLIC` und `PRIVATE` nebeneinander an, dazu im Datei-Explorer (`Strg`/`Cmd`+`Umschalt`+`E`, oder das oberste Symbol links) das öffentliche `modules/toolbox/include/cads/toolbox/`, das private `modules/toolbox/src/` und die Modul-README.
2. Öffne dann mit `Strg`/`Cmd`+`P` die Datei `modules/storage/CMakeLists.txt`, lies den Block ab Zeile 34 und beantworte im Feld der dritten Aufgabe, warum der Host-Build die Datei aus dem vorigen Abschnitt verträgt. **Antwort abgeben** schickt sie ab.

Der nächste Step betrachtet die Grenze selbst.
