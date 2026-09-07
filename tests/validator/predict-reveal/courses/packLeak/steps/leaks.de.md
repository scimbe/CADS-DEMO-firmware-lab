---
id: leaks
title: A step that hands out its own answer
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
Write your prediction first. You can also run it yourself:

```bash
wc -l only.txt
```
