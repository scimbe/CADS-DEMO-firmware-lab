---
id: answerLeak
title: A step that prints the literal answer
bloom: analyze
objectives: [x]
requires: []
estimatedMinutes: 5
tasks:
  - id: guess
    check:
      type: predict
      prompt: { en: "What does the program print?", de: "Was gibt das Programm aus?" }
      rubric: "Names the printed word."
      bloom: analyze
      then: { type: command, command: "printf boots", seedMustFail: false, expectExitCode: 0, expectStdout: "boots" }
---
Write your prediction first. For the record, the program prints boots when it runs.
