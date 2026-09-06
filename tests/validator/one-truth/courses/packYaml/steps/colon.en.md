---
id: colon
title: CaDS: RAM budget
bloom: apply
objectives: [x]
requires: []
estimatedMinutes: 5
sources: [only.txt]
links:
  - { file: "only.txt" }
  - { doc: "only.txt" }
tasks:
  - id: t
    check: { type: fileMatches, file: "only.txt", pattern: "x" }
---
Body.
