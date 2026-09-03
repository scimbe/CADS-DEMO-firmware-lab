---
id: m0-03-build
title: Beide Targets bauen
bloom: apply
objectives: [firmware-how-to-build]
requires: [m0-02-connect]
estimatedMinutes: 15
scaffold: worked
links:
  - { step: m0-04-flash-console }
  - { doc: "docs/how-to/build.md" }
  - { file: "scripts/build.sh", line: 13 }
sources: [docs/how-to/build.md, docs/tutorials/first-build.md, CMakePresets.json, docs/explanation/toolchain.md]
tasks:
  - id: build-firmware
    title: Die Firmware baut für das Board
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: has-main
    title: Der Build hat eine echte ELF erzeugt
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "main" }
  - id: host-build
    title: Derselbe Code baut für den Simulator
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
socratic:
  - { trigger: "task:build-firmware:failed", question: { en: "A build first looks for a compiler, then for every header. Which of the two searches failed in your output?", de: "Ein Build sucht zuerst einen Compiler und dann jede Header-Datei. Welche der beiden Suchen ist in deiner Ausgabe fehlgeschlagen?" }, hints: [ { en: "The first build usually fails on something the build cannot find — the compiler or a header — not on a typo in the code.", de: "Der erste Build scheitert meist an etwas, das er nicht findet — dem Compiler oder einem Header —, nicht an einem Tippfehler im Code." }, { en: "The terminal the task ran in opens at the bottom of the window; scroll up in it to the FIRST red line. The last line only says that it stopped, not why.", de: "Das Terminal, in dem der Task lief, klappt unten im Fenster auf; scroll darin nach oben zur ERSTEN roten Zeile. Die letzte Zeile sagt nur, dass abgebrochen wurde, nicht warum." }, { en: "A message naming a header file points at lib/; a message naming CMAKE_C_COMPILER points at the Arm toolchain. Both are environment problems, not code problems.", de: "Eine Meldung, die eine Header-Datei nennt, zeigt auf lib/; eine Meldung über CMAKE_C_COMPILER zeigt auf die Arm-Toolchain. Beides sind Umgebungsprobleme, keine Codeprobleme." } ] }
  - { trigger: "task:has-main:failed", question: { en: "This check reads a file that the board build writes. Does that file exist yet?", de: "Dieser Check liest eine Datei, die der Board-Build schreibt. Gibt es diese Datei überhaupt schon?" }, hints: [ { en: "Usually the symbol is not missing — the ELF was never produced, so the board build did not run or stopped earlier.", de: "Meistens fehlt nicht das Symbol, sondern die ELF ist nie entstanden — der Board-Build lief also gar nicht oder brach vorher ab." }, { en: "Open the file explorer on the left with Ctrl/Cmd+Shift+E and look for build/itsboard/cads-zero.elf. If the folder is empty, the previous task is the one to finish first.", de: "Öffne links den Datei-Explorer mit Strg/Cmd+Shift+E und sieh nach build/itsboard/cads-zero.elf. Ist der Ordner leer, gehört zuerst die vorige Aufgabe erledigt." }, { en: "The host build does not produce this file; its results go to build/host/. Only the itsboard preset writes build/itsboard/.", de: "Der Host-Build erzeugt diese Datei nicht; seine Ergebnisse landen in build/host/. Nur das Preset itsboard schreibt nach build/itsboard/." } ] }
  - { trigger: "task:host-build:failed", question: { en: "This task builds and then runs tests. Which of the two stages does your output stop at?", de: "Diese Aufgabe baut und führt danach Tests aus. Bei welcher der beiden Stufen bleibt deine Ausgabe stehen?" }, hints: [ { en: "If the board build worked and this one does not, the Arm toolchain is not the suspect — the host build uses your system's own compiler.", de: "Wenn der Board-Build lief und dieser nicht, ist die Arm-Toolchain nicht der Verdächtige — der Host-Build nimmt den Compiler deines eigenen Systems." }, { en: "Start it by hand from the menu Terminal → Run Task… and pick CaDS: Host tests; the end of the output states how many tests passed and how many failed.", de: "Starte ihn von Hand über das Menü Terminal → Run Task… und wähle CaDS: Host tests; am Ende der Ausgabe steht, wie viele Tests bestanden und wie viele fehlgeschlagen sind." }, { en: "Golden-image tests are deliberately excluded from this task, so a failure here names a real unit test. Read the failing test's name — it points straight at the source file to open.", de: "Golden-Image-Tests sind aus dieser Aufgabe absichtlich ausgeschlossen; ein Fehlschlag nennt hier also einen echten Unit-Test. Lies dessen Namen — er zeigt direkt auf die Quelldatei, die du öffnen solltest." } ] }
