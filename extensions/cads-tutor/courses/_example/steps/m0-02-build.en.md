---
id: m0-02-build
title: Build the firmware
bloom: apply
objectives: [firmware-how-to-build]
requires: [m0-01-welcome]
estimatedMinutes: 15
links:
  - { doc: "docs/how-to/build.md" }
  - { file: "CMakePresets.json" }
tasks:
  - id: build
    title: 'The firmware builds (task "CaDS: Build")'
    check: { type: task, label: "CaDS: Build", expectExitCode: 0, timeoutMs: 600000 }
  - id: preset
    title: Build via CMake preset
    check: { type: build, preset: itsboard }
  - id: symbol
    title: main is in the ELF
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "main" }
socratic:
  - trigger: "task:build:failed"
    question: { en: "What does the first error line of the build output name – a file, a symbol, or a tool?", de: "Was nennt die erste Fehlerzeile der Build-Ausgabe – eine Datei, ein Symbol oder ein Werkzeug?" }
    hints:
      - { en: "Scroll to the FIRST error in the terminal; later ones are usually consequences.", de: "Scrolle zum ERSTEN Fehler im Terminal; spätere sind meist Folgefehler." }
      - { en: "If the toolchain is missing, cmake says so in the configure step – check CADS_ARM_TOOLCHAIN_BIN.", de: "Fehlt die Toolchain, sagt cmake das im Configure-Schritt – prüfe CADS_ARM_TOOLCHAIN_BIN." }
      - { en: "A syntax error in your edited file? Undo it and rebuild to isolate the cause.", de: "Syntaxfehler in deiner geänderten Datei? Mach die Änderung rückgängig und baue neu, um die Ursache einzugrenzen." }
---
# Build the firmware

Run the build task (**Terminal → Run Build Task**, or the *Check* button of the first task, which runs the task for you).

The result is `build/itsboard/cads-zero.elf` – the tutor verifies that the ELF contains `main`.
