---
id: m0-01-welcome
title: Welcome to the CaDS firmware lab
bloom: remember
objectives: [firmware-hardware]
requires: [m0-00-workbench]
estimatedMinutes: 10
scaffold: worked
links:
  - { step: m0-02-connect }
  - { doc: "docs/HARDWARE.md" }
  - { doc: "docs/ROADMAP.md" }
sources: [README.md, docs/HARDWARE.md, docs/ROADMAP.md]
tasks:
  - id: oriented
    title: You have found the task list at the bottom of this panel
    check: { type: manual }
  - id: what-board
    title: Name the three stacked pieces of hardware
    check: { type: question, prompt: { en: "Three boards are stacked on your desk. Name each one and say what it contributes.", de: "Auf deinem Tisch liegen drei Platinen übereinander. Benenne jede und sage, was sie beisteuert." }, rubric: "Names the NUCLEO-F429ZI (carries the STM32F429ZI microcontroller and the debug probe), the ITS adapter board (outputs, inputs, interrupt lines) and the Waveshare 4-inch touch shield (colour screen with touch sensing). The piece-to-contribution mapping must be right; the exact spelling of the part numbers need not be.", bloom: remember }
socratic:
  - { trigger: "task:oriented:stuck", question: { en: "This panel scrolls. What is at the very bottom of it, under the heading 'Tasks'?", de: "Dieses Panel lässt sich scrollen. Was steht ganz unten darin, unter der Überschrift „Aufgaben“?" }, hints: [ { en: "Put the mouse pointer inside this panel and scroll all the way down.", de: "Setz den Mauszeiger in dieses Panel und scroll ganz nach unten." }, { en: "Under 'Tasks' every task has its own box with buttons on the right.", de: "Unter „Aufgaben“ hat jede Aufgabe einen eigenen Kasten mit Knöpfen auf der rechten Seite." }, { en: "The button on this first task is called 'Mark as done'.", de: "Der Knopf bei dieser ersten Aufgabe heißt „Als erledigt markieren“." } ] }
  - { trigger: "question:what-board:weak", question: { en: "Take them one at a time: which of the three carries the screen you can touch, and which one plugs into your computer by USB?", de: "Nimm sie einzeln: welche der drei trägt den Bildschirm, den du berühren kannst, und welche steckt per USB an deinem Rechner?" }, hints: [ { en: "The section 'The hardware, once' above lists all three in order, bottom to top.", de: "Der Abschnitt „Die Hardware, ein für alle Mal“ weiter oben zählt alle drei der Reihe nach auf, von unten nach oben." }, { en: "One board is the computer, one is the connector panel, one is the screen. Sort them into those three roles first, then look up the names.", de: "Eine Platine ist der Rechner, eine die Anschlussebene, eine der Bildschirm. Sortiere sie erst in diese drei Rollen, dann schlag die Namen nach." }, { en: "Open docs/HARDWARE.md, section 1 'What the board is'; the first sentence names all three.", de: "Öffne docs/HARDWARE.md, Abschnitt 1 „What the board is“; der erste Satz nennt alle drei." } ] }
---
## Learning goal

Understand what you are about to build on: the CaDS Zero firmware, the board it runs on, and how this lab is wired together.

## What you are looking at right now

The four areas of this window and the three ways to run something are what the previous step covered ([Working the window](step:m0-00-workbench)). As a reminder: the course tree is on the left in the side bar, this text is a tab in the middle, and the tasks with their buttons are at the very bottom of this text.

## What to do first

1. Scroll to the very bottom of this panel, to the heading **Tasks**.
2. On the first task ("You have found the task list at the bottom of this panel"), click **Mark as done**.
3. Then read the second task and answer it in the text box below it, using what this step says about the hardware.

## How you know it worked

A finished task shows a green tick and its box turns green along the left edge. When every task of a step is green, the **Next** button at the bottom right becomes active and the next step in the list on the left stops being greyed out. Anything still red or grey means the step is still open — that is not a mistake on your part, only the state of things.

If you want to see how to work the window once more at your own pace: press `F1`, type *Welcome: Open Walkthrough* and pick *CaDS Tutor*.

**If you get stuck:** the **Show hint** button on each task gets more concrete with every click. Use it after trying once yourself. If that does not help, ask in the lab and quote the step number from the header.

## What this lab is

You are working in a **browser IDE** — a development environment that runs inside a browser window instead of as a program on your machine (here: VS Code via code-server). It runs on a server, while **the board is plugged into your own computer**. **Flashing** (transferring your program into the microcontroller's memory), **debugging** (halting the running program step by step and inspecting it) and the **serial console** (a text channel to the board over which it reports and accepts commands) all reach the hardware through the browser.

You do not need a local **toolchain** — the bundle of compiler and helper programs that turns your C source into a file the microcontroller can execute. This environment already carries it: the Arm GNU toolchain, plus CMake and Ninja, the tools that drive the build.

The firmware you study and change is **CaDS Zero**. *Firmware* is the program that lives permanently on a device and makes it what it is — here a clean-room firmware for the ITSboard along the lines of a Flipper Zero: a small kernel, a GUI framework, a menu of self-contained apps, and a mascot, Leo the lion. Every function name carries the `cads_` prefix, and the architecture is shaped by this board's real constraints.

## The hardware, once

Three pieces are stacked to make the board (see `docs/HARDWARE.md`):

1. At the bottom a **NUCLEO-F429ZI**, whose microcontroller is an **STM32F429ZI** — a Cortex-M4F at 180 MHz. This is the computer: 2 MB of program memory (**flash** — it keeps its contents without power) in two separate halves, 192 KB of working memory (**SRAM**) and 64 KB of especially fast memory right at the core (**CCM**). What those differences mean only matters from M2 onwards.
2. In the middle an **ITS adapter board**, which brings out 16 outputs, 8 inputs and 6 interrupt lines — the connector layer where you will later see lamps light and buttons respond.
3. On top a **Waveshare 4-inch TFT touch shield**: a colour panel of 480×320 pixels with touch sensing.

The board has no sub-GHz radio, no NFC and no infrared — that silicon is simply absent. What it has instead is **100 Mbit Ethernet**, a colour touchscreen and a graphics accelerator, and the firmware leans into exactly those.

## What "done" means here

CaDS Zero holds itself to a hard rule: **the display bus is write-only**, so software cannot ask the panel whether a write landed. Every milestone therefore ends at a hardware gate — a build that has only ever compiled does not count as working. You will meet that gate yourself in M0.

## How to work through the course

Each step opens with its learning goal in one sentence, gives you a compact reading, and then hands you one to three tasks. Most tasks the tutor checks itself — it builds the firmware, searches files, or reads along on the board's replies. Tasks you finish with **Mark as done** are ones you confirm yourself; they are a reminder, not evidence. Read `docs/ROADMAP.md` if you want the project's own running account of what is done and why; it is the firmware's memory of itself.

**What you should bring:** basic C — functions, `if` and `switch`, data types — and a willingness to open files in an editor and type commands into a terminal. Hexadecimal numbers, bits and the notation for hardware registers are introduced in M2 and are not assumed before that.

## Documentation

The lab has its own handbook with tutorials, how-tos and troubleshooting: [https://scimbe.github.io/CADS-DEMO-firmware-lab-docs/en/](https://scimbe.github.io/CADS-DEMO-firmware-lab-docs/en/). Keep it open in a second tab; every tutor step that touches the board links to the matching page.

## Your task

Find the task list at the bottom of this panel and tick off the first task. Then answer the question about the hardware. There is nothing to build yet — the next step connects the board.
