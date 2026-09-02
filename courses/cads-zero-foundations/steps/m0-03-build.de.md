---
id: m0-03-build
title: Beide Targets bauen
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
    title: Die Firmware baut für das Board
    check: { type: task, label: "CaDS: Build", expectExitCode: 0 }
  - id: has-main
    title: Der Build hat eine echte ELF erzeugt
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "main" }
  - id: host-build
    title: Derselbe Code baut für den Simulator
    check: { type: task, label: "CaDS: Host tests", expectExitCode: 0 }
socratic:
  - { trigger: "task:build-firmware:failed", question: { en: "The build looks for a compiler before it does anything. Where does it look, and did that resolve to an arm-none-eabi-gcc?", de: "Der Build sucht zuerst einen Compiler. Wo sucht er, und hat das zu einem arm-none-eabi-gcc geführt?" }, hints: [ { en: "scripts/build.sh sources scripts/cads_env.sh, which resolves the Arm toolchain from the vcpkg artifact tree or PATH.", de: "scripts/build.sh bindet scripts/cads_env.sh ein, das die Arm-Toolchain aus dem vcpkg-Artefaktbaum oder von PATH auflöst." }, { en: "Read the first compiler error, not the last line of output — a missing header usually means submodules were not fetched.", de: "Lies die erste Compiler-Fehlermeldung, nicht die letzte Zeile — ein fehlender Header heißt meist, dass Submodule nicht geholt wurden." }, { en: "The container seeds a full checkout with submodules; if a lib/ header is missing, the workspace was not seeded correctly.", de: "Der Container legt einen vollständigen Checkout mit Submodulen an; fehlt ein lib/-Header, wurde der Workspace nicht korrekt initialisiert." } ] }
---
## Lernziel

Erzeuge beide Bauergebnisse aus einem Quellbaum: das echte Firmware-Image für das Board und den Host-Build, auf dem Simulator und Unit-Tests laufen.

## Zwei Presets, ein Baum

CaDS Zero baut mit CMake und Ninja. `CMakePresets.json` definiert zwei Configure-Presets:

- **itsboard** — cross-kompiliert für den STM32F429 mit `arm-none-eabi-gcc` über `cmake/arm-none-eabi-gcc.cmake`. Die Artefakte landen in `build/itsboard/`: `cads-zero.elf`, `.bin`, `.hex` und `cads-zero.map`.
- **host** — baut mit dem nativen Compiler deines Systems: den SDL2-Simulator und die vollständige Unit- und Golden-Image-Testsuite. Hierfür wird keine Arm-Toolchain gebraucht.

Die Regel, auf der das gesamte Projekt ruht: **alles oberhalb der HAL baut für beide Targets.** Ein Feature, das nur für eines kompiliert, ist nicht fertig. Der Host-Build ist kein Spielzeug — er führt denselben portablen Code aus wie das Board und ist der Ort, an dem die meisten Tests laufen.

## Woher der Compiler kommt

`scripts/build.sh` bindet `scripts/cads_env.sh` ein, das `arm-none-eabi-gcc` aus dem vcpkg-Artefaktbaum der Keil-Studio-Erweiterung oder von `PATH` auflöst. Du installierst keinen Compiler; der Container trägt die Version 13.3.1 bereits. Details stehen in `docs/explanation/toolchain.md`.

## Den Größenbericht lesen

Jeder Firmware-Link druckt einen Speicherbericht. Es lohnt sich, ihn jetzt lesen zu lernen, denn du beobachtest ihn den Rest des Kurses:

```
Memory region         Used Size  Region Size  %age Used
       FLASH_APP:      ...            1 MB       ...
        FLASH_FS:          0 B      896 KB       0.00%
             RAM:      ...          192 KB       ...
             CCM:      ...           64 KB       ...
```

`FLASH_FS` muss bei 0 bleiben — alles dort würde mit dem littlefs-Dateisystem in Flash-Bank 2 kollidieren. Der Linker sichert außerdem zu, dass mindestens 48 KB Heap übrig bleiben, weil lwIP und die GUI darunter nicht passen. Ein Build, der eine dieser Regeln bricht, linkt gar nicht erst, statt im Feld zu versagen.

## Deine Aufgabe

Führe den Board-Build (Task **CaDS: Build**) und den Host-Build (Task **CaDS: Host tests**) aus. Die Checks bestätigen, dass beide gelingen und dass der Board-Build eine ELF mit `main` erzeugt hat. Der nächste Step bringt dieses Image auf echtes Silizium.
