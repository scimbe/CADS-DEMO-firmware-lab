---
id: m1-01-module-layout
title: The module layout
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
    title: Predict which of the two include directories is private
    check: { type: predict, prompt: { en: "modules/toolbox publishes its API and hides its implementation with one CMake call, target_include_directories. Predict which of its two include directories carries PRIVATE, and say what a dependent library could reach if both carried PUBLIC. Two sentences - the prediction, then the consequence.", de: "modules/toolbox veröffentlicht seine API und verbirgt seine Implementierung mit einem einzigen CMake-Aufruf, target_include_directories. Sage voraus, welches seiner beiden Include-Verzeichnisse PRIVATE trägt, und sag, was eine abhängige Bibliothek erreichen könnte, wenn beide PUBLIC trügen. Zwei Sätze - die Vorhersage, dann die Folge." }, then: { type: command, cwd: ".", command: "grep -n 'PRIVATE .*/src' modules/toolbox/CMakeLists.txt", expectExitCode: 0 }, rubric: "The output shows exactly one line - src/ is registered PRIVATE on the include path. Passes when the answer, after the comparison, names what PRIVATE does: the directory holding the private headers applies only while this library itself is compiled and is not passed on to dependent targets. And what the opposite would cost: with PUBLIC every dependent target could include the private headers from src/, and the boundary would be convention again. Predicting PUBLIC for both and then naming that consequence passes too.", bloom: understand }
  - id: layer-rule
    title: Assurance - no file in gui, apps or services includes stm32f4xx.h
    check: { type: command, cwd: ".", command: "! grep -rq 'stm32f4xx.h' gui apps services", expectExitCode: 0 }
  - id: downward-only
    title: Explain why the host build tolerates the one exception
    check: { type: question, prompt: { en: "modules/storage/src/cads_flash_stm32f4.c includes stm32f4xx.h. Why does that not break the host build? Two sentences - which mechanism selects, and where it stands.", de: "modules/storage/src/cads_flash_stm32f4.c bindet stm32f4xx.h ein. Warum bricht das den Host-Build nicht? Zwei Sätze - welcher Mechanismus auswählt und wo er steht." }, rubric: "States that modules/storage/CMakeLists.txt keeps two source files behind the same public header and picks exactly one of them at configure time: for the cross build (CMAKE_SYSTEM_NAME is Generic) src/cads_flash_stm32f4.c, otherwise src/cads_flash_host.c. The host compiler therefore never sees the register version; the build makes the choice, not an #include in the source. Answering only that there happen to be two files does not name the selecting mechanism.", bloom: understand }
socratic:
  - { trigger: "task:navigated:stuck", question: { en: "Which of the two directories does a dependent target need in order to include the public header - and would it ever need the other one?", de: "Welches der beiden Verzeichnisse braucht ein abhängiges Ziel, um den öffentlichen Header einzubinden - und bräuchte es das andere je?" }, hints: [ { en: "Are you predicting about the folder names, or about who is allowed to see them? Only the second question has an answer in CMake.", de: "Sagst du etwas über die Ordnernamen voraus oder darüber, wer sie sehen darf? Nur die zweite Frage hat in CMake eine Antwort." }, { en: "Open modules/toolbox/CMakeLists.txt with Ctrl/Cmd+P and read target_include_directories; the two keywords stand directly under each other, one per directory.", de: "Öffne modules/toolbox/CMakeLists.txt mit Strg/Cmd+P und lies target_include_directories; die beiden Schlüsselwörter stehen direkt untereinander, eines je Verzeichnis." }, { en: "CMake hands a PUBLIC include directory on to every dependent target and keeps a PRIVATE one to the library itself. What follows for the two directories is yours to say.", de: "CMake reicht ein PUBLIC-Include-Verzeichnis an jedes abhängige Ziel weiter und behält ein PRIVATE-Verzeichnis bei der Bibliothek selbst. Was daraus für die beiden Verzeichnisse folgt, sagst du." } ] }
  - { trigger: "task:layer-rule:failed", question: { en: "Something under gui, apps or services now names the vendor register header. Did an edit of yours add it, or did the check run outside the firmware root?", de: "Irgendetwas unter gui, apps oder services nennt jetzt den Registerheader des Herstellers. Hat eine deiner Änderungen ihn ergänzt, oder lief der Check außerhalb des Firmware-Wurzelverzeichnisses?" }, hints: [ { en: "Does the failure name a file you touched? If the three directories do not exist where the check ran, the answer is the working directory, not the tree.", de: "Nennt der Fehlschlag eine Datei, die du angefasst hast? Existieren die drei Verzeichnisse dort nicht, wo der Check lief, liegt es am Arbeitsverzeichnis, nicht am Baum." }, { en: "Run the search by hand from the firmware root: grep -rn stm32f4xx.h gui apps services names the file and the line.", de: "Führ die Suche von Hand im Wurzelverzeichnis der Firmware aus: grep -rn stm32f4xx.h gui apps services nennt Datei und Zeile." }, { en: "Register code belongs below the HAL - in targets/ or behind an interface in core/. Nothing above it may name a vendor register header.", de: "Registercode gehört unter die HAL - nach targets/ oder hinter eine Schnittstelle in core/. Nichts darüber darf einen Registerheader des Herstellers nennen." } ] }
  - { trigger: "question:downward-only:weak", question: { en: "Look for a second source file in modules/storage that implements the same public header. What separates the two?", de: "Such im Modul storage nach einer zweiten Quelldatei, die denselben öffentlichen Header implementiert. Was unterscheidet die beiden?" }, hints: [ { en: "The commonest wrong turn is to look for the answer in the C file. Is there anything in it that could rule the host out?", de: "Der häufigste Irrweg ist, die Antwort in der C-Datei zu suchen. Steht dort überhaupt etwas, das den Host ausschließen könnte?" }, { en: "Open modules/storage/CMakeLists.txt with Ctrl/Cmd+P and read the block from line 34; it sets one variable to a file name, twice, under different conditions.", de: "Öffne modules/storage/CMakeLists.txt mit Strg/Cmd+P und lies den Block ab Zeile 34; er setzt dieselbe Variable zweimal auf einen Dateinamen, unter verschiedenen Bedingungen." }, { en: "CMAKE_SYSTEM_NAME is Generic in a cross build and carries your operating system's name in a host build. The condition needs to know nothing else.", de: "CMAKE_SYSTEM_NAME hat im Cross-Build den Wert Generic und im Host-Build den Namen deines Betriebssystems. Mehr muss die Bedingung nicht wissen." } ] }
