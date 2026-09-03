---
id: e3-misconception
title: Read what the command actually said
bloom: analyze
scaffold: independent
objectives: [firmware-tooling]
requires: [e2-predict]
estimatedMinutes: 5
sources:
  - docs/SAFETY.md
links:
  - { step: e2-predict }
  - { doc: "docs/SAFETY.md" }
tasks:
  - id: notes
    title: The notes file can be read
    check:
      type: command
      command: "cat e2e-notes.txt"
      expectExitCode: 0
      expectStdout: "ready"
misconceptions:
  - pattern: "No such file or directory"
    question: { en: "The shell could not find the file. Which directory does a command check run in?", de: "Die Shell hat die Datei nicht gefunden. In welchem Verzeichnis läuft ein command-Check?" }
    hints:
      - { en: "A command check runs in the project root, so e2e-notes.txt is expected next to the sources.", de: "Ein command-Check läuft im Projekt-Root, e2e-notes.txt wird also neben den Quellen erwartet." }
      - { en: "Create e2e-notes.txt in the project root with the word ready in it.", de: "Lege e2e-notes.txt im Projekt-Root an, mit dem Wort ready darin." }
---
# Read what the command actually said

This check fails until the notes file exists. The hint you get is chosen from what the command printed,
not from the fact that the task failed.