misconceptions:
  - { pattern: "fatal error: .*No such file or directory", question: { en: "The compiler could not find a header. Is the name it prints something your code owns, or something it includes from lib/?", de: "Der Compiler hat eine Header-Datei nicht gefunden. Gehört der genannte Name zu deinem Code oder zu etwas, das aus lib/ eingebunden wird?" }, hints: [ { en: "Nothing of yours is missing; something your code includes is. The file name in the message is the key.", de: "Es fehlt nichts von dir, sondern etwas, das dein Code einbindet. Der Dateiname in der Meldung ist der Schlüssel." }, { en: "Open the explorer with Ctrl/Cmd+Shift+E and look inside lib/: the folders there (CMSIS_6, cmsis_device_f4, FreeRTOS-Kernel, littlefs, lwip, Unity) are submodules and must not be empty.", de: "Öffne den Explorer mit Strg/Cmd+Shift+E und sieh in lib/ nach: die Ordner dort (CMSIS_6, cmsis_device_f4, FreeRTOS-Kernel, littlefs, lwip, Unity) sind Submodule und dürfen nicht leer sein." }, { en: "If one of them is empty, the workspace was not seeded completely. No code change fixes that — say so in the lab and name the empty folder.", de: "Ist einer davon leer, wurde der Arbeitsbereich nicht vollständig angelegt. Das behebt kein Eingriff im Code — sag im Labor Bescheid und nenne den leeren Ordner." } ] }
  - { pattern: "is not a full path and was not found in the PATH", question: { en: "This message arrives before a single file is compiled. Which program is CMake looking for?", de: "Diese Meldung kommt, bevor eine einzige Datei übersetzt wurde. Welches Programm sucht CMake hier?" }, hints: [ { en: "This is a configure-time error, not a compile error: nothing of the firmware has been translated yet.", de: "Das ist ein Fehler beim Konfigurieren, nicht beim Übersetzen: von der Firmware wurde noch nichts übersetzt." }, { en: "Open cmake/arm-none-eabi-gcc.cmake with Ctrl/Cmd+P and read the first 25 lines — they say in which two places the Arm toolchain is looked for.", de: "Öffne cmake/arm-none-eabi-gcc.cmake mit Strg/Cmd+P und lies die ersten 25 Zeilen — sie sagen, an welchen zwei Orten die Arm-Toolchain gesucht wird." }, { en: "The host preset needs none of this. If host builds and itsboard does not, the missing piece is the cross compiler, not your source.", de: "Das Preset host braucht davon nichts. Baut host durch und itsboard nicht, ist der Cross-Compiler das fehlende Stück, nicht dein Quelltext." } ] }
---
## Lernziel

Erzeuge beide Bauergebnisse aus einem Quellbaum: das echte Firmware-Image für das Board und den Host-Build, auf dem Simulator und Unit-Tests laufen.

## Wo du den Build startest

Es gibt im Fenster keinen Knopf mit der Aufschrift „CaDS: Build“. Zwei Wege führen zum selben Ergebnis:

- **Der bequeme:** Scroll in diesem Panel nach unten zur Aufgabe *Die Firmware baut für das Board* und drücke **Prüfen**. Der Tutor startet den Build selbst und wertet ihn aus. Dasselbe gilt für die dritte Aufgabe und den Host-Build.
- **Der von Hand:** Menü **Terminal → Run Build Task…** (`Strg`/`Cmd`+`Shift`+`B`) startet den voreingestellten Build-Task des Arbeitsbereichs — und das ist genau **CaDS: Build**. Für den Host-Build nimm **Terminal → Run Task…** und wähle **CaDS: Host tests** aus der Liste.

Beide Wege öffnen unten im Fenster das **Terminal** — das Eingabe- und Ausgabefenster, in dem Befehle laufen. Dort liest du im Fehlerfall nach, und zwar die **erste** Fehlerzeile: sie sagt, was schiefging. Die letzte sagt nur, dass abgebrochen wurde.