---
## Learning goal

Read the firmware's tree as a **dependency graph** — a picture of who uses whom — and understand why the boundaries between the parts are enforced by the build rather than by convention.

## Where you work in this step

The fastest way to open a file is `Ctrl`/`Cmd`+`P` and typing its name. The first task at the bottom of this panel is a **prediction**: you write down what you expect, and only then does **Check** run the search that compares it against the real tree. The second task is not a task for you but an **assurance** about the repository — it passes for as long as the layering rule holds in the tree, and it is green today without your doing anything. The line numbers from the comparison are the actual yield — they tell you where to jump in the editor.

## Libraries, not a blob

CaDS Zero is built as a set of independent CMake **libraries**. A library is a bundle of compiled source files that is later attached to the program as a whole; that attaching is called **linking**. Each library has a declared **public API** — the set of functions and types others are allowed to use. It becomes visible through `#include`, the line with which a C file pulls in a header file and thereby says which foreign names it wants to know.

The top-level `CMakeLists.txt` adds the libraries in dependency order: `modules/toolbox`, `modules/storage`, `modules/config`, `modules/net`, `modules/cli`, `modules/diag`, the kernel (board only), then the portable GUI layer (`gui/`), the services (`services/`), the apps under `apps/`, and finally one target directory — `targets/itsboard` or `targets/sim`.

The layout of one module is fixed (`docs/reference/module-layout.md`):

```
modules/<name>/
  include/cads/<name>/*.h    public API, the only thing dependents may include
  src/*.c *.h                implementation, private headers live here
  tests/*.c                  host unit tests, run by ctest
  README.md                  what, why, how, limits
  CMakeLists.txt
```

The include path is `cads/<name>/...` rather than a bare filename, so an `#include` says where a type comes from.

## The rule the build enforces

Dependencies point **downwards only**, and the graph is **acyclic**: no path leads over several arrows back to where it started.

```
        apps/            desktop, menu, tools
          │
        gui/             views, widgets, compositor
          │
   canvas ─┴─ input ─ storage ─ net        feature modules
     └─────────┴────┬────┴────────┘
                 hal_api            the interface, no implementation
        ┌───────────┴───────────┐
   targets/itsboard        targets/sim
```

A feature module never includes a target header. `hal_api` is **headers only**, which is what lets the same **object files** link against either **backend**. An object file is the intermediate result for exactly one compiled C file; a backend here is one of the two interchangeable substructures `targets/itsboard` and `targets/sim`.

The mechanism is one CMake keyword: a module's `src/` is registered as a `PRIVATE` include directory. In CMake, `PRIVATE` means "applies only while compiling this module itself", as opposed to `PUBLIC`: "applies to everyone who uses me as well". A module's own headers are therefore unreachable from outside, and the public header stays the only way in.

That is the line the first task's comparison reveals. The second task is the counter-test and no achievement of yours: in `gui/`, `apps/` and `services/` not a single file includes the chip vendor's register header `stm32f4xx.h`. As long as both hold, the rule holds not only in the diagram but in the real tree.

## Why it costs to ignore this

Three reasons, in order of how much they cost when ignored:

1. **The simulator.** Everything above the HAL must build for the host as well as the board. That only stays true if hardware dependence is confined to one module with a declared interface, not diffused through `#include "stm32f4xx.h"` in whatever file needed a register.
2. **Parallel work.** A module with a narrow public header can be implemented, reviewed and merged without reading the rest of the tree.
3. **Reuse.** The canvas, the font renderer and the toolbox are not specific to this firmware.

The inventory in the reference marks which modules are reusable beyond this project (`toolbox` entirely, `canvas` for any indexed framebuffer, `net` not at all) and what each depends on.

## The one file that appears to break ranks

Exactly one source file below `modules/` does include the register header `stm32f4xx.h`: `modules/storage/src/cads_flash_stm32f4.c`, the driver for the chip's internal flash memory. `modules/storage` nevertheless builds for the host too, and the host compiler never gets to see that file.

How that works is not written in the C file. It is written in `modules/storage/CMakeLists.txt` — reading it there is your second task.

## Your task

1. Write down your prediction on the first task, press **Check**, and then open, with `Ctrl`/`Cmd`+`P`, the file whose line appears in the output (`modules/toolbox/CMakeLists.txt`). Look at `PUBLIC` and `PRIVATE` side by side there, and in the explorer (`Ctrl`/`Cmd`+`Shift`+`E`) at the public `modules/toolbox/include/cads/toolbox/`, the private `modules/toolbox/src/` and the module README.
2. Then open `modules/storage/CMakeLists.txt` and answer why the host build tolerates the file from the previous section.

The next step looks at the boundary itself.
