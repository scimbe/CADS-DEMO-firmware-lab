---
id: m0-01-welcome
title: Welcome to the CaDS firmware lab
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
    title: You have the tutor open
    check: { type: manual }
  - id: what-board
    title: Name the three stacked pieces of hardware
    check: { type: question, prompt: { en: "This lab targets one specific board. Which three physical pieces are stacked to make it, and which microcontroller sits at its core?", de: "Dieses Labor zielt auf ein bestimmtes Board. Aus welchen drei physischen Teilen ist es zusammengesteckt, und welcher Mikrocontroller sitzt in seinem Kern?" }, rubric: "Names NUCLEO-F429ZI (STM32F429ZI), the ITS adapter board, and the Waveshare 4-inch TFT touch shield.", bloom: remember }
socratic:
  - { trigger: "question:what-board:weak", question: { en: "The README's first section describes the device in one sentence. What does it say the board physically is?", de: "Der erste Abschnitt der README beschreibt das Gerät in einem Satz. Was steht dort, was das Board physisch ist?" }, hints: [ { en: "Open docs/HARDWARE.md section 1: 'What the board is'.", de: "Öffne docs/HARDWARE.md, Abschnitt 1: 'What the board is'." }, { en: "Three stacked pieces: a Nucleo, an adapter, and a display shield.", de: "Drei gestapelte Teile: ein Nucleo, ein Adapter und ein Display-Shield." }, { en: "NUCLEO-F429ZI (STM32F429ZI) + ITS adapter + Waveshare 4-inch ILI9486 touch shield.", de: "NUCLEO-F429ZI (STM32F429ZI) + ITS-Adapter + Waveshare-4-Zoll-ILI9486-Touch-Shield." } ] }
---
## Learning goal

Understand what you are about to build on: the CaDS Zero firmware, the board it runs on, and how this lab is wired together.

## What this lab is

You are working in a browser IDE (VS Code via code-server) that runs on a server, while **the board is plugged into your own computer**. Flashing, debugging and the serial console all reach the hardware through the browser. You do not need any local toolchain; the container already carries the Arm GNU toolchain, CMake and Ninja.

The firmware you study and change is **CaDS Zero**: a clean-room firmware for the ITSboard, written along the lines of a Flipper Zero — a small kernel, a GUI framework, a menu of self-contained apps, and a mascot, Leo the lion. It is not a copy of anything; every symbol carries the `cads_` prefix, and the architecture is shaped by this board's real constraints.

## The hardware, once

Three pieces are stacked to make the board (see `docs/HARDWARE.md`):

1. A **NUCLEO-F429ZI**, whose microcontroller is an **STM32F429ZI** — a Cortex-M4F at 180 MHz with 2 MB flash in two banks, 192 KB of DMA-capable SRAM and 64 KB of CCM.
2. An **ITS adapter board**, which brings out 16 outputs, 8 inputs and 6 interrupt lines.
3. A **Waveshare 4-inch TFT touch shield**: an ILI9486 480×320 colour panel with an XPT2046 touch controller.

The board has no sub-GHz radio, no NFC and no infrared — that silicon is simply absent. What it has instead is **100 Mbit Ethernet**, a colour touchscreen and a graphics accelerator, and the firmware leans into exactly those.

## What "done" means here

CaDS Zero holds itself to a hard rule: **the display bus is write-only**, so software cannot ask the panel whether a write landed. Every milestone therefore ends at a hardware gate — a build that has only ever compiled does not count as working. You will meet that gate yourself in M0.

## How to work through the course

Each step opens with its learning goal in one sentence, gives you a compact reading, and then hands you one to three tasks with automatic checks. Read `docs/ROADMAP.md` if you want the project's own running account of what is done and why; it is the firmware's memory of itself.

## Your task

Confirm the tutor is open, then answer one question about the hardware from what you have just read. There is nothing to build yet — the next step connects the board.
