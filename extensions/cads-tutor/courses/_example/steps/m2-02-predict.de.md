---
id: m2-02-predict
title: Erst vorhersagen, dann ausführen
bloom: evaluate
scaffold: faded
objectives: [firmware-tooling]
requires: [m2-01-command]
estimatedMinutes: 15
recallFrom: [m1-02-reflect]
sources:
  - scripts/check_ram_budget.py
links:
  - { step: m2-01-command }
  - { file: "scripts/check_ram_budget.py" }
  - { doc: "docs/SAFETY.md" }
tasks:
  - id: guess-margin
    title: Sage die RAM-Marge vorher und miss sie dann
    check:
      type: predict
      prompt:
        en: "Before running it: is the heap above or below the linker's 48K floor, and roughly by how much? Name the number you expect and why."
        de: "Bevor du es ausführst: liegt der Heap über oder unter der 48K-Untergrenze des Linkers, und ungefähr um wie viel? Nenne die erwartete Zahl und deine Begründung."
      rubric: "The prediction names a direction (above/below the 48K floor) and a rough magnitude, and the reasoning refers to the linker script's ASSERT or the heap size"
      bloom: evaluate
      then:
        type: command
        command: "python3 scripts/check_ram_budget.py build/itsboard/cads-zero.elf"
        expectExitCode: 0
  - id: read-safety
    title: Ich habe gelesen, wie das Flash-Fenster begrenzt ist
    check: { type: manual }
misconceptions:
  - pattern: "No such file or directory"
    question: { en: "The ELF is missing. What has to happen before a size check can run?", de: "Die ELF fehlt. Was muss passieren, bevor ein Größen-Check laufen kann?" }
    hints:
      - { en: "Build the firmware first; the check reads a build artefact.", de: "Baue zuerst die Firmware; der Check liest ein Build-Artefakt." }
---
# Erst vorhersagen, dann ausführen

Dieser Step ist **mit Lücken**: die Vorhersage-Aufgabe ist vorbereitet, die Begründung kommt von dir.

Schreibe auf, was du erwartest, *bevor* das Kommando läuft. Das Panel führt es erst aus, wenn eine
Vorhersage von mindestens zehn Zeichen vorliegt, und stellt danach Vorhersage und tatsächliche Ausgabe
nebeneinander.

Falsch zu liegen kostet hier nichts und ist der Sinn der Übung: der Check besteht, sobald das Kommando
besteht und eine Vorhersage vorliegt. Festgehalten wird, ob dein Modell des Programms zu seinem
Verhalten passte.

Oben in diesem Step kann außerdem eine **Wiederholungskarte** erscheinen, die eine Frage aus
[dem Reflexions-Step](step:m1-02-reflect) noch einmal stellt. Die Antwort ist freiwillig und blockiert
diesen Step nie.
