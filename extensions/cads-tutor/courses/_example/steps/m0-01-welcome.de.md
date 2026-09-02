---
id: m0-01-welcome
title: Willkommen – Orientierung
bloom: remember
objectives: [firmware-how-to-vscode-setup, example.orientation]
requires: []
estimatedMinutes: 10
links:
  - { step: m0-02-build }
  - { file: "apps/desktop/cads_desktop.c", line: 1, title: "Quelltext der Desktop-App" }
  - { doc: "docs/HARDWARE.md" }
  - { url: "https://github.com/scimbe/cads-zero", title: "cads-zero auf GitHub" }
tasks:
  - id: readme
    title: Der Workspace ist das cads-zero-Repository
    check: { type: fileMatches, file: "README.md", pattern: "cads-zero|CaDS Zero", flags: "i" }
  - id: hello
    title: Ändere den Splash-Text zu „Hello ITS“
    description: Öffne apps/desktop/cads_desktop.c und schreibe die Zeichenkette "Hello ITS" hinein (vorerst reicht ein Kommentar).
    check: { type: fileMatches, file: "apps/desktop/cads_desktop.c", pattern: "Hello ITS" }
socratic:
  - trigger: "task:hello:failed"
    question: { en: "Which file draws the splash screen, and where does its text come from?", de: "Welche Datei zeichnet den Splash-Screen, und woher kommt ihr Text?" }
    hints:
      - { en: "The check looks into apps/desktop/cads_desktop.c – open it via the link above.", de: "Der Check schaut in apps/desktop/cads_desktop.c – öffne die Datei über den Link oben." }
      - { en: "The pattern is case-sensitive: Hello ITS, with a capital H and ITS in capitals.", de: "Das Muster unterscheidet Groß-/Kleinschreibung: Hello ITS, großes H und ITS in Großbuchstaben." }
      - { en: "Save the file (Ctrl/Cmd+S) – the check re-runs on save.", de: "Datei speichern (Strg/Cmd+S) – der Check läuft beim Speichern erneut." }
---
# Willkommen im CaDS Firmware Lab

Diese Browser-IDE enthält die Firmware **CaDS Zero** für das ITSboard (STM32F429ZI).
Der Tutor führt dich Schritt für Schritt; jeder Step hat Aufgaben, die automatisch geprüft werden.

![Browser → ST-Link → MCU](diagram.svg)

## Was du in diesem Step tust

1. Bestätigen, dass der Workspace das Firmware-Repository ist (wird automatisch geprüft).
2. Deine erste Änderung: schreibe den Text `Hello ITS` in den Quelltext der Desktop-App.

> Tipp: Datei-Links wie [apps/desktop/cads_desktop.c](file:apps/desktop/cads_desktop.c#L1) öffnen den Editor an der Zeile;
> [docs/HARDWARE.md](doc:docs/HARDWARE.md) öffnet Dokumentation; [Nächster Step](step:m0-02-build) springt zu einem anderen Step.

```c
/* Hello ITS – deine erste Änderung */
```