## Zwei Presets, ein Baum

CaDS Zero baut mit CMake und Ninja. `CMakePresets.json` definiert zwei Configure-Presets. Ein *Preset* ist eine benannte, fertig eingestellte Bau-Konfiguration: statt ein Dutzend Optionen zu tippen, nennst du ihren Namen.

- **itsboard** — **cross-kompiliert** für den STM32F429 mit `arm-none-eabi-gcc` über `cmake/arm-none-eabi-gcc.cmake`. *Cross-kompilieren* heißt: auf einem Rechner Code für einen anderen Prozessortyp erzeugen; hier baut ein Rechner im Rechenzentrum Code für einen Arm-Kern, der ihn nie selbst ausführen wird. Die **Artefakte** — so heißen die Dateien, die ein Build hinterlässt — landen in `build/itsboard/`: `cads-zero.elf` (das vollständige Programm samt Symbol- und Debug-Informationen), `.bin` und `.hex` (nur die reinen Bytes, wie sie in den Flash geschrieben werden, in zwei üblichen Verpackungen) und `cads-zero.map` (die Liste, welche Funktion wo im Speicher gelandet ist).
- **host** — baut mit dem nativen Compiler deines Systems: den SDL2-**Simulator** (ein Programm, das das Board auf dem Bildschirm nachbildet, damit Code ohne Hardware läuft) und die vollständige **Unit-Test**- und **Golden-Image**-Suite. Ein *Unit-Test* prüft automatisch eine einzelne Funktion; ein *Golden-Image-Test* vergleicht ein gerendertes Bild Pixel für Pixel mit einem hinterlegten Sollbild. Für diesen Weg wird keine Arm-Toolchain gebraucht.

Beide zusammen heißen die zwei **Targets** des Projekts — Zielplattformen, für die derselbe Quelltext gebaut wird.

Die Regel, auf der das gesamte Projekt ruht: **alles oberhalb der HAL baut für beide Targets.** *HAL* steht für Hardware Abstraction Layer: die dünne Schicht Code, die als Einzige die Register des Chips anfasst; alles darüber weiß nichts von der Hardware und läuft deshalb auch im Simulator. Genauer wird das in M1. Ein Feature, das nur für eines der beiden Targets kompiliert, ist nicht fertig. Der Host-Build ist kein Spielzeug — er führt denselben portablen Code aus wie das Board und ist der Ort, an dem die meisten Tests laufen.

## Woher der Compiler kommt

`scripts/build.sh` bindet `scripts/cads_env.sh` ein, das `arm-none-eabi-gcc` aus dem vcpkg-Artefaktbaum der Keil-Studio-Erweiterung oder von `PATH` auflöst. Du installierst keinen Compiler; der Container trägt die Version 13.3.1 bereits. Details stehen in `docs/explanation/toolchain.md`.

## Den Größenbericht lesen

Jeder Firmware-Link druckt einen Speicherbericht. *Linken* ist der letzte Schritt eines Builds: der **Linker** setzt alle übersetzten Teile zu einem Speicherabbild zusammen und gibt jedem Stück seine Adresse. Es lohnt sich, den Bericht jetzt lesen zu lernen, denn du beobachtest ihn den Rest des Kurses:

```
Memory region         Used Size  Region Size  %age Used
       FLASH_APP:      ...            1 MB       ...
        FLASH_FS:          0 B      896 KB       0.00%
             RAM:      ...          192 KB       ...
             CCM:      ...           64 KB       ...
```

`FLASH_FS` muss bei 0 bleiben — alles dort würde mit **littlefs** kollidieren, dem kleinen Dateisystem für Flash-Speicher, das in Flash-Bank 2 liegt. Der Linker sichert außerdem zu, dass mindestens 48 KB **Heap** übrig bleiben — so heißt der Speicherbereich, aus dem sich ein Programm zur Laufzeit Platz holt —, weil lwIP und die GUI darunter nicht passen. Ein Build, der eine dieser Regeln bricht, linkt gar nicht erst, statt im Feld zu versagen.

## Deine Aufgabe

Lass beide Builds laufen: den für das Board und den für den Host. Die Checks bestätigen, dass beide gelingen und dass der Board-Build eine ELF mit `main` erzeugt hat. Der nächste Step bringt dieses Image auf echtes Silizium.
