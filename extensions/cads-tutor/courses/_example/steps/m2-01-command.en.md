---
id: m2-01-command
title: Run a real command as a check
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
    title: The RAM budget check passes
    check:
      type: command
      command: "python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf"
      expectExitCode: 0
      expectStdout: "^PASS:"
      timeoutMs: 60000
  - id: files
    title: The files this course refers to are present
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
# Run a real command as a check

This step is a **worked example**: nothing is hidden, the two checks below are complete and you only
have to run them.

The `command` check runs `/bin/sh -c` in the project root. It passes when the exit code matches
(`expectExitCode`, default 0) and, when given, `expectStdout` and `expectStderr` match their stream:

```yaml
check:
  type: command
  command: "python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf"
  expectExitCode: 0
  expectStdout: "^PASS:"
```

The `testSuite` check parses per-test results, so a hint can name the test that broke. Runner `cargo`
reads libtest's `test <name> ... ok` lines, `node-test` and `tap` read TAP, and `custom` runs any
command that prints TAP - which is what the second task does here.

Whatever a check prints is available to `misconceptions` and to `output:` triggers. Break the ELF path
on purpose and the "No such file or directory" misconception fires instead of a generic hint.
