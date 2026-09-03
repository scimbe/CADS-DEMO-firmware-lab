---
id: e1-tests
title: Make the test suite green
bloom: apply
scaffold: faded
objectives: [firmware-tooling]
requires: []
estimatedMinutes: 5
sources:
  - docs/SAFETY.md
links:
  - { step: e2-predict }
  - { doc: "docs/SAFETY.md" }
tasks:
  - id: suite
    title: The answer file says 42
    check:
      type: testSuite
      runner: custom
      command: "if grep -q '^ANSWER=42$' e2e-answer.txt 2>/dev/null; then echo 'ok - answer is 42'; else echo 'not ok - answer is 42'; fi; if [ -f e2e-answer.txt ]; then echo 'ok - answer file exists'; else echo 'not ok - answer file exists'; fi"
      expectPass: ["answer is 42"]
      minPass: 2
  - id: why
    title: Why is a check that always passes worthless?
    check:
      type: question
      prompt: { en: "Why is a check that passes without any work worthless?", de: "Warum ist ein Check wertlos, der ohne jede Arbeit besteht?" }
      rubric: "Mentions that such a check cannot distinguish a solved exercise from an unsolved one"
      bloom: analyze
      minChars: 20
misconceptions:
  - pattern: "not ok - answer is 42"
    question: { en: "The value in the file is not the one the test wants. Which exact line does the test look for?", de: "Der Wert in der Datei ist nicht der, den der Test erwartet. Nach welcher Zeile sucht der Test genau?" }
    hints:
      - { en: "The test greps for a whole line reading ANSWER=42.", de: "Der Test sucht nach einer ganzen Zeile ANSWER=42." }
      - { en: "Open e2e-answer.txt and set ANSWER to 42.", de: "Öffne e2e-answer.txt und setze ANSWER auf 42." }
socratic:
  - trigger: "test:answer is 42:failed"
    question: { en: "That one test is red. What is in the file right now?", de: "Genau dieser eine Test ist rot. Was steht gerade in der Datei?" }
    hints:
      - { en: "Compare the file's line with the pattern the test greps for.", de: "Vergleiche die Zeile in der Datei mit dem Muster, nach dem der Test greppt." }
---
# Make the test suite green

The file `e2e-answer.txt` in the project root holds the wrong value. Run the check, read the hint, fix the
file, and run it again.
