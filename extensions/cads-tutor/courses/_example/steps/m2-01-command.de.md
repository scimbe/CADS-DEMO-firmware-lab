---
id: m2-01-command
title: Ein echtes Kommando als Check
bloom: apply
scaffold: worked
objectives: [firmware-tooling]
requires: [m1-02-reflect]
estimatedMinutes: 10
sources:
  - scripts/check_ram_budget.py
links:
  - { step: m2-02-predict }
  - { file: "scripts/check_ram_budget.py" }
  - { doc: "docs/SAFETY.md" }
tasks:
  - id: budget
    title: Der RAM-Budget-Check besteht
    check:
      type: command
      command: "python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf"
      expectExitCode: 0
      expectStdout: "^PASS:"
      timeoutMs: 60000
  - id: files
    title: Die Dateien, auf die dieser Kurs verweist, sind vorhanden
    check:
      type: testSuite
      runner: custom
      command: "for f in docs/SAFETY.md scripts/check_ram_budget.py CMakePresets.json; do if [ -f \"$f\" ]; then echo \"ok - $f present\"; else echo \"not ok - $f present\"; fi; done"
      expectPass: ["docs/SAFETY.md present", "CMakePresets.json present"]
      minPass: 3
misconceptions:
  - pattern: "No such file or directory"
    question: { en: "The command could not find a file. Which working directory does a check run in?", de: "Das Kommando hat eine Datei nicht gefunden. In welchem Arbeitsverzeichnis läuft ein Check?" }
    hints:
      - { en: "A command check runs in the project root, so every path is relative to it.", de: "Ein command-Check läuft im Projekt-Root, alle Pfade sind relativ dazu." }
      - { en: "The ELF is a build artefact. Has the firmware been built yet?", de: "Die ELF ist ein Build-Artefakt. Wurde die Firmware schon gebaut?" }
      - { en: "Run the build task first; the check reads build/itsboard/cads-zero.elf.", de: "Führe zuerst den Build-Task aus; der Check liest build/itsboard/cads-zero.elf." }
socratic:
  - trigger: "output:FAIL:"
    question: { en: "The budget check reports FAIL. What does the margin tell you?", de: "Der Budget-Check meldet FAIL. Was sagt dir die Marge?" }
    hints:
      - { en: "Compare the reported heap size with the linker's floor.", de: "Vergleiche die gemeldete Heap-Größe mit der Untergrenze des Linkers." }
      - { en: "Something you added consumed static RAM. What grew?", de: "Etwas, das du ergänzt hast, belegt statisches RAM. Was ist gewachsen?" }
  - trigger: "test:CMakePresets.json present:failed"
    question: { en: "The preset file is missing. Are you in the right workspace?", de: "Die Preset-Datei fehlt. Bist du im richtigen Workspace?" }
    hints:
      - { en: "project.root of this course points at the cads-zero checkout.", de: "project.root dieses Kurses zeigt auf den cads-zero-Checkout." }
---
# Ein echtes Kommando als Check

Dieser Step ist ein **vorgemachtes Beispiel**: nichts ist ausgelassen, die beiden Checks unten sind
vollständig, du führst sie nur aus.

Der `command`-Check startet `/bin/sh -c` im Projekt-Root. Er besteht, wenn der Exit-Code passt
(`expectExitCode`, Default 0) und – falls angegeben – `expectStdout` bzw. `expectStderr` auf ihrem
jeweiligen Strom matchen:

```yaml
check:
  type: command
  command: "python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf"
  expectExitCode: 0
  expectStdout: "^PASS:"
```

Der `testSuite`-Check wertet einzelne Testergebnisse aus, damit ein Hinweis den gebrochenen Test
benennen kann. Runner `cargo` liest libtests Zeilen `test <name> ... ok`, `node-test` und `tap` lesen
TAP, und `custom` führt ein beliebiges Kommando aus, das TAP ausgibt – genau das tut die zweite Aufgabe.

Was ein Check ausgibt, steht `misconceptions` und `output:`-Triggern zur Verfügung. Zerstöre den
ELF-Pfad absichtlich, und statt eines generischen Hinweises greift das Fehlkonzept
„No such file or directory".
