---
id: m1-02-reflect
title: Reflexion
bloom: analyze
objectives: [firmware-safety]
requires: [m1-01-board]
estimatedMinutes: 10
links:
  - { doc: "docs/SAFETY.md" }
tasks:
  - id: reflect
    title: Warum darf das Flash-Werkzeug dieses Board nie komplett löschen?
    check:
      type: question
      prompt: { en: "Why must the flash tool never perform a mass erase on the ITSboard?", de: "Warum darf das Flash-Werkzeug auf dem ITSboard nie einen Mass-Erase ausführen?" }
      rubric: "Mentions that a mass erase can clear option bytes / protection or brick the board and that writes must stay inside 0x08000000-0x080FFFFF"
      bloom: analyze
      minChars: 30
  - id: cleanup
    title: Der Splash-Text ist gesetzt und der Platzhalter ist weg
    check:
      type: all
      checks:
        - { type: fileMatches, file: "apps/desktop/cads_desktop.c", pattern: "Hello ITS" }
        - { type: fileNotMatches, file: "apps/desktop/cads_desktop.c", pattern: "TODO_REMOVE_ME" }
  - id: seen
    title: Ich habe docs/SAFETY.md gelesen
    check: { type: manual }
---
# Reflexion

Beantworte die Frage in eigenen Worten. Mit konfiguriertem Sprachmodell wird die Antwort gegen eine Rubrik bewertet;
ohne bestätigst du sie selbst.
