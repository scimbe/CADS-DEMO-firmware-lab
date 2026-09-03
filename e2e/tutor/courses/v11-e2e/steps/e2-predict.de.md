---
id: e2-predict
title: Sage die Ausgabe vorher
bloom: evaluate
scaffold: independent
objectives: [firmware-tooling]
requires: [e1-tests]
estimatedMinutes: 5
recallFrom: [e1-tests]
sources:
  - docs/SAFETY.md
links:
  - { step: e1-tests }
  - { doc: "docs/SAFETY.md" }
tasks:
  - id: guess
    title: Was gibt die Datei aus?
    check:
      type: predict
      prompt:
        en: "The command prints the answer file. Which value will it show, and why?"
        de: "Das Kommando gibt die Antwortdatei aus. Welchen Wert zeigt es, und warum?"
      bloom: evaluate
      then:
        type: command
        command: "cat e2e-answer.txt"
        expectStdout: "ANSWER=42"
---
# Sage die Ausgabe vorher

Write down what you expect before running the check. The check will not run until you have.
