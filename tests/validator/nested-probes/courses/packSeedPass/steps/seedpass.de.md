---
id: seedpass
title: A nested check that never needed the student
bloom: apply
objectives: [x]
requires: []
estimatedMinutes: 5
sources: [seed.txt]
links:
  - { file: "seed.txt" }
  - { doc: "seed.txt" }
tasks:
  - id: worthless
    check:
      type: all
      checks:
        - { type: command, command: "cat seed.txt", expectExitCode: 0 }
        - { type: command, command: "cat seed.txt", expectExitCode: 0 }
  - id: mixed
    check:
      type: all
      checks:
        - { type: command, command: "cat made.txt", expectExitCode: 0 }
        - { type: command, command: "cat seed.txt", expectExitCode: 0 }
---
Body.
