---
id: m0-03-build
title: Build both targets
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
    title: The firmware builds for the board
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: has-main
    title: The build produced a real ELF
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "main" }
  - id: host-build
    title: The same code builds for the simulator
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
socratic:
  - { trigger: "task:build-firmware:failed", question: { en: "A build first looks for a compiler, then for every header. Which of the two searches failed in your output?", de: "Ein Build sucht zuerst einen Compiler und dann jede Header-Datei. Welche der beiden Suchen ist in deiner Ausgabe fehlgeschlagen?" }, hints: [ { en: "The first build usually fails on something the build cannot find — the compiler or a header — not on a typo in the code.", de: "Der erste Build scheitert meist an etwas, das er nicht findet — dem Compiler oder einem Header —, nicht an einem Tippfehler im Code." }, { en: "The terminal the task ran in opens at the bottom of the window; scroll up in it to the FIRST red line. The last line only says that it stopped, not why.", de: "Das Terminal, in dem der Task lief, klappt unten im Fenster auf; scroll darin nach oben zur ERSTEN roten Zeile. Die letzte Zeile sagt nur, dass abgebrochen wurde, nicht warum." }, { en: "A message naming a header file points at lib/; a message naming CMAKE_C_COMPILER points at the Arm toolchain. Both are environment problems, not code problems.", de: "Eine Meldung, die eine Header-Datei nennt, zeigt auf lib/; eine Meldung über CMAKE_C_COMPILER zeigt auf die Arm-Toolchain. Beides sind Umgebungsprobleme, keine Codeprobleme." } ] }
  - { trigger: "task:has-main:failed", question: { en: "This check reads a file that the board build writes. Does that file exist yet?", de: "Dieser Check liest eine Datei, die der Board-Build schreibt. Gibt es diese Datei überhaupt schon?" }, hints: [ { en: "Usually the symbol is not missing — the ELF was never produced, so the board build did not run or stopped earlier.", de: "Meistens fehlt nicht das Symbol, sondern die ELF ist nie entstanden — der Board-Build lief also gar nicht oder brach vorher ab." }, { en: "Open the file explorer on the left with Ctrl/Cmd+Shift+E and look for build/itsboard/cads-zero.elf. If the folder is empty, the previous task is the one to finish first.", de: "Öffne links den Datei-Explorer mit Strg/Cmd+Shift+E und sieh nach build/itsboard/cads-zero.elf. Ist der Ordner leer, gehört zuerst die vorige Aufgabe erledigt." }, { en: "The host build does not produce this file; its results go to build/host/. Only the itsboard preset writes build/itsboard/.", de: "Der Host-Build erzeugt diese Datei nicht; seine Ergebnisse landen in build/host/. Nur das Preset itsboard schreibt nach build/itsboard/." } ] }
  - { trigger: "task:host-build:failed", question: { en: "This task builds and then runs tests. Which of the two stages does your output stop at?", de: "Diese Aufgabe baut und führt danach Tests aus. Bei welcher der beiden Stufen bleibt deine Ausgabe stehen?" }, hints: [ { en: "If the board build worked and this one does not, the Arm toolchain is not the suspect — the host build uses your system's own compiler.", de: "Wenn der Board-Build lief und dieser nicht, ist die Arm-Toolchain nicht der Verdächtige — der Host-Build nimmt den Compiler deines eigenen Systems." }, { en: "Start it by hand from the menu Terminal → Run Task… and pick CaDS: Host tests; the end of the output states how many tests passed and how many failed.", de: "Starte ihn von Hand über das Menü Terminal → Run Task… und wähle CaDS: Host tests; am Ende der Ausgabe steht, wie viele Tests bestanden und wie viele fehlgeschlagen sind." }, { en: "Golden-image tests are deliberately excluded from this task, so a failure here names a real unit test. Read the failing test's name — it points straight at the source file to open.", de: "Golden-Image-Tests sind aus dieser Aufgabe absichtlich ausgeschlossen; ein Fehlschlag nennt hier also einen echten Unit-Test. Lies dessen Namen — er zeigt direkt auf die Quelldatei, die du öffnen solltest." } ] }
