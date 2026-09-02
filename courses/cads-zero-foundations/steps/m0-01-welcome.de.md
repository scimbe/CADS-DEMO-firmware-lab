---
id: m0-01-welcome
title: Willkommen im CaDS-Firmware-Labor
bloom: remember
objectives: [firmware-hardware]
requires: []
estimatedMinutes: 10
links:
  - { step: m0-02-connect }
  - { doc: "docs/HARDWARE.md" }
  - { doc: "docs/ROADMAP.md" }
sources: [README.md, docs/HARDWARE.md, docs/ROADMAP.md]
tasks:
  - id: opened
    title: Du hast den Tutor geöffnet
    check: { type: manual }
  - id: what-board
    title: Benenne die drei gestapelten Hardware-Teile
    check: { type: question, prompt: { en: "This lab targets one specific board. Which three physical pieces are stacked to make it, and which microcontroller sits at its core?", de: "Dieses Labor zielt auf ein bestimmtes Board. Aus welchen drei physischen Teilen ist es zusammengesteckt, und welcher Mikrocontroller sitzt in seinem Kern?" }, rubric: "Nennt NUCLEO-F429ZI (STM32F429ZI), das ITS-Adapterboard und das Waveshare-4-Zoll-TFT-Touch-Shield.", bloom: remember }
socratic:
  - { trigger: "question:what-board:weak", question: { en: "The README's first section describes the device in one sentence. What does it say the board physically is?", de: "Der erste Abschnitt der README beschreibt das Gerät in einem Satz. Was steht dort, was das Board physisch ist?" }, hints: [ { en: "Open docs/HARDWARE.md section 1: 'What the board is'.", de: "Öffne docs/HARDWARE.md, Abschnitt 1: 'What the board is'." }, { en: "Three stacked pieces: a Nucleo, an adapter, and a display shield.", de: "Drei gestapelte Teile: ein Nucleo, ein Adapter und ein Display-Shield." }, { en: "NUCLEO-F429ZI (STM32F429ZI) + ITS adapter + Waveshare 4-inch ILI9486 touch shield.", de: "NUCLEO-F429ZI (STM32F429ZI) + ITS-Adapter + Waveshare-4-Zoll-ILI9486-Touch-Shield." } ] }
---
## Lernziel

Verstehe, worauf du gleich aufbaust: die Firmware CaDS Zero, das Board, auf dem sie läuft, und wie dieses Labor verdrahtet ist.

## Was dieses Labor ist

Du arbeitest in einer Browser-IDE (VS Code über code-server), die auf einem Server läuft, während **das Board an deinem eigenen Rechner steckt**. Flashen, Debuggen und die serielle Konsole erreichen die Hardware durch den Browser. Du brauchst keine lokale Toolchain; der Container trägt die Arm-GNU-Toolchain, CMake und Ninja bereits in sich.

Die Firmware, die du untersuchst und veränderst, ist **CaDS Zero**: eine Clean-Room-Firmware für das ITSboard, angelehnt an ein Flipper Zero — ein kleiner Kernel, ein GUI-Framework, ein Menü aus in sich geschlossenen Apps und ein Maskottchen, Leo der Löwe. Sie ist keine Kopie; jedes Symbol trägt das Präfix `cads_`, und die Architektur folgt den realen Zwängen dieses Boards.

## Die Hardware, ein für alle Mal

Drei Teile sind zum Board gestapelt (siehe `docs/HARDWARE.md`):

1. Ein **NUCLEO-F429ZI**, dessen Mikrocontroller ein **STM32F429ZI** ist — ein Cortex-M4F mit 180 MHz, 2 MB Flash in zwei Bänken, 192 KB DMA-fähigem SRAM und 64 KB CCM.
2. Ein **ITS-Adapterboard**, das 16 Ausgänge, 8 Eingänge und 6 Interrupt-Leitungen herausführt.
3. Ein **Waveshare-4-Zoll-TFT-Touch-Shield**: ein ILI9486-Farbpanel mit 480×320 und ein XPT2046-Touch-Controller.

Das Board hat kein Sub-GHz-Funk, kein NFC und kein Infrarot — dieses Silizium fehlt schlicht. Stattdessen hat es **100-Mbit-Ethernet**, einen Farb-Touchscreen und einen Grafikbeschleuniger, und genau darauf setzt die Firmware.

## Was „fertig" hier bedeutet

CaDS Zero hält sich an eine harte Regel: **der Displaybus ist nur beschreibbar**, Software kann das Panel also nicht fragen, ob ein Schreibvorgang ankam. Jeder Meilenstein endet deshalb an einem Hardware-Gate — Code, der nur kompiliert wurde, zählt nicht als funktionierend. In M0 begegnest du diesem Gate selbst.

## Wie du den Kurs durcharbeitest

Jeder Step beginnt mit seinem Lernziel in einem Satz, gibt dir einen kompakten Text und stellt dir dann ein bis drei Aufgaben mit automatischen Checks. Lies `docs/ROADMAP.md`, wenn du die laufende Selbstbeschreibung des Projekts willst — es ist das Gedächtnis der Firmware über sich selbst.

## Deine Aufgabe

Bestätige, dass der Tutor offen ist, und beantworte dann eine Frage zur Hardware aus dem eben Gelesenen. Es gibt noch nichts zu bauen — der nächste Step verbindet das Board.
