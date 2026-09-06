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
    title: The firmware builds for the board and produces a real ELF
    check: { type: all, checks: [ { type: task, label: "CaDS: Build", expectExitCode: 0 }, { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "main" } ] }
  - id: host-build
    title: The same code builds for the simulator
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
  - id: two-build-dirs
    title: Justify the two build directories
    check: { type: question, prompt: { en: "Why is one build/ directory not enough for both builds? Name the property of the artefacts that forbids it.", de: "Warum genügt ein einziges Verzeichnis build/ nicht für beide Builds? Nenne die Eigenschaft der Artefakte, die das verbietet." }, rubric: "The two builds compile for different processor architectures: the board build with arm-none-eabi-gcc for the Cortex-M4, the host build with the system's own compiler. The object files carry the same names but hold incompatible instruction sets; in a shared directory they would overwrite one another, and the linker would be handed objects that do not fit together. On top of that a build directory holds exactly one CMake cache with exactly one toolchain, so two presets in one directory are excluded for that reason alone. An answer that only cites tidiness or clarity has not named the cause and does not pass.", bloom: understand }
socratic:
  - { trigger: "question:two-build-dirs:weak", question: { en: "What actually sits in those two directories, and which processor is it compiled for?", de: "Was liegt in den beiden Verzeichnissen eigentlich drin, und für welchen Prozessor ist es übersetzt?" }, hints: [ { en: "Do not compare the folder names but what is produced inside them: object files, and a program built from them.", de: "Vergleich nicht die Ordnernamen, sondern das, was darin entsteht: Objektdateien und daraus ein Programm." }, { en: "Look at the two presets in CMakePresets.json and read which compiler each one names.", de: "Sieh dir die zwei Presets in CMakePresets.json an und lies bei jedem, welcher Compiler eingetragen ist." }, { en: "Two object files of the same name for two instruction sets cannot sit in the same place — and a build directory holds exactly one CMake cache.", de: "Zwei Objektdateien gleichen Namens für zwei Befehlssätze können nicht an derselben Stelle liegen — und ein Build-Verzeichnis trägt genau einen CMake-Cache." } ] }
  - { trigger: "task:build-firmware:failed", question: { en: "A build first looks for a compiler, then for every header. Which of the two searches failed in your output?", de: "Ein Build sucht zuerst einen Compiler und dann jede Header-Datei. Welche der beiden Suchen ist in deiner Ausgabe fehlgeschlagen?" }, hints: [ { en: "The first build usually fails on something the build cannot find — the compiler or a header — not on a typo in the code.", de: "Der erste Build scheitert meist an etwas, das er nicht findet — dem Compiler oder einem Header —, nicht an einem Tippfehler im Code." }, { en: "The terminal the task ran in opens at the bottom of the window; scroll up in it to the FIRST red line. The last line only says that it stopped, not why.", de: "Das Terminal, in dem der Task lief, klappt unten im Fenster auf; scroll darin nach oben zur ERSTEN roten Zeile. Die letzte Zeile sagt nur, dass abgebrochen wurde, nicht warum." }, { en: "A message naming a header file points at lib/; a message naming CMAKE_C_COMPILER points at the Arm toolchain. Both are environment problems, not code problems.", de: "Eine Meldung, die eine Header-Datei nennt, zeigt auf lib/; eine Meldung über CMAKE_C_COMPILER zeigt auf die Arm-Toolchain. Beides sind Umgebungsprobleme, keine Codeprobleme." } ] }
  - { trigger: "task:host-build:failed", question: { en: "This task builds and then runs tests. Which of the two stages does your output stop at?", de: "Diese Aufgabe baut und führt danach Tests aus. Bei welcher der beiden Stufen bleibt deine Ausgabe stehen?" }, hints: [ { en: "If the board build worked and this one does not, the Arm toolchain is not the suspect — the host build uses your system's own compiler.", de: "Wenn der Board-Build lief und dieser nicht, ist die Arm-Toolchain nicht der Verdächtige — der Host-Build nimmt den Compiler deines eigenen Systems." }, { en: "Start it by hand without the keyboard: ☰ at the top left, then Terminal, then Run Task..., then pick CaDS: Host tests; the end of the output states how many tests passed and how many failed.", de: "Starte ihn von Hand ohne Tastatur: ☰ oben links, dann Terminal, dann Run Task..., dann CaDS: Host tests wählen; am Ende der Ausgabe steht, wie viele Tests bestanden und wie viele fehlgeschlagen sind." }, { en: "Golden-image tests are deliberately excluded from this task, so a failure here names a real unit test. Read the failing test's name — it points straight at the source file to open.", de: "Golden-Image-Tests sind aus dieser Aufgabe absichtlich ausgeschlossen; ein Fehlschlag nennt hier also einen echten Unit-Test. Lies dessen Namen — er zeigt direkt auf die Quelldatei, die du öffnen solltest." } ] }