misconceptions:
  - { pattern: "fatal error: .*No such file or directory", question: { en: "The compiler could not find a header. Is the name it prints something your code owns, or something it includes from lib/?", de: "Der Compiler hat eine Header-Datei nicht gefunden. Gehört der genannte Name zu deinem Code oder zu etwas, das aus lib/ eingebunden wird?" }, hints: [ { en: "Nothing of yours is missing; something your code includes is. The file name in the message is the key.", de: "Es fehlt nichts von dir, sondern etwas, das dein Code einbindet. Der Dateiname in der Meldung ist der Schlüssel." }, { en: "Open the explorer with Ctrl/Cmd+Shift+E and look inside lib/: the folders there (CMSIS_6, cmsis_device_f4, FreeRTOS-Kernel, littlefs, lwip, Unity) are submodules and must not be empty.", de: "Öffne den Explorer mit Strg/Cmd+Shift+E und sieh in lib/ nach: die Ordner dort (CMSIS_6, cmsis_device_f4, FreeRTOS-Kernel, littlefs, lwip, Unity) sind Submodule und dürfen nicht leer sein." }, { en: "If one of them is empty, the workspace was not seeded completely. No code change fixes that — say so in the lab and name the empty folder.", de: "Ist einer davon leer, wurde der Arbeitsbereich nicht vollständig angelegt. Das behebt kein Eingriff im Code — sag im Labor Bescheid und nenne den leeren Ordner." } ] }
  - { pattern: "is not a full path and was not found in the PATH", question: { en: "This message arrives before a single file is compiled. Which program is CMake looking for?", de: "Diese Meldung kommt, bevor eine einzige Datei übersetzt wurde. Welches Programm sucht CMake hier?" }, hints: [ { en: "This is a configure-time error, not a compile error: nothing of the firmware has been translated yet.", de: "Das ist ein Fehler beim Konfigurieren, nicht beim Übersetzen: von der Firmware wurde noch nichts übersetzt." }, { en: "Open cmake/arm-none-eabi-gcc.cmake with Ctrl/Cmd+P and read the first 25 lines — they say in which two places the Arm toolchain is looked for.", de: "Öffne cmake/arm-none-eabi-gcc.cmake mit Strg/Cmd+P und lies die ersten 25 Zeilen — sie sagen, an welchen zwei Orten die Arm-Toolchain gesucht wird." }, { en: "The host preset needs none of this. If host builds and itsboard does not, the missing piece is the cross compiler, not your source.", de: "Das Preset host braucht davon nichts. Baut host durch und itsboard nicht, ist der Cross-Compiler das fehlende Stück, nicht dein Quelltext." } ] }
---
## Learning goal

Produce both build products from one source tree: the real firmware image for the board, and the host build that the simulator and the unit tests run on.

## Where you start the build

There is no button anywhere in the window labelled "CaDS: Build". Two routes reach the same result:

- **The convenient one:** scroll down in this panel to the task *The firmware builds for the board* and press **Check**. The tutor starts the build itself and evaluates it. The same goes for the third task and the host build.
- **By hand:** the menu **Terminal → Run Build Task…** (`Ctrl`/`Cmd`+`Shift`+`B`) starts the workspace's default build task — which is exactly **CaDS: Build**. For the host build use **Terminal → Run Task…** and pick **CaDS: Host tests** from the list.

Either route opens the **terminal** at the bottom of the window — the input and output pane where commands run. That is where you look when something fails, and you read the **first** error line: it says what went wrong. The last one only says that it stopped.

## Two presets, one tree

CaDS Zero builds with CMake and Ninja. `CMakePresets.json` defines two configure presets. A *preset* is a named, ready-made build configuration: instead of typing a dozen options, you name it.

- **itsboard** — **cross-compiles** for the STM32F429 with `arm-none-eabi-gcc`, using `cmake/arm-none-eabi-gcc.cmake`. *Cross-compiling* means producing code on one machine for a different kind of processor; here a machine in the data centre builds code for an Arm core that it will never run itself. The **artefacts** — the files a build leaves behind — land in `build/itsboard/`: `cads-zero.elf` (the complete program including symbol and debug information), `.bin` and `.hex` (just the raw bytes as written into flash, in two common wrappings) and `cads-zero.map` (the list of which function ended up where in memory).
- **host** — builds with your system's native compiler: the SDL2 **simulator** (a program that mimics the board on screen so code runs without hardware) and the full **unit test** and **golden image** suite. A *unit test* automatically exercises a single function; a *golden-image test* compares a rendered picture pixel by pixel against a stored reference. No Arm toolchain is needed for this one.

The two together are the project's two **targets** — the platforms the same source is built for.

The rule the whole project rests on: **everything above the HAL builds for both targets.** *HAL* stands for hardware abstraction layer: the thin slice of code that is the only thing touching the chip's registers; everything above it knows nothing about the hardware and therefore runs in the simulator too. M1 goes into detail. A feature that only compiles for one of the two targets is not finished. The host build is not a toy — it runs the same portable code the board runs, and it is where most tests execute.

## Where the compiler comes from

`scripts/build.sh` sources `scripts/cads_env.sh`, which resolves `arm-none-eabi-gcc` from the vcpkg artifact tree that the Keil Studio extension manages, or from `PATH`. You do not install a compiler; the container already carries version 13.3.1. Details are in `docs/explanation/toolchain.md`.

## Reading the size report

Every firmware link prints a memory report. *Linking* is the last stage of a build: the **linker** assembles all translated parts into one memory image and gives every piece its address. It is worth learning to read the report now, because you will watch it for the rest of the course:

```
Memory region         Used Size  Region Size  %age Used
       FLASH_APP:      ...            1 MB       ...
        FLASH_FS:          0 B      896 KB       0.00%
             RAM:      ...          192 KB       ...
             CCM:      ...           64 KB       ...
```

`FLASH_FS` must stay at 0 — anything there would collide with **littlefs**, the small filesystem for flash memory that lives in flash bank 2. The linker also asserts that at least 48 KB of **heap** survives — the region a program takes run-time space from — because lwIP and the GUI do not fit below that. A build that breaks either rule fails to link rather than failing in the field.

## Your task

Run both builds: the one for the board and the one for the host. The checks confirm both succeed and that the board build produced an ELF containing `main`. The next step puts that image onto real silicon.
