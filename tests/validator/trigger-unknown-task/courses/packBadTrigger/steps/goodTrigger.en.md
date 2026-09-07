---
id: goodTrigger
title: A step whose trigger names its own task
bloom: analyze
objectives: [x]
requires: []
estimatedMinutes: 5
tasks:
  - id: real
    check: { type: command, command: "true", expectExitCode: 0 }
socratic:
  - { trigger: "task:real:failed", question: { en: "Q", de: "F" }, hints: [ {en: "h1", de: "h1"}, {en: "h2", de: "h2"}, {en: "h3", de: "h3"} ] }
---
Body text.
