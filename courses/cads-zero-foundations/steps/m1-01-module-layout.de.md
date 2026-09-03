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
    title: Du hast die Grenze im echten Baum gefunden
    check: { type: command, cwd: ".", command: "grep -n 'PRIVATE .*/src' modules/toolbox/CMakeLists.txt && ! grep -rl 'stm32f4xx.h' gui apps services", expectExitCode: 0 }
  - id: downward-only
    title: Erkläre, warum der Host-Build die eine Ausnahme verträgt
    check: { type: question, prompt: { en: "modules/storage/src/cads_flash_stm32f4.c includes stm32f4xx.h. Why does that not break the host build?", de: "modules/storage/src/cads_flash_stm32f4.c bindet stm32f4xx.h ein. Warum bricht das den Host-Build nicht?" }, rubric: "Nennt, dass modules/storage/CMakeLists.txt zwei Quelldateien hinter demselben öffentlichen Header führt und beim Konfigurieren genau eine davon auswählt: für den Cross-Build (CMAKE_SYSTEM_NAME ist Generic) src/cads_flash_stm32f4.c, sonst src/cads_flash_host.c. Der Host-Compiler bekommt die Registerfassung deshalb nie zu sehen; die Auswahl trifft der Build, nicht ein #include im Quelltext. Wer nur antwortet, es gebe eben zwei Dateien, hat den auswählenden Mechanismus nicht benannt.", bloom: understand }
socratic:
  - { trigger: "task:navigated:failed", question: { en: "The check runs two greps in the firmware root. Did the first find nothing, or did the second find something that should not exist?", de: "Der Check führt zwei greps im Wurzelverzeichnis der Firmware aus. Fand der erste nichts, oder fand der zweite etwas, das es nicht geben dürfte?" }, hints: [ { en: "Usually the line is not missing: the check ran somewhere other than the firmware root, or one of the two named paths was moved.", de: "Meistens fehlt nicht die Zeile: der Check lief woanders als im Wurzelverzeichnis der Firmware, oder einer der beiden genannten Pfade wurde verschoben." }, { en: "Open modules/toolbox/CMakeLists.txt with Ctrl/Cmd+P and read target_include_directories; the two keywords PUBLIC and PRIVATE sit directly under each other there.", de: "Öffne modules/toolbox/CMakeLists.txt mit Strg/Cmd+P und lies target_include_directories; die beiden Schlüsselwörter PUBLIC und PRIVATE stehen dort direkt untereinander." }, { en: "The second half of the command is an assurance with the sign reversed: it only passes while no file in gui, apps or services includes the vendor register header.", de: "Die zweite Hälfte des Kommandos ist eine Zusicherung mit umgekehrtem Vorzeichen: sie besteht nur, solange in gui, apps und services keine Datei den Registerheader des Herstellers einbindet." } ] }
  - { trigger: "question:downward-only:weak", question: { en: "Look for a second source file in modules/storage that implements the same public header. What separates the two?", de: "Such im Modul storage nach einer zweiten Quelldatei, die denselben öffentlichen Header implementiert. Was unterscheidet die beiden?" }, hints: [ { en: "The commonest wrong turn is to look for the answer in the C file. Is there anything in it that could rule the host out?", de: "Der häufigste Irrweg ist, die Antwort in der C-Datei zu suchen. Steht dort überhaupt etwas, das den Host ausschließen könnte?" }, { en: "Open modules/storage/CMakeLists.txt with Ctrl/Cmd+P and read the block from line 34; it sets one variable to a file name, twice, under different conditions.", de: "Öffne modules/storage/CMakeLists.txt mit Strg/Cmd+P und lies den Block ab Zeile 34; er setzt dieselbe Variable zweimal auf einen Dateinamen, unter verschiedenen Bedingungen." }, { en: "CMAKE_SYSTEM_NAME is Generic in a cross build and carries your operating system's name in a host build. The condition needs to know nothing else.", de: "CMAKE_SYSTEM_NAME hat im Cross-Build den Wert Generic und im Host-Build den Namen deines Betriebssystems. Mehr muss die Bedingung nicht wissen." } ] }
