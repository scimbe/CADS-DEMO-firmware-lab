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
  - { trigger: "task:host-build:failed", question: { en: "This task builds and then runs tests. Which of the two stages does your output stop at?", de: "Diese Aufgabe baut und führt danach Tests aus. Bei welcher der beiden Stufen bleibt deine Ausgabe stehen?" }, hints: [ { en: "If the board build worked and this one does not, the Arm toolchain is not the suspect — the host build uses your system's own compiler.", de: "Wenn der Board-Build lief und dieser nicht, ist die Arm-Toolchain nicht der Verdächtige — der Host-Build nimmt den Compiler deines eigenen Systems." }, { en: "Start it by hand without the keyboard: ☰ at the top left, then Terminal, then Run Task..., then pick CaDS: Host tests; the end of the output states how many tests passed and how many failed.", de: "Starte ihn von Hand ohne Tastatur: ☰ oben links, dann Terminal, dann Run Task..., dann CaDS: Host tests wählen; am Ende der Ausgabe steht, wie viele Tests bestanden und wie viele fehlgeschlagen sind." }, { en: "Golden-image tests are deliberately excluded from this task, so a failure here names a real unit test. Read the failing test's name — it points straight at the source file to open.", de: "Golden-Image-Tests sind aus dieser Aufgabe absichtlich ausgeschlossen; ein Fehlschlag nennt hier also einen echten Unit-Test. Lies dessen Namen — er zeigt direkt auf die Quelldatei, die du öffnen solltest." } ] }
---
## Learning goal

Produce both build results from one source tree: the real firmware image for the board, and the host build that runs the simulator and the unit tests.

## Handgrip 1: starting the board build

There is no button in the window labelled `CaDS: Build`. A **task** is a stored command with a name; you start it by that name. Three routes lead to the same result, take one:

- **Through the tutor:** scroll down in this step text to the task *The firmware builds for the board* and press **Check**. The tutor starts the task itself and judges its exit code.
- **Through the command palette:** press **`F1`** (the shortcut `Ctrl`/`Cmd`+`Shift`+`P` does the same, but a browser often swallows it), then type:

```
Tasks: Run Task
```

`Enter`, then pick `CaDS: Build` from the list.

- **Without a keyboard:** there is no visible menu bar; the menus hide behind the three-line icon (**☰**) at the very top left. Click it, then **`Terminal`**, then **`Run Task...`**, then `CaDS: Build`.

![The menu behind the three-line icon, Terminal expanded, showing New Terminal and Run Task](menu-run-task.png)

![The list of all project tasks, from CaDS: Build to CaDS: RAM budget](task-picker.png)

**What you see:** the terminal area opens at the bottom, and the task gets **its own terminal, named after the task**. The compiler's lines scroll past in it. `Ctrl`/`Cmd`+`J` opens and closes that area; all open terminals are listed on its right-hand side.

**How long:** about a minute the first time, seconds afterwards, because only what changed is recompiled.

**How you know it worked:** no red lines, the linker's size report at the end (explained below), and a prompt back again. The task's check turns green.

<!-- SHOT: build-terminal-size-report | Das Terminal des Tasks CaDS: Build am Ende eines erfolgreichen Laufs, mit der Tabelle Memory region / Used Size / Region Size und ohne Fehlerzeilen -->

## Handgrip 2: starting the host build

Same route, different name: **`F1`** → `Tasks: Run Task` → `Enter` → from the list

```
CaDS: Host tests
```

Without a keyboard: **☰ → `Terminal` → `Run Task...` → `CaDS: Host tests`**. Or through the tutor: **Check** on the third task.

This task, too, gets its own terminal at the bottom. It builds first and runs the tests afterwards, so the first run takes longer than the board build. It is finished when no new lines appear; the closing lines state how many tests passed and how many failed.

## Three operating mistakes right here

- **The task ran, but you look for its output in the wrong window.** It is *not* in this step text and *not* in the editor, but at the bottom, in the terminal named after the task. `Ctrl`/`Cmd`+`J` opens the area; pick the right terminal on the right.
- **You closed the terminal and thereby aborted the build.** The cross on a terminal kills the process inside it — halfway through that minute this means nothing finished and no ELF. To tuck it away use `Ctrl`/`Cmd`+`J`, which leaves the build running.
- **The keyboard shortcut for the palette does nothing.** The browser swallowed it. Use `F1`, or the route through **☰**.

## Two presets, one tree

CaDS Zero builds with CMake and Ninja. `CMakePresets.json` defines two configure presets. A *preset* is a named, ready-made build configuration: instead of typing a dozen options you name it.

- **itsboard** — **cross-compiles** for the STM32F429 with `arm-none-eabi-gcc`. *Cross-compiling* means producing code on one machine for a different kind of processor. The **artefacts** — the files a build leaves behind — land in `build/itsboard/`: `cads-zero.elf` (the program including symbol and debug information), `.bin` and `.hex` (the raw bytes for the flash), and `cads-zero.map` (which function ended up where).
- **host** — builds, with your system's own compiler, the SDL2 **simulator** (which mimics the board on screen) and the **unit tests**: automatic checks of individual functions. This route needs no Arm toolchain.

The rule the whole project rests on: **everything above the HAL builds for both targets.** *HAL* stands for hardware abstraction layer, the thin sheet of code that alone touches the chip's registers; everything above it knows nothing of the hardware and therefore also runs in the simulator. M1 goes into detail. A feature that compiles for only one of the two targets is not finished.

You install no compiler: the container already carries `arm-none-eabi-gcc` 13.3.1, and `scripts/cads_env.sh` resolves it (`docs/explanation/toolchain.md`).

## Reading the size report

Every firmware link prints a memory report. *Linking* is a build's last step: the **linker** assembles the translated pieces into one memory image and gives each piece its address.

```
Memory region         Used Size  Region Size  %age Used
       FLASH_APP:      ...            1 MB       ...
        FLASH_FS:          0 B      896 KB       0.00%
             RAM:      ...          192 KB       ...
             CCM:      ...           64 KB       ...
```

`FLASH_FS` must stay at 0 — anything there collides with **littlefs**, the file system in flash bank 2. The linker also reserves 48 KB of **heap**, the area a program takes run-time space from; below that, lwIP and the GUI do not fit. A build that breaks either rule does not link at all.

## When the build stops

Read the **first** red line in the terminal, not the last: the last one only says that it stopped. Two messages are the most common, and neither is your code's fault. `fatal error: ... No such file or directory` names a header that comes from `lib/` — if one of the folders there is empty, the workspace was not seeded completely; say so in the lab and name the empty folder. `is not a full path and was not found in the PATH` arrives while configuring and means the cross compiler, not your source; the host build still works in that case.

## Your task

Run both builds, the one for the board (`CaDS: Build`) and the one for the host (`CaDS: Host tests`), each on one of the three routes above. The checks confirm that both succeed and that the board build produced an ELF containing `main`. The next step puts that image onto real silicon.
