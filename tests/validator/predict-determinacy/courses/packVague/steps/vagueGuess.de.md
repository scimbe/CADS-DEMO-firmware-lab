---
id: vagueGuess
title: A prediction whose reveal decides nothing
bloom: analyze
objectives: [x]
requires: []
estimatedMinutes: 5
tasks:
  - id: guess
    check:
      type: predict
      prompt: { en: "What happens when it runs?", de: "Was passiert beim Ausfuehren?" }
      rubric: "Names the outcome."
      bloom: analyze
      then: { type: command, command: "true", seedMustFail: false, expectExitCode: 0 }
---
Write your prediction, then press the button.
