---
id: m0-02-build
title: Firmware bauen
bloom: apply
objectives: [firmware-how-to-build]
requires: [m0-01-welcome]
estimatedMinutes: 15
links:
  - { doc: "docs/how-to/build.md" }
  - { file: "CMakePresets.json" }
tasks:
  - id: build
    title: "Die Firmware baut (Task „CaDS: Build“)"
    check: { type: task, label: "CaDS: Build", expectExitCode: 0, timeoutMs: 600000 }
  - id: preset
    title: Build über CMake-Preset
    check: { type: build, preset: itsboard }
  - id: symbol
    title: main ist im ELF
    check: { type: symbolInElf, elf: "build/itsboard/cads-zero.elf", symbol: "main" }
socratic:
  - trigger: "task:build:failed"
    question: { en: "What does the first error line of the build output name – a file, a symbol, or a tool?", de: "Was nennt die erste Fehlerzeile der Build-Ausgabe – eine Datei, ein Symbol oder ein Werkzeug?" }
    hints:
      - { en: "Scroll to the FIRST error in the terminal; later ones are usually consequences.", de: "Scrolle zum ERSTEN Fehler im Terminal; spätere sind meist Folgefehler." }
      - { en: "If the toolchain is missing, cmake says so in the configure step – check CADS_ARM_TOOLCHAIN_BIN.", de: "Fehlt die Toolchain, sagt cmake das im Configure-Schritt – prüfe CADS_ARM_TOOLCHAIN_BIN." }
      - { en: "A syntax error in your edited file? Undo it and rebuild to isolate the cause.", de: "Syntaxfehler in deiner geänderten Datei? Mach die Änderung rückgängig und baue neu, um die Ursache einzugrenzen." }
---
# Firmware bauen

Starte den Build-Task (**Terminal → Run Build Task** oder der *Prüfen*-Button der ersten Aufgabe, der den Task für dich ausführt).

Das Ergebnis ist `build/itsboard/cads-zero.elf` – der Tutor prüft, dass das ELF `main` enthält.
