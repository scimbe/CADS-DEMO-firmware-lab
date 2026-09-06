---
id: nested
title: Checks the probe used to walk past
bloom: apply
objectives: [x]
requires: []
estimatedMinutes: 5
sources: [seed.txt]
links:
  - { file: "seed.txt" }
  - { doc: "seed.txt" }
tasks:
  - id: predicted
    check:
      type: predict
      prompt: { en: "What will it print?", de: "Was gibt es aus?" }
      rubric: "Names what appeared and one belief that turned out false."
      bloom: evaluate
      then: { type: command, command: "cat made.txt", expectExitCode: 0 }
  - id: both
    check:
      type: all
      checks:
        - { type: command, command: "cat made.txt", expectExitCode: 0 }
        - { type: command, command: "cat made.txt", expectExitCode: 0 }
  - id: either
    check:
      type: any
      checks:
        - { type: command, command: "cat absent.txt", expectExitCode: 0 }
        - { type: command, command: "cat made.txt", expectExitCode: 0 }
---
Body.
