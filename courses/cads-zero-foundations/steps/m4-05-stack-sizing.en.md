---
id: m4-05-stack-sizing
title: Sizing a task stack from evidence
bloom: analyze
objectives: [cz.rtos.stack-sizing]
requires: [m4-04-iwdg-watchdog]
estimatedMinutes: 15
links:
  - { step: m5-01-canvas-draw }
  - { step: m3-04-stack-guard }
  - { file: "apps/bringup/tasks.c", line: 30 }
  - { doc: "docs/ROADMAP.md" }
  - { doc: "docs/reference/memory-map.md" }
sources: [apps/bringup/tasks.c, docs/ROADMAP.md, docs/reference/memory-map.md, modules/kernel/src/kernel.c]
tasks:
  - id: size-it
    title: Size a stack the way the project did
    check: { type: question, prompt: { en: "Two task stacks in apps/bringup/tasks.c were resized after real overflows: CADS_CONSOLE_STACK 512->1024 words and CADS_INPUT_STACK 256->1024 words. Using the evidence each fix cites, explain how you would size a task stack in this firmware, and why spending CCM on it is the right trade even though the SRAM margin is a few hundred bytes.", de: "Zwei Task-Stacks in apps/bringup/tasks.c wurden nach echten Überläufen vergrößert: CADS_CONSOLE_STACK 512->1024 Worte und CADS_INPUT_STACK 256->1024 Worte. Erkläre anhand der zitierten Evidenz, wie du in dieser Firmware einen Task-Stack dimensionierst und warum CCM dafür der richtige Preis ist, obwohl die SRAM-Marge nur wenige hundert Byte beträgt." }, rubric: "Starts from what actually runs on the stack, not the task's own loop: the console task runs the whole app-tree tick chain plus lwIP's DHCP state machine with net.dhcp=1; the input task runs every app's input handler synchronously via cads_input_tick(). Evidence: the idle-hook stack-guard sentinel faulted with garbage PC 0xF7FF0FF0 (console), and the forensic ring recorded reason=input 22 ms before a HardFault (Marauder). Size with a generous multiple (2x/4x) matched across tasks, then confirm with `k` high-water marks. CCM holds only CPU-touched stacks and had ~54-59 KB free of 64 KB, so 2-3 KB there costs nothing from the DMA-capable SRAM heap that check_ram_budget.py guards.", bloom: analyze }
socratic:
  - { trigger: "question:size-it:weak", question: { en: "What code actually executes on the input task's stack when the Marauder menu is open - only the polling loop, or something deeper?", de: "Welcher Code läuft tatsächlich auf dem Stack der input-Task, wenn das Marauder-Menü offen ist - nur die Poll-Schleife oder etwas Tieferes?" }, hints: [ { en: "tasks.c's header comment: cads_input_tick() calls the active app's input handler synchronously via cads_input_set_callback().", de: "Kopfkommentar in tasks.c: cads_input_tick() ruft den Input-Handler der aktiven App synchron über cads_input_set_callback() auf." }, { en: "The console task's loop calls cads_net_poll() every tick; with net.dhcp=1 that is lwIP's DHCP state machine on the same stack.", de: "Die Schleife der console-Task ruft cads_net_poll() jeden Tick; mit net.dhcp=1 ist das die DHCP-Zustandsmaschine von lwIP auf demselben Stack." }, { en: "memory-map.md: CCM is no-DMA and holds only task stacks and the MSP; the 48 KB floor is about SRAM, not CCM.", de: "memory-map.md: CCM ist DMA-los und trägt nur Task-Stacks und den MSP; die 48-KB-Grenze betrifft SRAM, nicht CCM." } ] }
---
## Learning goal

Learn to size a FreeRTOS task stack from evidence rather than habit, using the two overflows this firmware actually suffered and the memory split that made the fixes cheap.

## The wrong assumption

`apps/bringup/tasks.c` once described the input and console tasks as "shallow" next to the UI task, which carries the canvas call chain. The M2 gate seemed to agree: high-water marks of ui 224 B, input 132 B, console 372 B. Both smaller tasks later overflowed. The mistake was sizing for the task's *own* loop instead of for **everything that runs on its stack**.

## Case 1: the console task and DHCP (2026-08-28)

The console task's app-tree loop (`explorer_app_demo.c`) calls `cads_net_poll()` every tick. With `net.dhcp = 1` that runs lwIP's DHCP client state machine — visibly deeper than the static-IP path — on the **same** 512-word stack the loop also uses for the full app-tree tick chain (`cads_marauder_tick`, `cads_settings_service_config`, `cads_gui_tick`, …). Setting `net.dhcp = 1` crashed the board on every reset.

Evidence, caught live over SWD: `vApplicationIdleHook()` — the stack-guard sentinel check from M3-04 — faulted with a garbage PC of `0xF7FF0FF0`, an instruction-fetch violation reached via a corrupted return address. That is the textbook signature of an overflow severe enough to corrupt the very code trying to detect it. Two wrong leads (filesystem corruption, SWD flakiness) were ruled out first, and are recorded in `docs/ROADMAP.md` so nobody retries them blind.

Fix: `CADS_CONSOLE_STACK` doubled, 512 → 1024 words (2 KB → 4 KB). Verified with a real DHCP lease across two clean runs and a forensic ring that did not grow.

## Case 2: the input task and the Marauder menu (2026-08-30)

`cads_input_tick()` calls straight into whichever app's input handler is active, synchronously, on the input task's own stack. The Marauder app's menu navigation — command formatting and state tracking for the co-processor UART protocol — was deep enough to overflow the original 256-word (1 KB) budget, the smallest of the three despite carrying arbitrary app-specific depth.

Evidence: the forensic ring (`E`) held a `reason=input` record from the stack guard 22 ms before a HardFault with `HFSR = 0x80000000` (DEBUGEVT) — the `bkpt`-without-debugger escalation that M3-03 taught you, from an unguarded `cads_hal_panic()`, fixed in the same pass.

Fix: `CADS_INPUT_STACK` quadrupled, 256 → 1024 words, matched to the console's size for a consistent margin rather than a minimal one.

## Why the fixes were cheap

Task stacks live in CCM (`CADS_CCM_SECTION`, M4-01). CCM is no-DMA memory holding only stacks and the MSP, and it had roughly 59 KB free of 64 KB before the first fix and ~54.7 KB after the second. The 2 KB and 3 KB spent came from there — **not one byte** from the DMA-capable SRAM heap whose margin `check_ram_budget.py` guards at 256 B (M4-02). Where the memory lives decides whether a generous fix is affordable.

## The method

1. Enumerate what really executes on the stack: callbacks, polls, library state machines, not just the task body.
2. Read the evidence when it fails: the sentinel, the forensic ring, the fault PC.
3. Size generously in CCM (2×–4×), keep sizes consistent across tasks, then confirm with `k`. Field use is the final word — a build that merely runs is not proof.

## Your task

Answer the question: size a task stack the way this project did, citing the evidence and the memory split.