---
## Lernziel

Lies den Quellbaum der Firmware als **Abhängigkeitsgraphen** — als Bild davon, wer wen benutzt — und verstehe, warum die Grenzen zwischen den Teilen vom Build erzwungen werden statt nur vereinbart zu sein.

## Wo du in diesem Step arbeitest

Dateien öffnest du am schnellsten mit `Strg`/`Cmd`+`P` und dem getippten Dateinamen. Die erste Aufgabe unten in diesem Panel startest du mit dem Knopf **Prüfen**: sie führt zwei Suchläufe im Wurzelverzeichnis der Firmware aus und zeigt dir die Ausgabe mit Zeilennummern. Diese Zeilennummern sind der eigentliche Ertrag — sie sagen dir, wohin du im Editor springen sollst.

## Bibliotheken, kein Klumpen

CaDS Zero ist als Satz unabhängiger CMake-**Bibliotheken** gebaut. Eine Bibliothek ist ein Bündel übersetzter Quelldateien, das später als Ganzes zum Programm dazugebunden wird; dieses Dazubinden heißt **linken**. Jede Bibliothek hat eine deklarierte **öffentliche API** — die Menge der Funktionen und Typen, die andere benutzen dürfen. Sichtbar wird sie über `#include`, die Zeile, mit der eine C-Datei eine Header-Datei hereinholt und damit sagt, welche fremden Namen sie kennen will.

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

Genau diese Zeile sucht die erste Aufgabe, zusammen mit der Gegenprobe: in `gui/`, `apps/` und `services/` bindet keine einzige Datei den Registerheader `stm32f4xx.h` des Chipherstellers ein. Solange beides gilt, hält die Regel nicht nur im Diagramm, sondern im echten Baum.

## Warum es kostet, das zu ignorieren

Drei Gründe, geordnet danach, wie teuer ihre Missachtung ist:

1. **Der Simulator.** Alles oberhalb der HAL muss für den Host genauso bauen wie für das Board. Das bleibt nur wahr, wenn die Hardwareabhängigkeit auf ein Modul mit deklarierter Schnittstelle beschränkt ist — nicht verstreut über `#include "stm32f4xx.h"` in jeder Datei, die ein Register brauchte.
2. **Parallele Arbeit.** Ein Modul mit schmalem öffentlichem Header lässt sich implementieren, prüfen und mergen, ohne den Rest des Baums zu lesen.
3. **Wiederverwendung.** Canvas, Font-Renderer und Toolbox sind nicht spezifisch für diese Firmware.

Die Inventarliste in der Referenz markiert, welche Module über dieses Projekt hinaus wiederverwendbar sind (`toolbox` vollständig, `canvas` für jeden indizierten Framebuffer, `net` gar nicht) und wovon jedes abhängt.

## Die eine Datei, die auszuscheren scheint

Genau eine Quelldatei unterhalb von `modules/` bindet den Registerheader `stm32f4xx.h` doch ein: `modules/storage/src/cads_flash_stm32f4.c`, der Treiber für den internen Flash-Speicher des Chips. Trotzdem baut `modules/storage` auch für den Host, und der Host-Compiler bekommt diese Datei nie zu sehen.

Wie das zugeht, steht nicht in der C-Datei. Es steht in `modules/storage/CMakeLists.txt` — das dort nachzulesen ist deine zweite Aufgabe.

## Deine Aufgabe

1. Drücke bei der ersten Aufgabe **Prüfen** und öffne mit `Strg`/`Cmd`+`P` die Datei, deren Zeile in der Ausgabe steht (`modules/toolbox/CMakeLists.txt`). Sieh dir dort `PUBLIC` und `PRIVATE` nebeneinander an und dazu im Explorer (`Strg`/`Cmd`+`Shift`+`E`) das öffentliche `modules/toolbox/include/cads/toolbox/`, das private `modules/toolbox/src/` und die Modul-README.
2. Öffne dann `modules/storage/CMakeLists.txt` und beantworte, warum der Host-Build die Datei aus dem vorigen Abschnitt verträgt.

Der nächste Step betrachtet die Grenze selbst.
