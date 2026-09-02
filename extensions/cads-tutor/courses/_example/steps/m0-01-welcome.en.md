---
id: m0-01-welcome
title: Welcome – find your way around
bloom: remember
objectives: [firmware-how-to-vscode-setup, example.orientation]
requires: []
estimatedMinutes: 10
links:
  - { step: m0-02-build }
  - { file: "apps/desktop/cads_desktop.c", line: 1, title: "Desktop app source" }
  - { doc: "docs/HARDWARE.md" }
  - { url: "https://github.com/scimbe/cads-zero", title: "cads-zero on GitHub" }
tasks:
  - id: readme
    title: The workspace is the cads-zero repository
    check: { type: fileMatches, file: "README.md", pattern: "cads-zero|CaDS Zero", flags: "i" }
  - id: hello
    title: Change the splash text to "Hello ITS"
    description: Open apps/desktop/cads_desktop.c and put the string "Hello ITS" somewhere in it (a comment is fine for now).
    check: { type: fileMatches, file: "apps/desktop/cads_desktop.c", pattern: "Hello ITS" }
socratic:
  - trigger: "task:hello:failed"
    question: { en: "Which file draws the splash screen, and where does its text come from?", de: "Welche Datei zeichnet den Splash-Screen, und woher kommt ihr Text?" }
    hints:
      - { en: "The check looks into apps/desktop/cads_desktop.c – open it via the link above.", de: "Der Check schaut in apps/desktop/cads_desktop.c – öffne die Datei über den Link oben." }
      - { en: "The pattern is case-sensitive: Hello ITS, with a capital H and ITS in capitals.", de: "Das Muster unterscheidet Groß-/Kleinschreibung: Hello ITS, großes H und ITS in Großbuchstaben." }
      - { en: "Save the file (Ctrl/Cmd+S) – the check re-runs on save.", de: "Datei speichern (Strg/Cmd+S) – der Check läuft beim Speichern erneut." }
---
# Welcome to the CaDS Firmware Lab

This browser IDE contains the **CaDS Zero** firmware for the ITSboard (STM32F429ZI).
The tutor guides you step by step; each step has tasks that are checked automatically.

![Browser → ST-Link → MCU](diagram.svg)

## What you will do in this step

1. Confirm that the workspace is the firmware repository (checked automatically).
2. Make your first edit: put the text `Hello ITS` into the desktop app source.

> Tip: file links like [apps/desktop/cads_desktop.c](file:apps/desktop/cads_desktop.c#L1) open the editor at that line;
> [docs/HARDWARE.md](doc:docs/HARDWARE.md) opens documentation; [Next step](step:m0-02-build) jumps to another step.

```c
/* Hello ITS – your first edit */
```
