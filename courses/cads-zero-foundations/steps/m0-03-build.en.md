---
id: m0-03-build
title: Build both targets
bloom: apply
objectives: [firmware-how-to-build]
requires: [m0-02-connect]
estimatedMinutes: 15
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
  - { trigger: "task:build-firmware:failed", question: { en: "The build looks for a compiler before it does anything. Where does it look, and did that resolve to an arm-none-eabi-gcc?", de: "Der Build sucht zuerst einen Compiler. Wo sucht er, und hat das zu einem arm-none-eabi-gcc geführt?" }, hints: [ { en: "scripts/build.sh sources scripts/cads_env.sh, which resolves the Arm toolchain from the vcpkg artifact tree or PATH.", de: "scripts/build.sh bindet scripts/cads_env.sh ein, das die Arm-Toolchain aus dem vcpkg-Artefaktbaum oder von PATH auflöst." }, { en: "Read the first compiler error, not the last line of output — a missing header usually means submodules were not fetched.", de: "Lies die erste Compiler-Fehlermeldung, nicht die letzte Zeile — ein fehlender Header heißt meist, dass Submodule nicht geholt wurden." }, { en: "The container seeds a full checkout with submodules; if a lib/ header is missing, the workspace was not seeded correctly.", de: "Der Container legt einen vollständigen Checkout mit Submodulen an; fehlt ein lib/-Header, wurde der Workspace nicht korrekt initialisiert." } ] }
---
## Learning goal

Produce both build products from one source tree: the real firmware image for the board, and the host build that the simulator and the unit tests run on.

## Two presets, one tree

CaDS Zero builds with CMake and Ninja. `CMakePresets.json` defines two configure presets:

- **itsboard** — cross-compiles for the STM32F429 with `arm-none-eabi-gcc`, using `cmake/arm-none-eabi-gcc.cmake`. Artefacts land in `build/itsboard/`: `cads-zero.elf`, `.bin`, `.hex` and `cads-zero.map`.
- **host** — builds with your system's native compiler: the SDL2 simulator and the full unit and golden-image test suite. No Arm toolchain is needed for this one.

The rule the whole project rests on: **everything above the HAL builds for both targets.** A feature that only compiles for one of them is not finished. The host build is not a toy — it runs the same portable code the board runs, and it is where most tests execute.

## Where the compiler comes from

`scripts/build.sh` sources `scripts/cads_env.sh`, which resolves `arm-none-eabi-gcc` from the vcpkg artifact tree that the Keil Studio extension manages, or from `PATH`. You do not install a compiler; the container already carries version 13.3.1. Details are in `docs/explanation/toolchain.md`.

## Reading the size report

Every firmware link prints a memory report. It is worth learning to read now, because you will watch it for the rest of the course:

```
Memory region         Used Size  Region Size  %age Used
       FLASH_APP:      ...            1 MB       ...
        FLASH_FS:          0 B      896 KB       0.00%
             RAM:      ...          192 KB       ...
             CCM:      ...           64 KB       ...
```

`FLASH_FS` must stay at 0 — anything there would collide with the littlefs filesystem in flash bank 2. The linker also asserts that at least 48 KB of heap survives, because lwIP and the GUI do not fit below that. A build that breaks either rule fails to link rather than failing in the field.

## Your task

Run the board build (task **CaDS: Build**) and the host build (task **CaDS: Host tests**). The checks confirm both succeed and that the board build produced an ELF containing `main`. The next step puts that image onto real silicon.
