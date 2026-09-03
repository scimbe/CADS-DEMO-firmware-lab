---
id: m0-05-explorer
title: The bring-up explorer console
bloom: understand
objectives: [firmware-how-to-board-test]
requires: [m0-04-flash-console]
estimatedMinutes: 12
links:
  - { step: m1-01-module-layout }
  - { doc: "docs/reference/explorer-console.md" }
  - { doc: "docs/how-to/debug.md" }
sources: [docs/reference/explorer-console.md, docs/how-to/debug.md]
tasks:
  - id: tried-commands
    title: You have run a few explorer commands
    check: { type: manual }
  - id: which-command
    title: Match a symptom to the right command
    check: { type: question, prompt: { en: "A button on the adapter does nothing when pressed, and you do not know which STM32 pin it is wired to. Which single-letter explorer command finds that out, and how does it work?", de: "Ein Taster am Adapter tut nichts, und du weißt nicht, an welchem STM32-Pin er hängt. Welcher Ein-Buchstaben-Explorer-Befehl findet das heraus, und wie funktioniert er?" }, rubric: "Names the 'w' command and explains it watches every port's input data register (IDR) for changes, so pressing the button shows which pin moves; 'i' gives a static one-shot dump.", bloom: understand }
socratic:
  - { trigger: "task:tried-commands:stuck", question: { en: "A freshly flashed board boots into the touchscreen app tree, which ignores plain typed commands. How do you get back to the console prompt so a command is heard?", de: "Ein frisch geflashtes Board bootet in den Touchscreen-App-Baum, der einfache Tastenbefehle ignoriert. Wie kommst du zurück zum Konsolen-Prompt, damit ein Befehl gehört wird?" }, hints: [ { en: "The app-tree session only ends on the reserved quit byte, not any typed character.", de: "Die App-Baum-Sitzung endet nur beim reservierten Quit-Byte, nicht bei einem getippten Zeichen." }, { en: "Send board_key.py quit once, then your plain console command is heard again.", de: "Sende einmal board_key.py quit, danach wird dein einfacher Konsolenbefehl wieder gehört." }, { en: "Send '?' to reprint the command list once you are at the prompt.", de: "Sende '?', um am Prompt die Befehlsliste erneut auszugeben." } ] }
---
## Learning goal

Learn what the bring-up explorer console is, and build a mental map from symptom to command so you can interrogate the board directly instead of guessing.

## A console that predates the GUI

`apps/bringup` builds a second firmware entry point, separate from the real app tree: a **single-letter command console** over the same USART the ST-Link exposes as a virtual COM port. It exists because most of this board's subsystems — the Ethernet MAC and PHY, the adapter's GPIO banks, the write-only display bus — have no way to report their own state to a human without a driver already being trusted. This console is what let each one get bootstrapped and hardware-gated before the GUI that eventually wrapped it existed.

Every command is one character, optionally followed by one or two whitespace-separated arguments. Send `?` at any time to reprint the full command list; the firmware's own help string is the ground truth if the reference ever disagrees. Full catalogue: `docs/reference/explorer-console.md`.

## From symptom to command

The value of the explorer is that it is usually faster to ask a subsystem directly than to attach a debugger. A few of the mappings you will use again (`docs/how-to/debug.md`):

| Symptom | Reach for | Why |
|---|---|---|
| A button does nothing, or the wrong thing | `w`, then `i` | `w` watches every port's input register for changes — press the button, see which pin moves |
| A task looks starved or a stack looks tight | `k` | per-task stack high-water marks, task count, input counters |
| Ethernet link behaves oddly | `e`, `a`, `m` | these talk to the PHY over MDIO *below* lwIP, so they answer whether or not a netif is up |
| Display throughput seems off | `V` | re-measures full-screen flush throughput under real scheduler and network contention |

One command, `z FAULT`, is destructive by design: it trips a UsageFault deliberately and halts for good, to prove the fault handler works. It demands the literal argument `FAULT` so a fat-fingered keystroke cannot trigger it. Everything else is read-only or bounded in duration.

## A gotcha you will hit once

A freshly flashed board boots straight into the touchscreen app tree (`boot.autostart = 1`), and that session **ignores plain typed bytes on purpose** — a stray console command does nothing and prints nothing, not even an error, which looks exactly like a hung board. Send `scripts/board_key.py quit` once to return to the console prompt, then your plain commands are heard again.

## Your task

Open the board console, return to the prompt if needed, and try a few commands — `?` for the list, `k` for the task report, `i` for a one-shot port dump. Then answer one question matching a symptom to the right command. The next module opens up how the firmware is actually structured.
