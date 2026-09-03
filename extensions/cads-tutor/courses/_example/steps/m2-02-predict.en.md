---
id: m2-02-predict
title: Predict before you run
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
    title: Predict the RAM margin, then measure it
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
    title: I have read how the flash window is bounded
    check: { type: manual }
misconceptions:
  - pattern: "No such file or directory"
    question: { en: "The ELF is missing. What has to happen before a size check can run?", de: "Die ELF fehlt. Was muss passieren, bevor ein Größen-Check laufen kann?" }
    hints:
      - { en: "Build the firmware first; the check reads a build artefact.", de: "Baue zuerst die Firmware; der Check liest ein Build-Artefakt." }
---
# Predict before you run

This step is **guided**: the prediction task is set up for you, the reasoning is yours.

Write down what you expect *before* the command runs. The panel will not run it until a prediction of
at least ten characters exists, and it then shows your prediction and the real output side by side.

Being wrong here costs nothing and is the point: the check passes as long as the command passes and a
prediction exists. What gets recorded is whether your model of the program matched what it did.

You may also see a **recall** card at the top of this step, repeating a question from
[the reflection step](step:m1-02-reflect). Answering it is optional and never blocks this step.