---
## Learning goal

Produce both build results from one source tree: the real firmware image for the board, and the host build that runs the simulator and the unit tests.

## Handgrip 1: starting the board build

There is no button in the window labelled `CaDS: Build`.
A **task** is a stored command with a name, and its name is how you reach it.

::: do task="CaDS: Build"
Start the task. Three routes lead to the same result, take one: through the tutor — scroll down in this step text to the task *The firmware builds for the board* and press **Check**; through the command palette — **`F1`**, then type `Tasks: Run Task`, `Enter`, then pick `CaDS: Build` from the list; or without a keyboard through **☰ → `Terminal` → `Run Task...` → `CaDS: Build`**, since there is no visible menu bar and the three-line icon sits at the very top left. The build takes about a minute the first time, seconds afterwards.
> expect: The terminal area opens at the bottom and the task gets its own terminal, named after the task. At the end it holds no red lines but the linker's size report and a prompt back again; the task's check turns green.
> recover: If you see no output at all, you are looking in the wrong window — it is neither in this step text nor in the editor, but at the bottom in the terminal named after the task; `Ctrl`/`Cmd`+`J` opens that area and you pick the terminal on its right-hand side. If the run ends without a size report, you closed the terminal with its cross and killed the process inside it — use `Ctrl`/`Cmd`+`J` to tuck it away instead, and start again. If no input line drops down at all, the browser swallowed the shortcut: use `F1`, or the route through **☰**.
:::

![The menu behind the three-line icon, Terminal expanded, showing New Terminal and Run Task](menu-run-task.png)

![The list of all project tasks, from CaDS: Build to CaDS: RAM budget](task-picker.png)

The compiler's lines scroll past in the task's terminal; all open terminals are listed on the right-hand side of the area. Only what changed is recompiled, which is why every later run is so much shorter. The size report at the end is read in the section after next.

<!-- SHOT: build-terminal-size-report | Das Terminal des Tasks CaDS: Build am Ende eines erfolgreichen Laufs, mit der Tabelle Memory region / Used Size / Region Size und ohne Fehlerzeilen -->

## Handgrip 2: starting the host build

::: do task="CaDS: Host tests"
Start the task the same way as before, only with a different name: **`F1`** → `Tasks: Run Task` → `Enter` → `CaDS: Host tests` from the list. Without a keyboard **☰ → `Terminal` → `Run Task...` → `CaDS: Host tests`**, through the tutor **Check** on the third task.
> expect: This task, too, gets its own terminal at the bottom, named after it. It builds first and runs the tests afterwards; the closing lines state how many tests passed and how many failed.
> recover: If it takes longer than the board build, that is correct — it compiles the test suite as well. If it ends with failed tests, the operating path is not at fault: the lines above name the failing test subject. If no terminal appears at all, the palette never opened — use `F1` instead of the shortcut.
:::

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

Both builds have to succeed, the one for the board (`CaDS: Build`) and the one for the host (`CaDS: Host tests`); the two blocks above carry the routes. The checks confirm that both succeed and that the board build produced an ELF containing `main`. The next step puts that image onto real silicon.
