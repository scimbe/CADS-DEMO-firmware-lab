---
id: quoted
title: "CaDS: RAM budget"
bloom: apply
objectives: [x]
requires: []
estimatedMinutes: 5
sources: [only.txt]
links:
  - { file: "only.txt" }
  - { doc: "only.txt" }
misconceptions:
  - pattern: 'deep-equal|''b'',\s*''a'''
    question: { en: "Which order?", de: "Welche Reihenfolge?" }
    hints: [{ en: "the expected value comes first", de: "der erwartete Wert steht zuerst" }]
tasks:
  - id: t
    check: { type: command, command: "node --version", expectExitCode: 0 }
---
Body.
