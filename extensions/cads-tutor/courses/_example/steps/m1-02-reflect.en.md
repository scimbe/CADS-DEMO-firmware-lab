---
id: m1-02-reflect
title: Reflect
bloom: analyze
objectives: [firmware-safety]
requires: [m1-01-board]
estimatedMinutes: 10
sources:
  - docs/SAFETY.md
links:
  - { doc: "docs/SAFETY.md" }
  - { step: m2-01-command }
  - { file: "apps/desktop/cads_desktop.c" }
tasks:
  - id: reflect
    title: Why must the flash tool never mass-erase this board?
    check:
      type: question
      prompt: { en: "Why must the flash tool never perform a mass erase on the ITSboard?", de: "Warum darf das Flash-Werkzeug auf dem ITSboard nie einen Mass-Erase ausführen?" }
      rubric: "Mentions that a mass erase can clear option bytes / protection or brick the board and that writes must stay inside 0x08000000-0x080FFFFF"
      bloom: analyze
      minChars: 30
  - id: cleanup
    title: The splash text is set and the placeholder is gone
    check:
      type: all
      checks:
        - { type: fileMatches, file: "apps/desktop/cads_desktop.c", pattern: "Hello ITS" }
        - { type: fileNotMatches, file: "apps/desktop/cads_desktop.c", pattern: "TODO_REMOVE_ME" }
  - id: seen
    title: I have read docs/SAFETY.md
    check: { type: manual }
---
# Reflect

Answer the question in your own words. With a configured language model the answer is graded against a rubric;
without one you confirm it yourself.
