---
id: keeps
title: A step that keeps its answer
bloom: analyze
objectives: [x]
requires: []
estimatedMinutes: 5
sources: [only.txt]
links:
  - { file: "only.txt" }
  - { doc: "only.txt" }
tasks:
  - id: guess
    check:
      type: predict
      prompt: { en: "How many lines does it print?", de: "Wie viele Zeilen gibt es aus?" }
      rubric: "Names a number and where the number came from."
      bloom: analyze
      then: { type: command, command: "wc -l only.txt", seedMustFail: false, expectExitCode: 0, expectStdout: "^\\d+$" }
---
The file is `only.txt`. Count its lines in your head, write the number down, then
press the button on the task - naming the file is not naming the command.
